// QA bug 2: listing / feed responses send null for missing stipend, salary, duration,
// company and dates, never invented text ("Competitive Stipend", "3-6 Months", "Partner
// Employer", "Open until filled", ...).
jest.mock("../../services/jobScraperService", () => ({
  ...jest.requireActual("../../services/jobScraperService"),
  getAggregatedOpportunities: jest.fn().mockResolvedValue({ data: [] }),
}));

const request = require("supertest");
const app = require("../../app");
const Internship = require("../../models/Internship");
const StudentProfile = require("../../models/StudentProfile");
const { formatSalary, formatStipend, companyOf, formatDate } = require("../../utils/listingDisplay");
const { createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

// Phrases the feeds used to invent.
const INVENTED = /Competitive|Partner Employer|CareerConnect Partner|E2Job Partner|E2Job Verified|3-6 Months|3 Months|Open until filled|Paid Stipend|Paid Internship|Recently|Not disclosed|4\.5 - 12\.0/;

// A published job and internship with no company name, pay, duration or deadline.
const createBareListings = async () => {
  const job = await createTestJob(null, {
    title: "Fake Bare Job", companyName: "", salaryRange: { min: 0, max: 0 }, deadline: null,
  });
  const internship = await Internship.create({
    title: "Fake Bare Internship", location: "Remote", description: "A fake internship used only in tests.",
    companyName: "", status: "Published", source: "CareerConnect", approvedAt: new Date(),
  });
  return { job, internship };
};
const byTitle = (list, title) => (list || []).find((item) => item.title === title);

describe("listing display helpers", () => {
  it("return null instead of invented text", () => {
    expect(formatSalary({ min: 0, max: 0 })).toBeNull();
    expect(formatSalary({ min: 600000, max: 0 })).toBe("₹6.0+ LPA");
    expect(formatSalary({ min: 600000, max: 1200000 })).toBe("₹6.0 - 12.0 LPA");
    expect(formatStipend({})).toBeNull();
    expect(formatStipend({ stipend: "  " })).toBeNull();
    expect(formatStipend({ stipendAmount: { min: 10000, max: 15000 } })).toBe("₹10,000 - ₹15,000 / month");
    expect(companyOf({ companyName: "" })).toBeNull();
    expect(formatDate(null)).toBeNull();
  });
});

describe("feeds send null for missing listing data", () => {
  it("GET /api/jobs", async () => {
    await createBareListings();
    const res = await request(app).get("/api/jobs");
    expect(res.statusCode).toBe(200);
    const job = byTitle(res.body.jobs, "Fake Bare Job");
    expect(job).toMatchObject({ salary: null, company: null, companyName: null, deadline: null });
    expect(JSON.stringify(job)).not.toMatch(INVENTED);
  });

  it("GET /api/internships", async () => {
    await createBareListings();
    const res = await request(app).get("/api/internships?source=campus");
    expect(res.statusCode).toBe(200);
    const list = res.body.internships || res.body.data || [];
    const internship = byTitle(list, "Fake Bare Internship");
    expect(internship).toMatchObject({ stipend: null, salary: null, duration: null, company: null, deadline: null });
    expect(JSON.stringify(internship)).not.toMatch(INVENTED);
  });

  it("GET /api/opportunities/:id (job and internship detail)", async () => {
    const { job, internship } = await createBareListings();
    const jobRes = await request(app).get(`/api/opportunities/${job._id}`);
    expect(jobRes.body.opportunity).toMatchObject({ salary: null, stipend: null, company: null, deadline: null });
    const intRes = await request(app).get(`/api/opportunities/${internship._id}`);
    expect(intRes.body.opportunity).toMatchObject({ stipend: null, salary: null, duration: null, company: null, deadline: null });
    expect(JSON.stringify([jobRes.body, intRes.body])).not.toMatch(INVENTED);
  });

  it("student dashboard recommendations", async () => {
    await createBareListings();
    const student = await createUserWithToken({ email: `${uniq("student")}@candidate.test`, phone: `7${String(Date.now() + ++seq).slice(-9)}` });
    await StudentProfile.create({ userId: student.user._id });
    const res = await as(student.token, "get", "/api/student/dashboard");
    expect(res.statusCode).toBe(200);
    const job = byTitle(res.body.data.recommendedJobs, "Fake Bare Job");
    const internship = byTitle(res.body.data.recommendedInternships, "Fake Bare Internship");
    expect(job).toMatchObject({ salary: null, company: null, deadline: null });
    expect(internship).toMatchObject({ stipend: null, duration: null, company: null, deadline: null });
    expect(JSON.stringify([job, internship])).not.toMatch(INVENTED);
  });

  it.each([
    ["fresher", "/api/fresher/dashboard"],
    ["professional", "/api/professional/dashboard"],
  ])("%s dashboard recommendations", async (userType, path) => {
    await createBareListings();
    const user = await createUserWithToken({
      email: `${uniq(userType)}@candidate.test`, phone: `6${String(Date.now() + ++seq).slice(-9)}`, userType,
    });
    const res = await as(user.token, "get", path);
    expect(res.statusCode).toBe(200);
    const job = byTitle(res.body.data.recommendedJobs, "Fake Bare Job");
    expect(job).toMatchObject({ salary: null, company: null, deadline: null });
    expect(job.experienceRequired === null || typeof job.experienceRequired === "string").toBe(true);
    expect(JSON.stringify(job)).not.toMatch(INVENTED);
  });
});
