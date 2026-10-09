// CC-01: GET /api/jobs?company=<id> and GET /api/internships?company=<id> list only that
// company page's open listings, filtered in the database query.
const request = require("supertest");
const app = require("../../app");
const Company = require("../../models/Company");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const { createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const createEmployer = async ({ companyId } = {}) => {
  const employer = await createEmployerWithToken({
    email: `${uniq("hr")}@employer.test`,
    phone: `8${String(Date.now() + ++seq).slice(-9)}`,
    ...(companyId ? { companyId } : {}),
  });
  // Unpublished on purpose: the company page and its lists work before the showcase is published.
  const profile = await createEmployerProfile(employer.user._id, { companyName: uniq("Fake Co") });
  return { ...employer, profile };
};

const postJob = (employer, overrides = {}) => createTestJob(employer.profile._id, {
  createdBy: employer.user._id, title: uniq("Fake Role"), ...overrides,
});

const postInternship = (employer, overrides = {}) => Internship.create({
  employerId: employer.profile._id,
  createdBy: employer.user._id,
  title: uniq("Fake Internship"),
  description: "Fake internship description for tests.",
  location: "Remote",
  workMode: "Remote",
  status: "Published",
  ...overrides,
});

const titles = (list) => list.map((item) => item.title).sort();

describe("?company=<id> on the job and internship lists (CC-01)", () => {
  it("returns only this company's open jobs and internships", async () => {
    const acme = await createEmployer();
    const other = await createEmployer();

    const job = await postJob(acme);
    await postJob(acme, { status: "Draft" });
    await postJob(acme, { status: "Pending Approval" });
    const expired = await postJob(acme);
    await Job.updateOne({ _id: expired._id }, { deadline: new Date(Date.now() - 86400000) });
    await postJob(other);

    const internship = await postInternship(acme);
    const internshipAsJob = await postJob(acme, { employmentType: "Internship", workMode: "Remote" });
    await postInternship(acme, { status: "Draft" });
    await postInternship(other);

    const jobsRes = await request(app).get("/api/jobs").query({ company: String(acme.profile._id) });
    expect(jobsRes.statusCode).toBe(200);
    expect(titles(jobsRes.body.jobs)).toEqual([job.title]);
    expect(jobsRes.body.pagination.total).toBe(1);

    const internshipsRes = await request(app).get("/api/internships").query({ company: String(acme.profile._id) });
    expect(internshipsRes.statusCode).toBe(200);
    // Both places internships are stored, and no external feed listings.
    expect(titles(internshipsRes.body.internships)).toEqual([internship.title, internshipAsJob.title].sort());
    expect(internshipsRes.body.pagination.total).toBe(2);
  });

  it("still applies the list's other filters", async () => {
    const acme = await createEmployer();
    const remote = await postJob(acme, { workMode: "Remote" });
    await postJob(acme, { workMode: "On-site" });

    const res = await request(app).get("/api/jobs").query({ company: String(acme.profile._id), workMode: "Remote" });
    expect(titles(res.body.jobs)).toEqual([remote.title]);
  });

  it("includes colleagues' listings under the same active Company", async () => {
    const company = await Company.create({ name: uniq("Shared Co"), status: "active" });
    const alice = await createEmployer({ companyId: company._id });
    const bob = await createEmployer({ companyId: company._id });
    const aliceJob = await postJob(alice, { companyId: company._id });
    const bobJob = await postJob(bob, { companyId: company._id });

    const res = await request(app).get("/api/jobs").query({ company: String(alice.profile._id) });
    expect(titles(res.body.jobs)).toEqual([aliceJob.title, bobJob.title].sort());
  });

  it("is an empty list for a company with no listings, or no such company", async () => {
    const quiet = await createEmployer();
    for (const id of [String(quiet.profile._id), "0".repeat(24)]) {
      const jobs = await request(app).get("/api/jobs").query({ company: id });
      expect(jobs.statusCode).toBe(200);
      expect(jobs.body.jobs).toEqual([]);
      const internships = await request(app).get("/api/internships").query({ company: id });
      expect(internships.statusCode).toBe(200);
      expect(internships.body.internships).toEqual([]);
    }
  });

  it("is a 400, not a crash, for a malformed id", async () => {
    for (const path of ["/api/jobs", "/api/internships"]) {
      for (const query of ["company=not-an-id", "company=", "company=a&company=b"]) {
        const res = await request(app).get(`${path}?${query}`);
        expect({ path, query, status: res.statusCode, message: res.body.message })
          .toEqual({ path, query, status: 400, message: "Invalid company id" });
      }
    }
  });

  it("can't be turned into a query operator", async () => {
    const acme = await createEmployer();
    await postJob(acme);
    // Express 5's query parser keeps "company[$ne]" as a literal key, so no company filter
    // (and no operator) reaches the query: it is the ordinary list.
    const res = await request(app).get("/api/jobs?company[$ne]=x");
    expect(res.statusCode).toBe(200);
    expect(res.body.jobs.length).toBeGreaterThan(0);
  });

  it("returns nothing once the company is inactive", async () => {
    const company = await Company.create({ name: uniq("Fading Co"), status: "active" });
    const employer = await createEmployer({ companyId: company._id });
    await postJob(employer, { companyId: company._id });
    await Company.updateOne({ _id: company._id }, { status: "inactive" });

    const res = await request(app).get("/api/jobs").query({ company: String(employer.profile._id) });
    expect(res.body.jobs).toEqual([]);
  });
});
