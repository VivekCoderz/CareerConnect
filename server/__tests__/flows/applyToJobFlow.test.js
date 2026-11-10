jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));

const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const Job = require("../../models/Job");
const { createTestJob } = require("../helpers/createTestJob");
const { createTestUser, createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");

// Flow 3: a signed-in student browses jobs, opens one, applies, and can't apply twice.
const PASSWORD = "Password@123";

// Signs in through the real login endpoint and returns an agent that carries the cookie.
const signIn = async (email) => {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ emailOrUsername: email, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
};

describe("student apply to job flow", () => {
  let student;
  let employer;
  let profile;
  let job;

  beforeEach(async () => {
    student = await createTestUser({ email: "flow-student@example.com", phone: "9200000001" });
    employer = await createEmployerWithToken({ email: "flow-employer@example.com", phone: "9200000002" });
    profile = await createEmployerProfile(employer.user._id, { companyName: "Flow Labs" });
    job = await createTestJob(profile._id, {
      title: "Flow React Developer",
      companyName: "Flow Labs",
      createdBy: employer.user._id,
    });
  });

  it("lists published jobs, shows the job, applies, and saves the application", async () => {
    const draft = await createTestJob(profile._id, { title: "Flow Draft Job", createdBy: employer.user._id, status: "Draft" });
    const agent = await signIn(student.email);

    const list = await agent.get("/api/jobs?limit=20");
    expect(list.status).toBe(200);
    const listedIds = list.body.jobs.map((item) => String(item._id));
    expect(listedIds).toContain(String(job._id));
    expect(listedIds).not.toContain(String(draft._id));

    const detail = await agent.get(`/api/jobs/${job._id}`);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).toContain("Flow React Developer");

    const apply = await agent.post(`/api/applications/job/${job._id}`).send({
      fullName: "Flow Student",
      phone: "9200000001",
      coverLetter: "I would love to build React apps with you.",
    });
    expect(apply.status).toBe(201);
    expect(apply.body.success).toBe(true);
    expect(apply.body.application.status).toBe("Applied");

    // Saved in the database, linked to the student, the job and the employer.
    const saved = await Application.find({ candidateId: student._id }).lean();
    expect(saved).toHaveLength(1);
    expect(String(saved[0]._id)).toBe(String(apply.body.application._id));
    expect(String(saved[0].jobId)).toBe(String(job._id));
    expect(String(saved[0].employerId)).toBe(String(profile._id));
    expect(saved[0]).toMatchObject({
      status: "Applied",
      opportunityType: "Job",
      opportunityTitle: "Flow React Developer",
      companyName: "Flow Labs",
      studentEmail: student.email,
      coverLetter: "I would love to build React apps with you.",
    });
    expect((await Job.findById(job._id).lean()).applicantsCount).toBe(1);

    // The student sees it in their applications, and the employer sees it in theirs.
    const appliedIds = await agent.get("/api/applications/me/applied-ids");
    expect(appliedIds.status).toBe(200);
    expect(appliedIds.body.jobIds).toContain(String(job._id));
    const mine = await agent.get("/api/applications/me");
    expect(mine.body.applications.map((a) => String(a._id))).toEqual([String(saved[0]._id)]);
    const employerList = await request(app).get("/api/applications/employer/list")
      .set("Cookie", `token=${employer.token}`);
    expect(employerList.body.applications.map((a) => String(a._id))).toContain(String(saved[0]._id));
  });

  it("prevents a duplicate application and leaves the first one unchanged", async () => {
    const agent = await signIn(student.email);
    const first = await agent.post(`/api/applications/job/${job._id}`).send({ coverLetter: "First" });
    expect(first.status).toBe(201);

    const second = await agent.post(`/api/applications/job/${job._id}`).send({ coverLetter: "Second" });

    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    const saved = await Application.find({ candidateId: student._id, jobId: job._id }).lean();
    expect(saved).toHaveLength(1);
    expect(saved[0].coverLetter).toBe("First");
    expect((await Job.findById(job._id).lean()).applicantsCount).toBe(1);
  });

  it("stores only one application when the apply button is double-clicked", async () => {
    const agent = await signIn(student.email);
    await Application.syncIndexes();

    const results = await Promise.all([
      agent.post(`/api/applications/job/${job._id}`).send({}),
      agent.post(`/api/applications/job/${job._id}`).send({}),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Application.countDocuments({ candidateId: student._id, jobId: job._id })).toBe(1);
  });

  it("lets different students apply to the same job", async () => {
    const other = await createTestUser({ email: "flow-student-2@example.com", phone: "9200000003" });
    const [a, b] = await Promise.all([signIn(student.email), signIn(other.email)]);

    expect((await a.post(`/api/applications/job/${job._id}`).send({})).status).toBe(201);
    expect((await b.post(`/api/applications/job/${job._id}`).send({})).status).toBe(201);
    expect(await Application.countDocuments({ jobId: job._id })).toBe(2);
    expect((await Job.findById(job._id).lean()).applicantsCount).toBe(2);
  });

  it("refuses to apply when signed out, as an employer, or to a closed or missing job", async () => {
    const closed = await createTestJob(profile._id, { title: "Flow Closed Job", createdBy: employer.user._id, status: "Closed" });
    const agent = await signIn(student.email);

    expect((await request(app).post(`/api/applications/job/${job._id}`).send({})).status).toBe(401);
    expect((await request(app).post(`/api/applications/job/${job._id}`)
      .set("Cookie", `token=${employer.token}`).send({})).status).toBe(403);
    expect((await agent.post(`/api/applications/job/${closed._id}`).send({})).status).toBe(400);
    expect((await agent.post("/api/applications/job/64b000000000000000000000").send({})).status).toBe(404);

    expect(await Application.countDocuments({})).toBe(0);
  });
});
