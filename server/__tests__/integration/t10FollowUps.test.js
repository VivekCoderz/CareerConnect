// T10 follow-ups (Ram's review): BUG-20 past deadlines, BUG-21 pay ranges, bulk status race,
// offers withdrawn on reject, and candidate notifications on every status path.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));

const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const JobOffer = require("../../models/JobOffer");
const Notification = require("../../models/Notification");
const { startOfTodayIST } = require("../../utils/listingExpiry");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

// "YYYY-MM-DD" of the IST calendar day `offset` days from today.
const istDate = (offset = 0) =>
  new Date(startOfTodayIST().getTime() + (5.5 * 60 + offset * 24 * 60) * 60000).toISOString().slice(0, 10);

let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const createEmployer = async () => {
  const employer = await createEmployerWithToken({
    email: `${uniq("hr")}@employer.test`,
    phone: `8${String(Date.now() + ++seq).slice(-9)}`,
  });
  const profile = await createEmployerProfile(employer.user._id, { companyName: "Fake Followup Co" });
  return { ...employer, profile };
};

const createCandidate = () => createUserWithToken({
  email: `${uniq("cand")}@candidate.test`,
  phone: `7${String(Date.now() + ++seq).slice(-9)}`,
});

const createApplication = async (employer, candidate, status) => {
  const job = await createTestJob(employer.profile._id, { createdBy: employer.user._id });
  return Application.create({
    candidateId: candidate.user._id,
    jobId: job._id,
    employerId: employer.profile._id,
    opportunityType: "Job",
    opportunityTitle: job.title,
    companyName: "Fake Followup Co",
    status,
  });
};

const jobBody = (overrides = {}) => ({
  title: "Fake QA Intern Role", location: "Remote", description: "A fake listing used only in tests.", ...overrides,
});
const internshipBody = (overrides = {}) => ({
  title: "Fake Design Internship", location: "Remote", description: "A fake internship used only in tests.", ...overrides,
});

describe("BUG-20 listing deadlines", () => {
  it("rejects a past deadline on create; today (IST) and later are fine", async () => {
    const employer = await createEmployer();
    const pastJob = await as(employer.token, "post", "/api/jobs").send(jobBody({ deadline: istDate(-1) }));
    expect(pastJob.statusCode).toBe(400);
    expect(pastJob.body.message).toMatch(/past/);
    expect((await as(employer.token, "post", "/api/jobs").send(jobBody({ deadline: istDate(0) }))).statusCode).toBe(201);
    expect((await as(employer.token, "post", "/api/jobs").send(jobBody({ deadline: istDate(7) }))).statusCode).toBe(201);

    const pastInternship = await as(employer.token, "post", "/api/internships").send(internshipBody({ deadline: istDate(-1) }));
    expect(pastInternship.statusCode).toBe(400);
    expect((await as(employer.token, "post", "/api/internships").send(internshipBody({ deadline: istDate(0) }))).statusCode).toBe(201);
  });

  it("rejects a past deadline on update, but an unchanged stored deadline doesn't block other edits", async () => {
    const employer = await createEmployer();
    const job = await createTestJob(employer.profile._id, { createdBy: employer.user._id, status: "Closed" });
    expect((await as(employer.token, "put", `/api/jobs/${job._id}`).send({ deadline: istDate(-3) })).statusCode).toBe(400);
    expect((await as(employer.token, "put", `/api/jobs/${job._id}`).send({ deadline: istDate(0) })).statusCode).toBe(200);

    // A listing whose deadline has since passed can still be edited with its stored deadline.
    const expired = new Date(`${istDate(-10)}T00:00:00Z`);
    await Job.updateOne({ _id: job._id }, { $set: { deadline: expired } });
    const edit = await as(employer.token, "put", `/api/jobs/${job._id}`)
      .send({ deadline: expired.toISOString(), openings: 3 });
    expect(edit.statusCode).toBe(200);

    const internship = await Internship.create({
      ...internshipBody(), employerId: employer.profile._id, createdBy: employer.user._id, status: "Draft",
    });
    expect((await as(employer.token, "put", `/api/internships/${internship._id}`).send({ deadline: istDate(-1) })).statusCode).toBe(400);
  });

  it("applies to admin-created listings too", async () => {
    const employer = await createEmployer();
    const superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const res = await as(superAdmin.token, "post", "/api/admin/opportunities")
      .send({ type: "job", employerProfileId: employer.profile._id, ...jobBody({ deadline: istDate(-1) }) });
    expect(res.statusCode).toBe(400);
  });
});

describe("BUG-21 pay ranges", () => {
  it("rejects min above max on create (jobs and internships)", async () => {
    const employer = await createEmployer();
    const job = await as(employer.token, "post", "/api/jobs").send(jobBody({ salaryRange: { min: 900000, max: 500000 } }));
    expect(job.statusCode).toBe(400);
    expect(job.body.message).toMatch(/Salary minimum/);
    const internship = await as(employer.token, "post", "/api/internships")
      .send(internshipBody({ stipendAmount: { min: 20000, max: 10000 } }));
    expect(internship.statusCode).toBe(400);
    expect(internship.body.message).toMatch(/Stipend minimum/);

    // max 0 means "no maximum".
    expect((await as(employer.token, "post", "/api/jobs").send(jobBody({ salaryRange: { min: 500000, max: 0 } }))).statusCode).toBe(201);
  });

  it("compares a one-sided update with the stored other side and keeps it", async () => {
    const employer = await createEmployer();
    const job = await createTestJob(employer.profile._id, {
      createdBy: employer.user._id, status: "Draft", salaryRange: { min: 400000, max: 700000 },
    });
    const put = (body) => as(employer.token, "put", `/api/jobs/${job._id}`).send(body);
    expect((await put({ salaryRange: { min: 800000 } })).statusCode).toBe(400);
    expect((await put({ salaryRange: { max: 300000 } })).statusCode).toBe(400);
    expect((await put({ salaryRange: { max: 900000 } })).statusCode).toBe(200);
    expect((await Job.findById(job._id).lean()).salaryRange).toMatchObject({ min: 400000, max: 900000 });

    const internship = await Internship.create({
      ...internshipBody(), employerId: employer.profile._id, createdBy: employer.user._id, status: "Draft",
      stipendAmount: { min: 10000, max: 15000 },
    });
    const internshipPut = (body) => as(employer.token, "put", `/api/internships/${internship._id}`).send(body);
    expect((await internshipPut({ stipendAmount: { min: 20000 } })).statusCode).toBe(400);
    expect((await internshipPut({ stipendAmount: { min: 12000 } })).statusCode).toBe(200);
    expect((await Internship.findById(internship._id).lean()).stipendAmount).toMatchObject({ min: 12000, max: 15000 });
  });
});

describe("bulk status update race", () => {
  afterEach(() => jest.restoreAllMocks());

  it("doesn't overwrite an application that changed between the read and the write", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const raced = await createApplication(employer, candidate, "Applied");
    const calm = await createApplication(employer, candidate, "Applied");

    // The candidate withdraws `raced` after the controller read it, before it writes.
    const realUpdateMany = Application.updateMany.bind(Application);
    jest.spyOn(Application, "updateMany").mockImplementationOnce(async (...args) => {
      await Application.collection.updateOne({ _id: raced._id }, { $set: { status: "Withdrawn" } });
      return realUpdateMany(...args);
    });

    const res = await as(employer.token, "patch", "/api/applications/bulk-status")
      .send({ applicationIds: [raced._id, calm._id], status: "Rejected" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ updated: 1, skipped: 1 });
    expect((await Application.findById(raced._id).lean()).status).toBe("Withdrawn");
    expect((await Application.findById(calm._id).lean()).status).toBe("Rejected");
    expect(await Notification.countDocuments({ relatedApplicationId: raced._id })).toBe(0);
    expect(await Notification.countDocuments({ relatedApplicationId: calm._id })).toBe(1);
  });
});

describe("offers end with the application", () => {
  const sendOffer = (employer, application) =>
    as(employer.token, "post", "/api/offers").send({
      candidateId: application.candidateId, jobId: application.jobId, applicationId: application._id,
      salary: 600000, joiningDate: istDate(30), expiryDate: istDate(10),
    });

  it.each([
    ["pipeline reject", (employer, id) => as(employer.token, "patch", `/api/applications/${id}/pipeline/reject`).send({})],
    ["status endpoint", (employer, id) => as(employer.token, "patch", `/api/applications/${id}/status`).send({ status: "Rejected" })],
    ["bulk", (employer, id) => as(employer.token, "patch", "/api/applications/bulk-status").send({ applicationIds: [id], status: "Rejected" })],
  ])("rejecting via %s withdraws the active offer and the candidate then gets 409", async (_label, reject) => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const application = await createApplication(employer, candidate, "Selected");
    const offer = await sendOffer(employer, application);
    expect(offer.statusCode).toBe(201);

    expect((await reject(employer, application._id)).statusCode).toBe(200);
    expect((await JobOffer.findById(offer.body.offer._id).lean()).status).toBe("Withdrawn");

    const answer = await as(candidate.token, "patch", `/api/offers/${offer.body.offer._id}/respond`).send({ status: "Accepted" });
    expect(answer.statusCode).toBe(409);
    expect((await Application.findById(application._id).lean()).status).toBe("Rejected");
  });

  it("respondToOffer returns 409 when the application has moved on and leaves it alone", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const application = await createApplication(employer, candidate, "Selected");
    const offer = await sendOffer(employer, application);
    // Rejected behind the API's back (no hook runs), so the offer is still "Sent".
    await Application.collection.updateOne({ _id: application._id }, { $set: { status: "Rejected" } });

    const answer = await as(candidate.token, "patch", `/api/offers/${offer.body.offer._id}/respond`).send({ status: "Accepted" });
    expect(answer.statusCode).toBe(409);
    expect(answer.body.code).toBe("OFFER_NOT_ACTIVE");
    const storedOffer = await JobOffer.findById(offer.body.offer._id).lean();
    expect(storedOffer.status).toBe("Withdrawn");
    const stored = await Application.findById(application._id).lean();
    expect(stored.status).toBe("Rejected");
    expect(stored.stageHistory.some((h) => /Accepted the offer/.test(h.notes || ""))).toBe(false);
  });

  it("accepting a live offer still hires the candidate", async () => {
    const employer = await createEmployer();
    const candidate = await createCandidate();
    const application = await createApplication(employer, candidate, "Selected");
    const offer = await sendOffer(employer, application);
    const answer = await as(candidate.token, "patch", `/api/offers/${offer.body.offer._id}/respond`).send({ status: "Accepted" });
    expect(answer.statusCode).toBe(200);
    expect((await Application.findById(application._id).lean()).status).toBe("Hired");
  });
});

describe("candidate notifications on every status path", () => {
  const notificationsFor = (application) => Notification.countDocuments({ relatedApplicationId: application._id });

  it("reopen sends exactly one", async () => {
    const employer = await createEmployer();
    const application = await createApplication(employer, await createCandidate(), "Rejected");
    const res = await as(employer.token, "patch", `/api/applications/${application._id}/pipeline/reopen`).send({});
    expect(res.statusCode).toBe(200);
    expect(await notificationsFor(application)).toBe(1);
  });

  it("mark-failed with reject sends exactly one; without reject sends none", async () => {
    const employer = await createEmployer();
    const kept = await createApplication(employer, await createCandidate(), "Interview");
    await as(employer.token, "patch", `/api/applications/${kept._id}/pipeline/mark-failed`).send({ shouldReject: false });
    expect(await notificationsFor(kept)).toBe(0);

    const rejected = await createApplication(employer, await createCandidate(), "Interview");
    const res = await as(employer.token, "patch", `/api/applications/${rejected._id}/pipeline/mark-failed`).send({ shouldReject: true });
    expect(res.statusCode).toBe(200);
    expect(await notificationsFor(rejected)).toBe(1);
  });

  it("round update sends exactly one when the status changes", async () => {
    const employer = await createEmployer();
    const application = await createApplication(employer, await createCandidate(), "Interview");
    const res = await as(employer.token, "patch", `/api/applications/${application._id}/pipeline/round`)
      .send({ roundIndex: 1, status: "Selected" });
    expect(res.statusCode).toBe(200);
    expect(await notificationsFor(application)).toBe(1);

    // Same status again: nothing new to tell the candidate.
    await as(employer.token, "patch", `/api/applications/${application._id}/pipeline/round`).send({ roundIndex: 1, feedback: "Fake feedback" });
    expect(await notificationsFor(application)).toBe(1);
  });

  it("pipeline select and reject each send exactly one (candidate was populated before)", async () => {
    const employer = await createEmployer();
    const selected = await createApplication(employer, await createCandidate(), "Interview Completed");
    expect((await as(employer.token, "patch", `/api/applications/${selected._id}/pipeline/select`).send({})).statusCode).toBe(200);
    expect(await notificationsFor(selected)).toBe(1);

    const rejected = await createApplication(employer, await createCandidate(), "Interview");
    expect((await as(employer.token, "patch", `/api/applications/${rejected._id}/pipeline/reject`).send({})).statusCode).toBe(200);
    expect(await notificationsFor(rejected)).toBe(1);
  });

  it("admin status override sends exactly one", async () => {
    const employer = await createEmployer();
    const application = await createApplication(employer, await createCandidate(), "Applied");
    const superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    const res = await as(superAdmin.token, "patch", `/api/admin/applications/${application._id}/status`).send({ status: "Shortlisted" });
    expect(res.statusCode).toBe(200);
    expect(await notificationsFor(application)).toBe(1);
  });
});
