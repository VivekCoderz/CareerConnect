const request = require("supertest");
const app = require("../../app");
const { createEmployerWithToken, createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");
const EmployerProfile = require("../../models/EmployerProfile");
const Employee = require("../../models/Employee");
const TrainingAssignment = require("../../models/TrainingAssignment");
const Course = require("../../models/Course");
const Internship = require("../../models/Internship");
const Application = require("../../models/Application");
const Interview = require("../../models/Interview");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");

const as = (token, method, path) => request(app)[method](path).set("Cookie", `token=${token}`);

const setup = async () => {
  const owner = await createEmployerWithToken({ email: `medium-owner-${Date.now()}@example.com` });
  const other = await createEmployerWithToken({ email: `medium-other-${Date.now()}@example.com` });
  const candidate = await createUserWithToken({ email: `medium-candidate-${Date.now()}@example.com` });
  const ownerProfile = await EmployerProfile.create({ userId: owner.user._id, companyName: "Owner Co" });
  const otherProfile = await EmployerProfile.create({ userId: other.user._id, companyName: "Other Co" });
  return { owner, other, candidate, ownerProfile, otherProfile };
};

describe("medium security regression", () => {
  it("returns only the signed-in candidate's applied opportunity IDs", async () => {
    const { owner, ownerProfile, candidate } = await setup();
    const otherCandidate = await createUserWithToken({ email: `medium-other-candidate-${Date.now()}@example.com` });
    const job = await createTestJob(ownerProfile._id, { createdBy: owner.user._id });
    const internship = await Internship.create({
      employerId: ownerProfile._id, createdBy: owner.user._id,
      title: "Applied Internship", description: "Internship listing", location: "Delhi", status: "Published",
    });
    await Application.create([
      { candidateId: candidate.user._id, internshipId: internship._id, jobId: internship._id,
        opportunityType: "Internship", opportunityTitle: internship.title },
      { candidateId: otherCandidate.user._id, jobId: job._id,
        opportunityType: "Job", opportunityTitle: job.title },
    ]);

    const path = "/api/applications/me/applied-ids";
    expect((await request(app).get(path)).statusCode).toBe(401);
    const response = await as(candidate.token, "get", path);
    expect(response.statusCode).toBe(200);
    expect(response.body.internshipIds).toEqual([String(internship._id)]);
    expect(response.body.jobIds).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain(String(job._id));
  });

  it("does not expose draft jobs or internships through the public opportunity route", async () => {
    const { owner, ownerProfile } = await setup();
    const draftJob = await createTestJob(ownerProfile._id, { createdBy: owner.user._id, status: "Draft" });
    const internship = await Internship.create({
      employerId: ownerProfile._id, createdBy: owner.user._id,
      title: "Private Internship", description: "Unpublished listing", location: "Delhi", status: "Draft",
    });
    expect((await request(app).get(`/api/opportunities/${draftJob._id}`)).statusCode).toBe(404);
    expect((await request(app).get(`/api/opportunities/${internship._id}`)).statusCode).toBe(404);
    await draftJob.updateOne({ status: "Published" });
    expect((await request(app).get(`/api/opportunities/${draftJob._id}`)).statusCode).toBe(200);
  });

  it("paginates campus internships with an accurate total", async () => {
    const { owner, ownerProfile } = await setup();
    await Internship.create([
      { employerId: ownerProfile._id, createdBy: owner.user._id,
        title: "First Internship", description: "First published role", location: "Delhi", status: "Published" },
      { employerId: ownerProfile._id, createdBy: owner.user._id,
        title: "Second Internship", description: "Second published role", location: "Delhi", status: "Published" },
    ]);
    const response = await request(app).get("/api/internships?source=campus&page=1&limit=1");
    expect(response.statusCode).toBe(200);
    expect(response.body.internships).toHaveLength(1);
    expect(response.body.pagination.total).toBe(2);
    expect(response.body.pagination.totalPages).toBe(2);
  });

  it("protects employee ownership and scopes training assignments", async () => {
    const { owner, other, ownerProfile, otherProfile } = await setup();
    const employee = await Employee.create({
      employerId: ownerProfile._id, fullName: "Owner Employee",
      email: "owner-employee@example.com", designation: "Engineer",
    });
    const foreignEmployee = await Employee.create({
      employerId: otherProfile._id, fullName: "Other Employee",
      email: "other-employee@example.com", designation: "Engineer",
    });
    const course = await Course.create({
      title: "Public Course", description: "A published training course", domain: "Technology",
      category: "Engineering", duration: 2, status: "Published", createdBy: owner.user._id,
    });
    const assignPath = "/api/organization/training/assign";
    const assignment = await as(owner.token, "post", assignPath).send({
      courseId: course._id, employeeId: employee._id, deadline: "2028-01-01",
    });
    expect(assignment.statusCode).toBe(201);
    expect((await as(owner.token, "post", assignPath).send({
      courseId: course._id, employeeId: foreignEmployee._id, deadline: "2028-01-01",
    })).statusCode).toBe(404);
    const edit = await as(owner.token, "put", `/api/organization/employees/${employee._id}`).send({
      fullName: "Updated Employee", employerId: otherProfile._id,
      userId: other.user._id, status: "Active",
    });
    expect(edit.statusCode).toBe(200);
    expect(String(edit.body.employee.employerId)).toBe(String(ownerProfile._id));
    expect(edit.body.employee.userId).toBeNull();
    expect((await as(owner.token, "delete", `/api/organization/employees/${foreignEmployee._id}`)).statusCode).toBe(404);
    expect(await TrainingAssignment.exists({ _id: assignment.body.assignment._id })).toBeTruthy();
  });

  it("does not return internal account fields through candidate details", async () => {
    const { owner, other, candidate } = await setup();
    expect((await as(owner.token, "get", `/api/candidates/${other.user._id}`)).statusCode).toBe(404);
    const response = await as(owner.token, "get", `/api/candidates/${candidate.user._id}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.candidate.firebaseUid).toBeUndefined();
    expect(response.body.candidate.authVersion).toBeUndefined();
    expect(response.body.candidate.password).toBeUndefined();
    expect((await as(owner.token, "get", "/api/candidates/search?search=%28a%2B%29%2B")).statusCode).toBe(200);
  });

  it("normalizes allowed ATS stages and rejects invalid status", async () => {
    const { owner, candidate, ownerProfile } = await setup();
    const job = await createTestJob(ownerProfile._id, { createdBy: owner.user._id });
    const application = await Application.create({
      candidateId: candidate.user._id, jobId: job._id, employerId: ownerProfile._id,
      opportunityType: "Job", opportunityTitle: job.title,
    });
    const path = `/api/applications/${application._id}`;
    const screening = await as(owner.token, "patch", `${path}/status`).send({ status: "Screening" });
    expect(screening.statusCode).toBe(200);
    expect(screening.body.application.status).toBe("Under Review");
    const custom = await as(owner.token, "patch", `${path}/stage`).send({ stage: "Portfolio Check" });
    expect(custom.statusCode).toBe(200);
    expect(custom.body.application.status).toBe("Under Review");
    expect((await as(owner.token, "patch", `${path}/status`).send({ status: "Withdrawn" })).statusCode).toBe(400);
  });

  it("bounds AI chat input and shared request volume", async () => {
    const candidate = await createUserWithToken({ email: "ai-medium@example.com" });
    const path = "/api/ai/chat";
    expect((await as(candidate.token, "post", path).send({ query: "x".repeat(2001) })).statusCode).toBe(400);
    for (let index = 1; index < 30; index += 1) {
      expect((await as(candidate.token, "post", path).send({ query: "x".repeat(2001) })).statusCode).toBe(400);
    }
    expect((await as(candidate.token, "post", path).send({ query: "hello" })).statusCode).toBe(429);
  });

  it("shows candidates interview outcomes without internal feedback or ATS notes", async () => {
    const { owner, candidate, ownerProfile } = await setup();
    const job = await createTestJob(ownerProfile._id, { createdBy: owner.user._id });
    const application = await Application.create({
      candidateId: candidate.user._id, jobId: job._id, employerId: ownerProfile._id,
      opportunityType: "Job", opportunityTitle: job.title,
      notes: [{ text: "Internal ATS note", addedBy: owner.user._id }],
    });
    const interview = await Interview.create({
      employerId: ownerProfile._id, candidateId: candidate.user._id,
      jobId: job._id, applicationId: application._id, scheduledDate: "2028-01-02",
      status: "completed", notes: "Internal interviewer note",
      feedback: { comments: "Private feedback" }, interviewerFeedback: "Private interviewer feedback",
      scorecard: { overallScore: 4, strengths: "Private strengths", recommendation: "Hire" },
    });
    const detail = await as(candidate.token, "get", `/api/interviews/${interview._id}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.interview.scorecard).toEqual({ overallScore: 4, recommendation: "Hire" });
    expect(detail.body.interview.feedback).toBeUndefined();
    expect(detail.body.interview.interviewerFeedback).toBeUndefined();
    expect(detail.body.interview.notes).toBeUndefined();
    expect(detail.body.interview.applicationId.notes).toBeUndefined();
    const list = await as(candidate.token, "get", "/api/interviews");
    expect(list.statusCode).toBe(200);
    expect(list.body.interviews[0].feedback).toBeUndefined();
  });

  it("keeps personal fields out of public fresher profiles and limits recruiter-only profiles", async () => {
    const fresher = await createUserWithToken({ email: "public-fresher@example.com", userType: "fresher" });
    await FresherProfile.create({ userId: fresher.user._id, profileVisibility: "public",
      dateOfBirth: "2000-01-01", resume: { resumeUrl: "https://example.com/private.pdf" },
      jobPreferences: { expectedSalary: { min: 10 } } });
    const publicFresher = await request(app).get(`/api/fresher/public/${fresher.user._id}`);
    expect(publicFresher.statusCode).toBe(200);
    expect(publicFresher.body.data.user.email).toBeUndefined();
    expect(publicFresher.body.data.user.phone).toBeUndefined();
    expect(publicFresher.body.data.profile.resume).toBeUndefined();
    expect(publicFresher.body.data.profile.dateOfBirth).toBeUndefined();
    expect(publicFresher.body.data.profile.jobPreferences).toBeUndefined();

    const professional = await createUserWithToken({ email: "public-pro@example.com", userType: "professional" });
    const profile = await ProfessionalProfile.create({ userId: professional.user._id,
      profileVisibility: "recruiter-only", compensation: { currentSalary: 30 },
      resume: { resumeUrl: "https://example.com/private-pro.pdf" } });
    const path = `/api/professional/public/${professional.user._id}`;
    expect((await request(app).get(path)).statusCode).toBe(403);
    const student = await createUserWithToken({ email: "public-student@example.com" });
    expect((await as(student.token, "get", path)).statusCode).toBe(403);
    const employer = await createEmployerWithToken({ email: "public-employer@example.com" });
    const recruiterView = await as(employer.token, "get", path);
    expect(recruiterView.statusCode).toBe(200);
    expect(recruiterView.body.data.profile.compensation).toBeUndefined();
    expect(recruiterView.body.data.profile.resume).toBeUndefined();
    await profile.updateOne({ profileVisibility: "public" });
    const anonymousView = await request(app).get(path);
    expect(anonymousView.statusCode).toBe(200);
    expect(anonymousView.body.data.user.email).toBeUndefined();
  });

  it("rejects enrollment in draft courses", async () => {
    const { owner } = await setup();
    const course = await Course.create({ title: "Unpublished Course", description: "Private course content",
      domain: "Technology", category: "Engineering", duration: 2, status: "Draft",
      createdBy: owner.user._id });
    expect((await as(owner.token, "post", "/api/employer/learning/enroll")
      .send({ courseId: course._id })).statusCode).toBe(404);
  });
});
