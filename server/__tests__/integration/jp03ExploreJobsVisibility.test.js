// JP-03: a student must see every published job, not just one of two.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));

const request = require("supertest");
const app = require("../../app");
const Job = require("../../models/Job");
const { createUserWithToken, createEmployerWithToken, createEmployerProfile } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");
const { clearSearchCache } = require("../../services/jobScraperService");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

const jobBody = (overrides = {}) => ({
  title: "Backend Developer",
  description: "Build and maintain Node.js APIs for our hiring platform.",
  employmentType: "Full-time",
  workMode: "On-site",
  location: "Pune, Maharashtra",
  city: "Pune",
  category: "Software Development",
  requiredSkills: ["Node.js"],
  openings: 1,
  ...overrides,
});

const titlesOf = (res) => (res.body.jobs || res.body.data || []).map((j) => j.title).sort();
const feedJobTitles = (res) =>
  (res.body.data || []).filter((o) => o.type === "job" && !o.isExternal).map((o) => o.title).sort();

describe("JP-03: both created jobs are visible to students", () => {
  let employer, admin, student;

  beforeEach(async () => {
    // The feed cache is in memory and outlives the per-test database wipe.
    clearSearchCache();
    employer = await createEmployerWithToken({ email: `jp03-emp-${Date.now()}@test.com` });
    await createEmployerProfile(employer.user._id);
    admin = await createUserWithToken({ email: `jp03-admin-${Date.now()}@test.com`, role: "SUPER_ADMIN", userType: "admin" });
    student = await createUserWithToken({ email: `jp03-stu-${Date.now()}@test.com` });
  });

  const postAndApprove = async (body) => {
    const created = await as(employer.token, "post", "/api/jobs").send(body);
    expect(created.statusCode).toBe(201);
    expect(created.body.job.status).toBe("Pending Approval");
    const approved = await as(admin.token, "post", `/api/admin/opportunities/job/${created.body.job._id}/approve`);
    expect(approved.statusCode).toBe(200);
    return created.body.job._id;
  };

  it("saves both jobs and lists both on Explore Jobs (/api/jobs)", async () => {
    await postAndApprove(jobBody({ title: "Backend Developer" }));
    await postAndApprove(jobBody({ title: "Frontend Developer", workMode: "Remote" }));

    expect(await Job.countDocuments({ status: "Published" })).toBe(2);

    const res = await as(student.token, "get", "/api/jobs?sort=latest&page=1&limit=10");
    expect(res.statusCode).toBe(200);
    expect(titlesOf(res)).toEqual(["Backend Developer", "Frontend Developer"]);
    expect(res.body.pagination).toMatchObject({ total: 2, totalPages: 1 });

    // A refresh returns the same two.
    const again = await as(student.token, "get", "/api/jobs?sort=latest&page=1&limit=10");
    expect(titlesOf(again)).toEqual(["Backend Developer", "Frontend Developer"]);
  });

  it("shows a job approved after the feed was loaded (opportunities feed cache)", async () => {
    await postAndApprove(jobBody({ title: "Backend Developer" }));

    // Job #2 is created (pending) and the student loads the feed while it is still pending.
    const created = await as(employer.token, "post", "/api/jobs").send(jobBody({ title: "Frontend Developer" }));
    const before = await as(student.token, "get", "/api/opportunities?opportunityType=job");
    expect(feedJobTitles(before)).toEqual(["Backend Developer"]);

    // The admin approves job #2: the student's next load must include it.
    const approved = await as(admin.token, "post", `/api/admin/opportunities/job/${created.body.job._id}/approve`);
    expect(approved.statusCode).toBe(200);
    const after = await as(student.token, "get", "/api/opportunities?opportunityType=job");
    expect(feedJobTitles(after)).toEqual(["Backend Developer", "Frontend Developer"]);
  });

  it("drops a job from the feed once an admin rejects, closes or unpublishes it", async () => {
    const ids = await Promise.all([
      createTestJob(employer.user._id, { title: "Rejected Role" }),
      createTestJob(employer.user._id, { title: "Closed Role" }),
      createTestJob(employer.user._id, { title: "Paused Role" }),
    ]).then((jobs) => jobs.map((j) => j._id));
    const warm = await as(student.token, "get", "/api/opportunities?opportunityType=job");
    expect(feedJobTitles(warm)).toEqual(["Closed Role", "Paused Role", "Rejected Role"]);

    const rejected = await as(admin.token, "post", `/api/admin/opportunities/job/${ids[0]}/reject`)
      .send({ rejectionReason: "Duplicate listing" });
    const closed = await as(admin.token, "patch", `/api/admin/opportunities/job/${ids[1]}/close`);
    const paused = await as(admin.token, "patch", `/api/admin/opportunities/job/${ids[2]}/status`).send({ status: "Paused" });
    expect([rejected.statusCode, closed.statusCode, paused.statusCode]).toEqual([200, 200, 200]);

    const after = await as(student.token, "get", "/api/opportunities?opportunityType=job");
    expect(feedJobTitles(after)).toEqual([]);
  });

  it("paginates every eligible job exactly once", async () => {
    for (let i = 0; i < 23; i++) {
      await createTestJob(employer.user._id, { title: `Role ${String(i).padStart(2, "0")}`, createdAt: new Date(Date.now() - i * 1000) });
    }
    const seen = [];
    for (let page = 1; page <= 3; page++) {
      const res = await request(app).get(`/api/jobs?sort=latest&page=${page}&limit=10`);
      expect(res.body.pagination).toMatchObject({ total: 23, totalPages: 3, page });
      seen.push(...titlesOf(res));
    }
    expect(seen).toHaveLength(23);
    expect(new Set(seen).size).toBe(23);
  });

  it("only lists Published jobs that are not past their deadline", async () => {
    for (const status of ["Published", "Draft", "Pending Approval", "Rejected", "Paused", "Closed"]) {
      await createTestJob(employer.user._id, { title: `${status} Role`, status });
    }
    await createTestJob(employer.user._id, { title: "Expired Role", deadline: new Date("2020-01-01") });

    const res = await request(app).get("/api/jobs");
    expect(titlesOf(res)).toEqual(["Published Role"]);
  });

  it("filters by work mode using the stored values, and clearing the filter restores all", async () => {
    await createTestJob(employer.user._id, { title: "Office Role", workMode: "On-site" });
    await createTestJob(employer.user._id, { title: "Home Role", workMode: "Remote" });

    expect(titlesOf(await request(app).get("/api/jobs?workMode=On-site"))).toEqual(["Office Role"]);
    expect(titlesOf(await request(app).get("/api/jobs?workMode=Remote"))).toEqual(["Home Role"]);
    expect(titlesOf(await request(app).get("/api/jobs"))).toEqual(["Home Role", "Office Role"]);
  });
});
