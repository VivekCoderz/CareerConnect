const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const Application = require("../../models/Application");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");
const { isHttpUrl } = require("../../middleware/textFields");

const as = (token) => (method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

describe("non-text values in text fields return 400, not 500", () => {
  let admin;
  let employer;
  let job;

  beforeEach(async () => {
    admin = await createUserWithToken({ email: `root${Date.now()}@careerconnect.test`, role: "SUPER_ADMIN", userType: "admin" });
    employer = await createEmployerWithToken({ email: `hr${Date.now()}@acme.test` });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme", verificationStatus: "approved" });
    job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Pending Approval" });
  });

  it("ADM-22 / ADM-23: adminNote and rejectionReason must be text", async () => {
    const approve = await as(admin.token)("post", `/api/admin/opportunities/job/${job._id}/approve`).send({ adminNote: 5 });
    expect(approve.statusCode).toBe(400);
    expect(approve.body.field).toBe("adminNote");

    const reject = await as(admin.token)("post", `/api/admin/opportunities/job/${job._id}/reject`).send({ rejectionReason: 5 });
    expect(reject.statusCode).toBe(400);
    expect(reject.body.field).toBe("rejectionReason");
  });

  it("BUG-16: a job title sent as an array is refused", async () => {
    const res = await as(employer.token)("post", "/api/jobs").send({ title: ["MERN"], description: "x", location: "Delhi" });
    expect(res.statusCode).toBe(400);
    expect(res.body.field).toBe("title");
  });

  it("BUG-19: numeric remarks on select are refused", async () => {
    const candidate = await createUserWithToken({ email: `c${Date.now()}@student.test` });
    const application = await Application.create({
      candidateId: candidate.user._id, jobId: job._id, opportunityType: "Job", status: "Interview",
    });
    const res = await as(employer.token)("patch", `/api/applications/${application._id}/pipeline/select`).send({ remarks: 123 });
    expect(res.statusCode).toBe(400);
  });

  it("BUG-08: meeting links must be http(s)", async () => {
    const res = await as(employer.token)("post", "/api/interviews").send({ meetingLink: "javascript:alert(1)" });
    expect(res.statusCode).toBe(400);
    expect(res.body.field).toBe("meetingLink");
    expect(isHttpUrl("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
  });
});
