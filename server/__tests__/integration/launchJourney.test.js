const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const { createTestJob } = require("../helpers/createTestJob");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");

describe("launch candidate journey (isolated MongoDB)", () => {
  let candidate;
  let otherCandidate;
  let employer;
  let otherEmployer;
  let job;
  let internship;

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: "qa-candidate@example.com" });
    otherCandidate = await createUserWithToken({ email: "qa-other@example.com" });
    employer = await createEmployerWithToken({ email: "qa-employer@example.com" });
    otherEmployer = await createEmployerWithToken({ email: "qa-other-employer@example.com" });
    const profile = await EmployerProfile.create({
      userId: employer.user._id,
      companyName: "QA Employer",
      industry: "Technology",
    });
    job = await createTestJob(profile._id, {
      title: "QA Launch Job",
      createdBy: employer.user._id,
      employerId: profile._id,
    });
    internship = await Internship.create({
      title: "QA Launch Internship",
      companyName: "QA Employer",
      location: "Remote",
      description: "Isolated launch journey fixture",
      createdBy: employer.user._id,
      employerId: profile._id,
      status: "Published",
    });
  });

  const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

  it("shows published opportunities and hides drafts", async () => {
    const draftJob = await createTestJob(job.employerId, {
      title: "QA Draft Job",
      createdBy: employer.user._id,
      status: "Draft",
    });
    const draftInternship = await Internship.create({
      title: "QA Draft Internship",
      location: "Remote",
      description: "Should remain hidden",
      employerId: internship.employerId,
      createdBy: employer.user._id,
      status: "Draft",
    });

    const [jobs, internships] = await Promise.all([
      request(app).get("/api/jobs?source=campus&limit=10"),
      request(app).get("/api/internships?source=campus&limit=10"),
    ]);
    expect(jobs.status).toBe(200);
    expect(internships.status).toBe(200);
    expect(jobs.body.jobs.map((item) => String(item._id))).toContain(String(job._id));
    expect(jobs.body.jobs.map((item) => String(item._id))).not.toContain(String(draftJob._id));
    expect(internships.body.internships.map((item) => String(item._id))).toContain(String(internship._id));
    expect(internships.body.internships.map((item) => String(item._id))).not.toContain(String(draftInternship._id));
  });

  it("applies to a job and internship once, shows Applied IDs, and scopes employer access", async () => {
    const jobPath = `/api/applications/job/${job._id}`;
    const internshipPath = `/api/applications/internship/${internship._id}`;
    const payload = { fullName: candidate.user.fullName, email: candidate.user.email };

    const unauthenticated = await request(app).post(jobPath).send(payload);
    expect(unauthenticated.status).toBe(401);

    const [jobApply, internshipApply] = await Promise.all([
      request(app).post(jobPath).set(auth(candidate)).send(payload),
      request(app).post(internshipPath).set(auth(candidate)).send(payload),
    ]);
    expect(jobApply.status).toBe(201);
    expect(internshipApply.status).toBe(201);
    expect(jobApply.body.application.status).toBe("Applied");
    expect(internshipApply.body.application.status).toBe("Applied");

    const [duplicateJob, duplicateInternship, appliedIds, myApplications] = await Promise.all([
      request(app).post(jobPath).set(auth(candidate)).send(payload),
      request(app).post(internshipPath).set(auth(candidate)).send(payload),
      request(app).get("/api/applications/me/applied-ids").set(auth(candidate)),
      request(app).get("/api/applications/me").set(auth(candidate)),
    ]);
    expect(duplicateJob.status).toBe(409);
    expect(duplicateInternship.status).toBe(409);
    expect(appliedIds.status).toBe(200);
    expect(appliedIds.body.jobIds).toContain(String(job._id));
    expect(appliedIds.body.internshipIds).toContain(String(internship._id));
    expect(myApplications.body.applications).toHaveLength(2);

    const applicationId = jobApply.body.application._id;
    const [candidateDetail, strangerDetail, employerList, strangerEmployerList] = await Promise.all([
      request(app).get(`/api/applications/${applicationId}`).set(auth(candidate)),
      request(app).get(`/api/applications/${applicationId}`).set(auth(otherCandidate)),
      request(app).get("/api/applications/employer/list").set(auth(employer)),
      request(app).get("/api/applications/employer/list").set(auth(otherEmployer)),
    ]);
    expect(candidateDetail.status).toBe(200);
    expect(strangerDetail.status).toBe(403);
    expect(employerList.body.applications).toHaveLength(2);
    expect(strangerEmployerList.body.applications).toHaveLength(0);

    const statusUpdate = await request(app)
      .patch(`/api/applications/${applicationId}/status`)
      .set(auth(employer))
      .send({ status: "Shortlisted" });
    expect(statusUpdate.status).toBe(200);
    const refreshed = await request(app).get("/api/applications/me").set(auth(candidate));
    expect(refreshed.body.applications.find((item) => item._id === applicationId).status).toBe("Shortlisted");
  });

  it("replenishes dashboard picks after the newest 20 jobs and internships were applied to", async () => {
    await Promise.all(Array.from({ length: 29 }, (_, index) => createTestJob(job.employerId, {
      title: `QA Next Job ${index}`,
      createdBy: employer.user._id,
    })));
    await Internship.insertMany(Array.from({ length: 29 }, (_, index) => ({
      title: `QA Next Internship ${index}`,
      companyName: "QA Employer",
      location: "Remote",
      description: "Isolated recommendation fixture",
      createdBy: employer.user._id,
      employerId: internship.employerId,
      status: "Published",
    })));
    const [newestJobs, newestInternships] = await Promise.all([
      Job.find({ status: "Published" }).sort({ createdAt: -1 }).limit(20).select("_id").lean(),
      Internship.find({ status: "Published" }).sort({ createdAt: -1 }).limit(20).select("_id").lean(),
    ]);
    await Application.insertMany([
      ...newestJobs.map((item) => ({ candidateId: candidate.user._id, jobId: item._id, opportunityType: "Job" })),
      ...newestInternships.map((item) => ({ candidateId: candidate.user._id, internshipId: item._id, opportunityType: "Internship" })),
    ]);

    const response = await request(app).get("/api/student/dashboard").set(auth(candidate));
    expect(response.status).toBe(200);
    const appliedJobs = new Set(newestJobs.map((item) => String(item._id)));
    const appliedInternships = new Set(newestInternships.map((item) => String(item._id)));
    expect(response.body.data.recommendedJobs).toHaveLength(10);
    expect(response.body.data.recommendedInternships).toHaveLength(10);
    expect(response.body.data.recommendedJobs.every((item) => !appliedJobs.has(String(item.id)))).toBe(true);
    expect(response.body.data.recommendedInternships.every((item) => !appliedInternships.has(String(item.id)))).toBe(true);
  });
});
