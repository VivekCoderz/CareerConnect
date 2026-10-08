// Admin > Applications page reads data.applications, data.stats and data.pagination.
// The API used to return only top-level fields, so the page crashed on load.
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue({ messageId: "test-message" }));
const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

const seed = async () => {
  const employer = await createEmployerWithToken({
    email: `${uniq("hr")}@employer.test`,
    phone: `8${String(Date.now() + ++seq).slice(-9)}`,
  });
  const profile = await createEmployerProfile(employer.user._id, { companyName: "Fake Admin List Co" });
  const job = await createTestJob(profile._id, { createdBy: employer.user._id });
  const apply = async (status) => {
    const candidate = await createUserWithToken({
      email: `${uniq("cand")}@candidate.test`,
      phone: `7${String(Date.now() + ++seq).slice(-9)}`,
    });
    return Application.create({
      candidateId: candidate.user._id,
      jobId: job._id,
      employerId: profile._id,
      opportunityType: "Job",
      opportunityTitle: job.title,
      companyName: "Fake Admin List Co",
      status,
    });
  };
  await apply("Applied");
  await apply("Shortlisted");
  await apply("Interview Scheduled");
  await apply("Rejected");
  await apply("Hired");
};

describe("GET /api/admin/applications", () => {
  let superAdmin;
  beforeEach(async () => {
    await Application.deleteMany({});
    superAdmin = await createUserWithToken({ email: `${uniq("root")}@platform.test`, role: "SUPER_ADMIN", userType: "admin" });
    await seed();
  });

  it("returns the shape the admin page reads, with stage counts", async () => {
    const res = await as(superAdmin.token, "get", "/api/admin/applications?page=1&limit=12");
    expect(res.status).toBe(200);
    expect(res.body.data.applications).toHaveLength(5);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 12, total: 5, pages: 1 });
    expect(res.body.data.stats).toMatchObject({ total: 5, applied: 1, shortlisted: 1, interview: 1, hired: 1, rejected: 1 });
    // Older top-level fields stay for existing callers.
    expect(res.body.total).toBe(5);
  });

  it("filters by stage but keeps the stage cards for the whole list", async () => {
    const res = await as(superAdmin.token, "get", "/api/admin/applications?status=Shortlisted");
    expect(res.status).toBe(200);
    expect(res.body.data.applications.map((a) => a.status)).toEqual(["Shortlisted"]);
    expect(res.body.data.stats.total).toBe(5);
  });

  it("filters by type", async () => {
    const jobs = await as(superAdmin.token, "get", "/api/admin/applications?type=Job");
    expect(jobs.body.data.applications).toHaveLength(5);
    const internships = await as(superAdmin.token, "get", "/api/admin/applications?type=Internship");
    expect(internships.status).toBe(200);
    expect(internships.body.data.applications).toHaveLength(0);
    expect(internships.body.data.stats.total).toBe(0);
  });
});
