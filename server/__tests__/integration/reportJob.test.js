const request = require("supertest");
const app = require("../../app");
const Report = require("../../models/Report");
const Internship = require("../../models/Internship");
const { createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

// G11: "Report this job" saves into the Report model so it shows on /admin/reports.
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const report = (identity, body) => request(app).post("/api/reports").set(auth(identity)).send(body);

describe("POST /api/reports (G11)", () => {
  let candidate;
  let job;

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: "reporter@example.com" });
    job = await createTestJob(null, { title: "Data Entry Operator" });
  });

  it("requires login", async () => {
    const res = await request(app).post("/api/reports").send({ opportunityType: "Job", opportunityId: job._id, reason: "fake_or_scam" });
    expect(res.status).toBe(401);
    expect(await Report.countDocuments()).toBe(0);
  });

  it("saves a High priority Spam / Fraud report for 'asks for money' and shows it to admins", async () => {
    const res = await report(candidate, {
      opportunityType: "Job",
      opportunityId: String(job._id),
      reason: "asks_for_money",
      details: "They asked for a Rs 2,000 registration fee on WhatsApp.",
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/review this within 24 hours/);

    const saved = await Report.findOne({ opportunityId: job._id }).lean();
    expect(saved.priority).toBe("High");
    expect(saved.category).toBe("Spam / Fraud");
    expect(saved.status).toBe("Open");
    expect(String(saved.reportedBy)).toBe(String(candidate.user._id));
    expect(saved.details).toContain("registration fee");
    expect(saved.targetTitle).toBe("Data Entry Operator");

    const admin = await createUserWithToken({ email: "g11-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });
    const list = await request(app).get("/api/admin/reports").set(auth(admin));
    expect(list.status).toBe(200);
    const reports = list.body.reports || list.body.data?.reports || [];
    expect(reports.some((r) => String(r._id) === String(saved._id) && r.priority === "High")).toBe(true);
  });

  it("uses Medium priority for other reasons", async () => {
    await report(candidate, { opportunityType: "Job", opportunityId: String(job._id), reason: "misleading" });
    const saved = await Report.findOne({ opportunityId: job._id }).lean();
    expect(saved.priority).toBe("Medium");
    expect(saved.category).toBe("Opportunity");
  });

  it("reports internships too", async () => {
    const internship = await Internship.create({
      title: "Marketing Intern",
      companyName: "Test Corp",
      location: "Remote",
      description: "Help with campaigns.",
      status: "Published",
    });
    const res = await report(candidate, { opportunityType: "Internship", opportunityId: String(internship._id), reason: "fake_or_scam" });
    expect(res.status).toBe(201);
    const saved = await Report.findOne({ opportunityId: internship._id }).lean();
    expect(saved.opportunityModel).toBe("Internship");
  });

  it("blocks a second report of the same job by the same user", async () => {
    const body = { opportunityType: "Job", opportunityId: String(job._id), reason: "fake_or_scam" };
    expect((await report(candidate, body)).status).toBe(201);
    const again = await report(candidate, { ...body, reason: "duplicate" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_REPORTED");
    expect(await Report.countDocuments({ opportunityId: job._id })).toBe(1);

    // A different user can still report the same job.
    const other = await createUserWithToken({ email: "second-reporter@example.com" });
    expect((await report(other, body)).status).toBe(201);
  });

  it("allows 5 reports per user per hour and answers the 6th with a friendly 429", async () => {
    const jobs = await Promise.all(Array.from({ length: 6 }, (_, i) => createTestJob(null, { title: `Job ${i}` })));
    for (const listing of jobs.slice(0, 5)) {
      expect((await report(candidate, { opportunityType: "Job", opportunityId: String(listing._id), reason: "other" })).status).toBe(201);
    }
    const sixth = await report(candidate, { opportunityType: "Job", opportunityId: String(jobs[5]._id), reason: "other" });
    expect(sixth.status).toBe(429);
    expect(sixth.body.code).toBe("REPORT_LIMIT");
    expect(sixth.body.message).toMatch(/try again/);

    // The limit is per user, not shared.
    const other = await createUserWithToken({ email: "fresh-reporter@example.com" });
    expect((await report(other, { opportunityType: "Job", opportunityId: String(jobs[5]._id), reason: "other" })).status).toBe(201);
  });

  it("validates the request", async () => {
    const base = { opportunityType: "Job", opportunityId: String(job._id), reason: "other" };
    expect((await report(candidate, { ...base, reason: "because" })).status).toBe(400);
    expect((await report(candidate, { ...base, opportunityType: "Course" })).status).toBe(400);
    expect((await report(candidate, { ...base, details: "x".repeat(501) })).status).toBe(400);
    expect((await report(candidate, { ...base, opportunityId: "64b000000000000000000000" })).status).toBe(404);
    expect((await report(candidate, { ...base, opportunityId: "scraped-job-3" })).status).toBe(404);
    expect(await Report.countDocuments()).toBe(0);
  });
});
