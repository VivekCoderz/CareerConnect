const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Interview = require("../../models/Interview");
const { createTestJob } = require("../helpers/createTestJob");
const { createUserWithToken, createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");

// Bug 8: the application tracking page shows an interview round as "Scheduled" with its
// date, so GET /applications/:id must include the application's interviews.
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

describe("GET /api/applications/:id interviews (bug 8)", () => {
  let candidate;
  let employer;
  let application;

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: "track-candidate@example.com", phone: "9400000001" });
    employer = await createEmployerWithToken({ email: "track-hr@example.com", phone: "9400000002" });
    const profile = await createEmployerProfile(employer.user._id);
    const job = await createTestJob(profile._id, { createdBy: employer.user._id });
    application = await Application.create({
      candidateId: candidate.user._id,
      jobId: job._id,
      employerId: profile._id,
      opportunityType: "Job",
      status: "Shortlisted",
      currentStageIndex: 1,
    });
  });

  const interview = (overrides) => Interview.create({
    employerId: employer.user._id,
    candidateId: candidate.user._id,
    applicationId: application._id,
    scheduledDate: "2026-11-20",
    startTime: "10:30",
    duration: 30,
    roundName: "HR Round",
    roundNumber: 2,
    status: "scheduled",
    ...overrides,
  });

  it("includes the application's interviews for the candidate", async () => {
    await interview();

    const res = await request(app).get(`/api/applications/${application._id}`).set(auth(candidate));

    expect(res.status).toBe(200);
    expect(res.body.application.interviews).toHaveLength(1);
    expect(res.body.application.interviews[0]).toMatchObject({ roundName: "HR Round", roundNumber: 2, status: "scheduled" });
    expect(res.body.application.interviews[0].scheduledDate).toBeTruthy();
  });

  it("does not send the interviewer's scorecard to the candidate", async () => {
    const saved = await interview({ scorecard: { overallScore: 2, strengths: "Private interviewer notes" } });
    expect((await Interview.findById(saved._id).lean()).scorecard.strengths).toBe("Private interviewer notes");

    const res = await request(app).get(`/api/applications/${application._id}`).set(auth(candidate));

    expect(res.body.application.interviews[0].scorecard).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("Private interviewer notes");
  });

  it("returns an empty list when no interview is booked, and only this application's interviews", async () => {
    const otherJob = await createTestJob(application.employerId, { title: "Other Job", createdBy: employer.user._id });
    const otherApplication = await Application.create({
      candidateId: candidate.user._id,
      jobId: otherJob._id,
      employerId: application.employerId,
      opportunityType: "Job",
    });
    await Interview.create({
      employerId: employer.user._id,
      candidateId: candidate.user._id,
      applicationId: otherApplication._id,
      scheduledDate: "2026-11-21",
      startTime: "11:00",
      duration: 30,
      status: "scheduled",
    });

    const res = await request(app).get(`/api/applications/${application._id}`).set(auth(candidate));

    expect(res.status).toBe(200);
    expect(res.body.application.interviews).toEqual([]);
  });

  it("still refuses another candidate", async () => {
    const stranger = await createUserWithToken({ email: "track-stranger@example.com", phone: "9400000003" });
    const res = await request(app).get(`/api/applications/${application._id}`).set(auth(stranger));
    expect(res.status).toBe(403);
  });
});
