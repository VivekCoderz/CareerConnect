// FL-01/02: a company page lists only that company's open jobs, and employer views only
// count a company's jobs while the company is active.
const request = require("supertest");
const app = require("../../app");
const Company = require("../../models/Company");
const Job = require("../../models/Job");
const EmployerProfile = require("../../models/EmployerProfile");
const { createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, path) => request(app).get(path).set("Authorization", `Bearer ${token}`);

let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const createEmployer = async ({ companyId, published = true } = {}) => {
  const employer = await createEmployerWithToken({
    email: `${uniq("hr")}@employer.test`,
    phone: `8${String(Date.now() + ++seq).slice(-9)}`,
    ...(companyId ? { companyId } : {}),
  });
  const profile = await createEmployerProfile(employer.user._id, { companyName: uniq("Fake Co"), isPublished: published });
  return { ...employer, profile };
};

const postJob = (employer, overrides = {}) => createTestJob(employer.profile._id, {
  createdBy: employer.user._id, title: uniq("Fake Role"), ...overrides,
});

const titlesOf = (res) => res.body.jobs.map((j) => j.title).sort();

describe("GET /api/companies/:companyId/jobs", () => {
  it("lists only this company's open jobs, filtered on the server", async () => {
    const acme = await createEmployer();
    const other = await createEmployer();
    const open = await postJob(acme);
    const internship = await postJob(acme, { employmentType: "Internship", workMode: "Remote" });
    await postJob(acme, { status: "Draft" });
    await postJob(acme, { status: "Pending Approval" });
    const expired = await postJob(acme);
    await Job.updateOne({ _id: expired._id }, { deadline: new Date(Date.now() - 86400000) });
    await postJob(other);

    const res = await request(app).get(`/api/companies/${acme.profile._id}/jobs`);

    expect(res.statusCode).toBe(200);
    expect(titlesOf(res)).toEqual([open.title, internship.title].sort());
    expect(res.body.total).toBe(2);
    // Public card fields only; no moderation or ownership fields.
    expect(res.body.jobs[0].adminNote).toBeUndefined();
    expect(res.body.jobs[0].createdBy).toBeUndefined();
  });

  it("returns an empty list for a company with no open jobs", async () => {
    const quiet = await createEmployer();
    const res = await request(app).get(`/api/companies/${quiet.profile._id}/jobs`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ jobs: [], total: 0 });
  });

  it("follows the company page rule: approved (even unpublished) opens, pending or unknown is 404", async () => {
    // CC-01: an approved company's page shows the basics before it is published, so its jobs too.
    const draft = await createEmployer({ published: false });
    const draftJob = await postJob(draft);
    expect(titlesOf(await request(app).get(`/api/companies/${draft.profile._id}/jobs`))).toEqual([draftJob.title]);

    const pending = await createEmployer();
    await postJob(pending);
    await EmployerProfile.updateOne({ _id: pending.profile._id }, { $set: { verificationStatus: "pending" } });
    expect((await request(app).get(`/api/companies/${pending.profile._id}/jobs`)).statusCode).toBe(404);
    expect((await request(app).get(`/api/companies/${"0".repeat(24)}/jobs`)).statusCode).toBe(404);
    expect((await request(app).get("/api/companies/not-an-id/jobs")).statusCode).toBe(404);
  });

  it("includes colleagues' jobs under the same active Company, and nothing once it is inactive", async () => {
    const company = await Company.create({ name: uniq("Shared Co"), status: "active" });
    const alice = await createEmployer({ companyId: company._id });
    const bob = await createEmployer({ companyId: company._id, published: false });
    const outsider = await createEmployer();
    const aliceJob = await postJob(alice, { companyId: company._id });
    const bobJob = await postJob(bob, { companyId: company._id });
    await postJob(outsider);

    const res = await request(app).get(`/api/companies/${alice.profile._id}/jobs`);
    expect(titlesOf(res)).toEqual([aliceJob.title, bobJob.title].sort());

    await Company.updateOne({ _id: company._id }, { status: "inactive" });
    expect((await request(app).get(`/api/companies/${alice.profile._id}/jobs`)).statusCode).toBe(404);
  });
});

describe("employer views only count an active company's jobs (FL-01)", () => {
  it("analytics and dashboard drop a colleague's jobs once the company is inactive", async () => {
    const company = await Company.create({ name: uniq("Shared Co"), status: "active" });
    const alice = await createEmployer({ companyId: company._id });
    const bob = await createEmployer({ companyId: company._id });
    await postJob(alice, { companyId: company._id });
    await postJob(bob, { companyId: company._id });
    await postJob(await createEmployer());

    const before = await as(bob.token, "/api/employer/analytics");
    expect(before.statusCode).toBe(200);
    expect(before.body.hiring.totalJobs).toBe(2);

    await Company.updateOne({ _id: company._id }, { status: "inactive" });

    const after = await as(bob.token, "/api/employer/analytics");
    expect(after.body.hiring.totalJobs).toBe(1);

    const dashboard = await as(bob.token, "/api/employer/dashboard");
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body.kpis.activeJobs).toBe(1);
  });
});
