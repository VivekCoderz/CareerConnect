const request = require("supertest");
const app = require("../../app");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");
const EmployerProfile = require("../../models/EmployerProfile");
const Application = require("../../models/Application");
const StudentProfile = require("../../models/StudentProfile");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const Course = require("../../models/Course");
const CourseContent = require("../../models/CourseContent");
const Internship = require("../../models/Internship");

const as = (token, method, path) => request(app)[method](path).set("Cookie", `token=${token}`);

describe("recruitment authorization", () => {
  const setup = async () => {
    const employer = await createEmployerWithToken({ email: `employer-${Date.now()}@example.com` });
    const otherEmployer = await createEmployerWithToken({ email: `other-${Date.now()}@example.com` });
    const candidate = await createUserWithToken({ email: `candidate-${Date.now()}@example.com` });
    const outsider = await createUserWithToken({ email: `outsider-${Date.now()}@example.com` });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Owned Company" });
    const otherProfile = await EmployerProfile.create({ userId: otherEmployer.user._id, companyName: "Other Company" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id });
    const otherJob = await createTestJob(otherProfile._id, { createdBy: otherEmployer.user._id });
    const application = await Application.create({
      candidateId: candidate.user._id, jobId: job._id, employerId: profile._id,
      opportunityType: "Job", opportunityTitle: job.title, companyName: "Owned Company",
    });
    return { employer, otherEmployer, candidate, outsider, profile, job, otherJob, application };
  };

  it("hides answer keys, binds submissions to applications and restricts results", async () => {
    const data = await setup();
    const create = await as(data.employer.token, "post", "/api/assessments").send({
      title: "Private test", jobId: data.job._id,
      questions: [{ question: "2 + 2?", options: ["3", "4"], correctAnswer: "4" }],
    });
    expect(create.statusCode).toBe(201);
    const id = create.body.assessment._id;
    const questionId = create.body.assessment.questions[0]._id;

    const candidateView = await as(data.candidate.token, "get", `/api/assessments/${id}`);
    expect(candidateView.statusCode).toBe(200);
    expect(candidateView.body.assessment.questions[0].correctAnswer).toBeUndefined();
    expect((await as(data.outsider.token, "get", `/api/assessments/${id}`)).statusCode).toBe(404);
    expect((await as(data.otherEmployer.token, "get", `/api/assessments/${id}/results`)).statusCode).toBe(404);

    const submit = await as(data.candidate.token, "post", `/api/assessments/${id}/submit`).send({
      applicationId: data.application._id.toString(), jobId: data.otherJob._id.toString(),
      answers: [{ questionId, selectedAnswer: "4" }],
    });
    expect(submit.statusCode).toBe(201);
    expect(submit.body.submission.jobId).toBe(String(data.job._id));
    expect(submit.body.submission.answers[0].correctAnswer).toBeUndefined();
    expect((await as(data.candidate.token, "post", `/api/assessments/${id}/submit`).send({ answers: [] })).statusCode).toBe(409);
    expect((await as(data.outsider.token, "post", `/api/assessments/${id}/submit`).send({ answers: [] })).statusCode).toBe(403);
  });

  it("only creates offers for an owned job and matching application; response is one-use", async () => {
    const data = await setup();
    const payload = {
      candidateId: data.candidate.user._id, jobId: data.job._id, applicationId: data.application._id,
      salary: 600000, joiningDate: "2027-01-01", expiryDate: "2027-02-01",
    };
    expect((await as(data.otherEmployer.token, "post", "/api/offers").send(payload)).statusCode).toBe(403);
    expect((await as(data.employer.token, "post", "/api/offers").send({
      ...payload, candidateId: data.outsider.user._id,
    })).statusCode).toBe(403);
    const created = await as(data.employer.token, "post", "/api/offers").send(payload);
    expect(created.statusCode).toBe(201);
    const path = `/api/offers/${created.body.offer._id}/respond`;
    expect((await as(data.outsider.token, "patch", path).send({ status: "Accepted" })).statusCode).toBe(409);
    expect((await as(data.candidate.token, "patch", path).send({ status: "Accepted" })).statusCode).toBe(200);
    expect((await as(data.candidate.token, "patch", path).send({ status: "Rejected" })).statusCode).toBe(409);
  });

  it("keeps draft listings private and protects listing ownership fields", async () => {
    const data = await setup();
    data.job.status = "Draft";
    await data.job.save();
    expect((await request(app).get(`/api/jobs/${data.job._id}`)).statusCode).toBe(404);
    expect((await as(data.employer.token, "get", `/api/jobs/${data.job._id}`)).statusCode).toBe(200);
    const changed = await as(data.employer.token, "put", `/api/jobs/${data.job._id}`).send({
      title: "Updated job", employerId: data.otherJob.employerId,
      createdBy: data.otherEmployer.user._id, applicantsCount: 999999,
    });
    expect(changed.statusCode).toBe(200);
    expect(String(changed.body.job.employerId)).toBe(String(data.profile._id));
    expect(String(changed.body.job.createdBy)).toBe(String(data.employer.user._id));
    expect(changed.body.job.applicantsCount).toBe(0);
    expect((await request(app).get("/api/jobs?status=Draft&source=campus")).body.jobs
      .some((job) => job._id === String(data.job._id))).toBe(false);
    expect((await as(data.employer.token, "get", "/api/jobs?myJobs=true&source=campus")).body.jobs
      .some((job) => job._id === String(data.job._id))).toBe(true);
    expect((await as(data.otherEmployer.token, "get", "/api/jobs?myJobs=true&source=campus")).body.jobs
      .some((job) => job._id === String(data.job._id))).toBe(false);

    const internship = await Internship.create({
      title: "Private internship", description: "Private role", location: "Mumbai",
      employerId: data.profile._id, createdBy: data.employer.user._id, status: "Draft",
    });
    expect((await request(app).get(`/api/internships/${internship._id}`)).statusCode).toBe(404);
    expect((await as(data.employer.token, "get", `/api/internships/${internship._id}`)).statusCode).toBe(200);
    const edited = await as(data.employer.token, "put", `/api/internships/${internship._id}`).send({
      title: "Updated internship", employerId: data.otherJob.employerId, viewsCount: 100000,
    });
    expect(edited.statusCode).toBe(200);
    expect(String(edited.body.internship.employerId)).toBe(String(data.profile._id));
    expect(edited.body.internship.viewsCount).toBe(0);
  });

  it("rejects files whose content does not match their PDF name and MIME type", async () => {
    const candidate = await createUserWithToken({ email: "upload-candidate@example.com" });
    const employer = await createEmployerWithToken({ email: "upload-employer@example.com" });
    const fakePdf = Buffer.from("<html><script>alert(1)</script></html>");
    const resume = await as(candidate.token, "post", "/api/resume/parse")
      .attach("resume", fakePdf, { filename: "resume.pdf", contentType: "application/pdf" });
    expect(resume.statusCode).toBe(400);

    const course = await as(employer.token, "post", "/api/courses/507f1f77bcf86cd799439011/content")
      .field("type", "pdf")
      .field("title", "Unsafe document")
      .attach("file", fakePdf, { filename: "lecture.pdf", contentType: "application/pdf" });
    expect(course.statusCode).toBe(400);
  });

  it("limits login attempts by identifier across the shared counter", async () => {
    const payload = { emailOrUsername: "target-account@example.com", password: "wrong-password" };
    for (let i = 0; i < 10; i += 1) {
      expect((await request(app).post("/api/auth/login").send(payload)).statusCode).toBe(401);
    }
    const blocked = await request(app).post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.1")
      .send(payload);
    expect(blocked.statusCode).toBe(429);
  });

  it("does not let profile writes change account ownership or verification", async () => {
    const victim = await createUserWithToken({ email: "profile-victim@example.com" });
    const cases = [
      { type: "student", model: StudentProfile, path: "/api/student/profile" },
      { type: "fresher", model: FresherProfile, path: "/api/fresher/profile" },
      { type: "professional", model: ProfessionalProfile, path: "/api/professional/profile" },
    ];
    for (const item of cases) {
      const actor = await createUserWithToken({ email: `profile-${item.type}@example.com`, userType: item.type });
      const result = await as(actor.token, "put", item.path).send({
        city: "Delhi", userId: victim.user._id, verificationStatus: "verified",
        profileCompletion: 100, isProfileComplete: true,
      });
      expect(result.statusCode).toBe(200);
      const profile = await item.model.findOne({ userId: actor.user._id });
      expect(profile).toBeTruthy();
      expect(profile.verificationStatus).toBe("unverified");
      expect(String(profile.userId)).toBe(String(actor.user._id));
    }
    const employer = await createEmployerWithToken({ email: "profile-employer@example.com" });
    const company = await as(employer.token, "put", "/api/employer/profile").send({
      companyName: "Test Company", isPublished: true, profileCompletion: 100,
      userId: victim.user._id,
    });
    expect(company.statusCode).toBe(200);
    expect(company.body.profile.isPublished).toBe(false);
    expect(String(company.body.profile.userId)).toBe(String(employer.user._id));
  });

  it("rejects executable course content URLs", async () => {
    const employer = await createEmployerWithToken({ email: "content-employer@example.com" });
    const course = await Course.create({
      title: "Safe course", description: "A course with safe content", domain: "Technology",
      category: "Engineering", duration: 2, createdBy: employer.user._id,
    });
    const content = await CourseContent.create({
      course: course._id, type: "pdf", title: "Lecture", url: "https://example.com/lecture.pdf",
      createdBy: employer.user._id,
    });
    const response = await as(employer.token, "put", `/api/course-content/${content._id}`)
      .send({ url: "javascript:alert(1)" });
    expect(response.statusCode).toBe(400);
    expect((await CourseContent.findById(content._id)).url).toBe("https://example.com/lecture.pdf");
  });
});
