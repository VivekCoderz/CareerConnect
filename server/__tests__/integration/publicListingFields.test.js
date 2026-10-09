const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const Job = require("../../models/Job");
const { createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

describe("public listing detail pages", () => {
  it("hides moderation fields from the public but shows them to the owner", async () => {
    const employer = await createEmployerWithToken({ email: `owner${Date.now()}@acme.test` });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme", verificationStatus: "approved" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });
    await Job.updateOne({ _id: job._id }, { adminNote: "internal: checked GST", rejectionReason: "old reason" });

    const publicRes = await request(app).get(`/api/jobs/${job._id}`);
    expect(publicRes.statusCode).toBe(200);
    expect(publicRes.body.job.title).toBeTruthy();
    expect(publicRes.body.job.adminNote).toBeUndefined();
    expect(publicRes.body.job.rejectionReason).toBeUndefined();

    const ownerRes = await request(app).get(`/api/jobs/${job._id}`).set("Authorization", `Bearer ${employer.token}`);
    expect(ownerRes.body.job.adminNote).toBe("internal: checked GST");
  });

  it("says whether the company page will open, so the job page never links to a 404 (CC-01)", async () => {
    const employer = await createEmployerWithToken({ email: `cc01${Date.now()}@acme.test` });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme", verificationStatus: "approved" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });

    // Approved employer with a live job, but the company showcase is still a draft.
    const draft = await request(app).get(`/api/jobs/${job._id}`);
    expect(draft.body.job.employerId.hasPublicProfile).toBe(false);
    expect((await request(app).get(`/api/companies/${profile._id}`)).statusCode).toBe(404);

    await EmployerProfile.updateOne({ _id: profile._id }, { isPublished: true });
    const published = await request(app).get(`/api/jobs/${job._id}`);
    expect(published.body.job.employerId.hasPublicProfile).toBe(true);
    expect((await request(app).get(`/api/companies/${published.body.job.employerId._id}`)).statusCode).toBe(200);

    // The fields behind the check stay out of the public listing.
    expect(published.body.job.employerId.isPublished).toBeUndefined();
    expect(published.body.job.employerId.verificationStatus).toBeUndefined();
    expect(published.body.job.employerId.userId).toBeUndefined();
  });

  it("returns 404 for an unknown internship id instead of an unrelated listing", async () => {
    const res = await request(app).get("/api/internships/not-a-real-id");
    expect(res.statusCode).toBe(404);
  });
});
