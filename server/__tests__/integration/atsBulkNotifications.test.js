jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ success: true }));

const request = require("supertest");
const app = require("../../app");
const sendEmail = require("../../utils/sendEmail");
const Application = require("../../models/Application");
const Notification = require("../../models/Notification");
const EmployerProfile = require("../../models/EmployerProfile");
const Job = require("../../models/Job");
const EmailUsage = require("../../models/EmailUsage");
const { sendPendingDigests } = require("../../services/emailDigest");
const { reserveNotificationEmail, recordOtpEmail, istDay } = require("../../services/emailBudget");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
const waitFor = async (check) => {
  for (let i = 0; i < 100 && !(await check()); i++) await new Promise((r) => setTimeout(r, 100));
};

const setup = async (candidateCount = 3) => {
  const employer = await createEmployerWithToken({ email: `hr${Date.now()}@acme.test` });
  const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme Labs", verificationStatus: "approved" });
  const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });
  const candidates = [];
  for (let i = 0; i < candidateCount; i++) {
    candidates.push(await createUserWithToken({ email: `cand${i}-${Date.now()}@student.test` }));
  }
  if (candidates.length === 0) return { employer, profile, job, candidates, applicationIds: [] };
  const { insertedIds } = await Application.collection.insertMany(candidates.map((c) => ({
    candidateId: c.user._id, jobId: job._id, employerId: profile._id, status: "Applied", opportunityType: "Job",
    opportunityTitle: "MERN Developer", companyName: "Acme Labs",
  })));
  return { employer, profile, job, candidates, applicationIds: Object.values(insertedIds).map(String) };
};

beforeEach(() => {
  sendEmail.mockClear();
  delete process.env.NOTIFICATION_EMAIL_DAILY_BUDGET;
});

describe("bulk applicant actions", () => {
  it("rejects many applicants at once, skips final ones and notifies in-app without emailing", async () => {
    const { employer, applicationIds } = await setup(3);
    await Application.updateOne({ _id: applicationIds[2] }, { $set: { status: "Withdrawn" } });
    const other = await setup(1);

    const res = await as(employer.token, "patch", "/api/applications/bulk-status")
      .send({ applicationIds: [...applicationIds, other.applicationIds[0]], status: "Rejected" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ updated: 2, skipped: 1, notFound: 1 });
    expect((await Application.findById(other.applicationIds[0]).lean()).status).toBe("Applied");
    const notes = await Notification.find({ relatedApplicationId: { $in: applicationIds.slice(0, 2) } }).lean();
    expect(notes).toHaveLength(2);
    expect(notes.every((n) => n.notificationType === "APPLICATION_STATUS" && n.metadata.emailDigest === true)).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("emails good news right away, within the daily email budget", async () => {
    process.env.NOTIFICATION_EMAIL_DAILY_BUDGET = "1";
    const { employer, applicationIds } = await setup(2);

    const res = await as(employer.token, "patch", "/api/applications/bulk-status").send({ applicationIds, status: "Shortlisted" });

    expect(res.body.updated).toBe(2);
    await waitFor(async () => (await Notification.countDocuments({ "metadata.emailDigest": true, relatedApplicationId: { $in: applicationIds } })) === 1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // The second candidate's email didn't fit today's budget: it moves to the daily summary.
    expect(await Notification.countDocuments({ "metadata.emailDigest": true, relatedApplicationId: { $in: applicationIds } })).toBe(1);
  });

  it("refuses statuses that must be set one at a time and oversized batches", async () => {
    const { employer, applicationIds } = await setup(1);
    const bulk = (body) => as(employer.token, "patch", "/api/applications/bulk-status").send(body);

    expect((await bulk({ applicationIds, status: "Hired" })).statusCode).toBe(400);
    expect((await bulk({ applicationIds: Array(301).fill(applicationIds[0]), status: "Rejected" })).statusCode).toBe(400);
  });

  it("notifies the candidate when a single application status changes", async () => {
    const { employer, applicationIds } = await setup(1);

    const res = await as(employer.token, "patch", `/api/applications/${applicationIds[0]}/status`).send({ status: "Rejected" });
    expect(res.statusCode).toBe(200);

    expect(await Notification.countDocuments({ relatedApplicationId: applicationIds[0], notificationType: "APPLICATION_STATUS" })).toBe(1);
  });
});

describe("position filled and daily summary", () => {
  it("tells waiting candidates when the job closes, but not the hired one", async () => {
    const { employer, job, applicationIds } = await setup(2);
    await Application.updateOne({ _id: applicationIds[1] }, { $set: { status: "Hired" } });

    const res = await as(employer.token, "patch", `/api/jobs/${job._id}/status`).send({ status: "Closed" });

    expect(res.statusCode).toBe(200);
    await waitFor(async () => (await Notification.countDocuments({ "metadata.status": "PositionFilled" })) > 0);
    expect(await Notification.countDocuments({ relatedApplicationId: applicationIds[0], "metadata.status": "PositionFilled" })).toBe(1);
    expect(await Notification.countDocuments({ relatedApplicationId: applicationIds[1], "metadata.status": "PositionFilled" })).toBe(0);
  });

  it("sends one summary email per candidate for several updates", async () => {
    const { employer, applicationIds, candidates } = await setup(1);
    const second = await Application.collection.insertOne({
      candidateId: candidates[0].user._id, jobId: (await createTestJob(null)).id, status: "Applied", opportunityTitle: "Intern",
    });
    await as(employer.token, "patch", "/api/applications/bulk-status").send({ applicationIds, status: "Rejected" });
    await Notification.create({
      recipient: candidates[0].user._id, recipientId: candidates[0].user._id, title: "Position closed", message: "Closed",
      notificationType: "APPLICATION_STATUS", relatedApplicationId: second.insertedId,
      metadata: { status: "PositionFilled", emailDigest: true, digestSent: false },
    });

    expect(await sendPendingDigests()).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await Notification.countDocuments({ recipient: candidates[0].user._id, "metadata.digestSent": false })).toBe(0);
    expect(await sendPendingDigests()).toBe(0);
  });
});

describe("email budget", () => {
  it("never blocks OTPs and stops other emails at the daily budget", async () => {
    process.env.NOTIFICATION_EMAIL_DAILY_BUDGET = "2";

    expect(await reserveNotificationEmail()).toBe(true);
    expect(await reserveNotificationEmail()).toBe(true);
    expect(await reserveNotificationEmail()).toBe(false);
    await recordOtpEmail();
    expect((await EmailUsage.findOne({ day: istDay(), kind: "otp" }).lean()).count).toBe(1);
  });
});

describe("admin posts on behalf of an employer", () => {
  it("publishes the listing under the employer's own account", async () => {
    const { profile, employer } = await setup(0);
    const admin = await createUserWithToken({ email: `root${Date.now()}@careerconnect.test`, role: "SUPER_ADMIN", userType: "admin" });

    const res = await as(admin.token, "post", "/api/admin/opportunities").send({
      type: "job", employerProfileId: profile._id, title: "Backend Intern", description: "Node.js work", location: "Delhi",
    });

    expect(res.statusCode).toBe(201);
    const job = await Job.findById(res.body.opportunity._id).lean();
    expect(String(job.createdBy)).toBe(String(employer.user._id));
    expect(String(job.employerId)).toBe(String(profile._id));
    expect(job.status).toBe("Published");
    expect(job.approvalMethod).toBe("admin");
    expect(await Notification.countDocuments({ recipient: employer.user._id })).toBeGreaterThan(0);
  });

  it("refuses unapproved employers and non-super-admins", async () => {
    const { profile } = await setup(0);
    await EmployerProfile.updateOne({ _id: profile._id }, { verificationStatus: "pending" });
    const admin = await createUserWithToken({ email: `root2${Date.now()}@careerconnect.test`, role: "SUPER_ADMIN", userType: "admin" });
    const body = { type: "job", employerProfileId: profile._id, title: "X", description: "Y", location: "Z" };

    expect((await as(admin.token, "post", "/api/admin/opportunities").send(body)).statusCode).toBe(400);
    const employer = await createEmployerWithToken({ email: `emp${Date.now()}@acme.test` });
    expect((await as(employer.token, "post", "/api/admin/opportunities").send(body)).statusCode).toBe(403);
  });
});
