const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const Internship = require("../../models/Internship");
const { createTestJob } = require("../helpers/createTestJob");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

describe("candidate-only role checks (S08)", () => {
  let candidate;
  let fresher;
  let employer;
  let companyAdmin;
  let superAdmin;
  let job;
  let internship;

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: "role-student@example.com" });
    fresher = await createUserWithToken({ email: "role-fresher@example.com", userType: "fresher" });
    employer = await createEmployerWithToken({ email: "role-employer@example.com" });
    // userType defaults to "student"; an admin role must still not count as a candidate.
    companyAdmin = await createUserWithToken({ email: "role-company-admin@example.com", role: "COMPANY_ADMIN" });
    superAdmin = await createUserWithToken({ email: "role-admin@example.com", role: "SUPER_ADMIN", userType: "admin" });

    const profile = await EmployerProfile.create({
      userId: employer.user._id,
      companyName: "Role Co",
      industry: "Technology",
    });
    job = await createTestJob(profile._id, { createdBy: employer.user._id, employerId: profile._id });
    internship = await Internship.create({
      title: "Role Internship",
      location: "Remote",
      description: "Role checks",
      employerId: profile._id,
      createdBy: employer.user._id,
      status: "Published",
    });
  });

  const applyJob = (identity, body = {}) =>
    request(app).post(`/api/applications/job/${job._id}`).set(auth(identity)).send(body);
  const applyInternship = (identity, body = {}) =>
    request(app).post(`/api/applications/internship/${internship._id}`).set(auth(identity)).send(body);

  describe("applying", () => {
    it.each([
      ["employer", () => employer],
      ["company admin", () => companyAdmin],
      ["super admin", () => superAdmin],
    ])("returns 403 when a %s applies to a job or internship", async (_label, who) => {
      for (const res of [await applyJob(who()), await applyInternship(who())]) {
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Only candidates can apply");
      }
      expect(await Application.countDocuments()).toBe(0);
    });

    it("still lets candidates apply to jobs and internships", async () => {
      const jobApply = await applyJob(candidate);
      const internshipApply = await applyInternship(fresher);

      expect(jobApply.status).toBe(201);
      expect(internshipApply.status).toBe(201);
      expect(String(jobApply.body.application.candidateId)).toBe(String(candidate.user._id));
      expect(String(internshipApply.body.application.candidateId)).toBe(String(fresher.user._id));
    });
  });

  describe("other candidate-only actions", () => {
    it("rejects employers from the student area", async () => {
      const paths = [
        ["get", "/api/student/dashboard"],
        ["get", "/api/student/profile"],
        ["post", "/api/student/save"],
        ["get", "/api/profile/student/me"],
      ];
      for (const [method, path] of paths) {
        const res = await request(app)[method](path).set(auth(employer)).send({ opportunityId: String(job._id) });
        expect(res.status).toBe(403);
      }
      expect((await request(app).get("/api/student/dashboard").set(auth(superAdmin))).status).toBe(403);
    });

    it("rejects employers from my applications and withdraw", async () => {
      const applied = await applyJob(candidate);
      const applicationId = applied.body.application._id;

      expect((await request(app).get("/api/applications/me").set(auth(employer))).status).toBe(403);
      expect((await request(app).get("/api/applications/me/applied-ids").set(auth(employer))).status).toBe(403);
      const withdraw = await request(app).patch(`/api/applications/${applicationId}/withdraw`).set(auth(employer));
      expect(withdraw.status).toBe(403);
      expect((await Application.findById(applicationId).lean()).status).toBe("Applied");
    });

    it("keeps candidate access to their own applications", async () => {
      await applyJob(candidate);
      const mine = await request(app).get("/api/applications/me").set(auth(candidate));
      expect(mine.status).toBe(200);
      const dashboard = await request(app).get("/api/student/dashboard").set(auth(candidate));
      expect(dashboard.status).toBe(200);
    });
  });

  describe("fresher and professional areas", () => {
    it("returns 403 for an admin with a leftover userType of fresher", async () => {
      const admin = await createUserWithToken({ email: "role-admin-fresher@example.com", role: "admin", userType: "fresher" });

      const res = await request(app).get("/api/fresher/profile").set(auth(admin));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("CANDIDATE_ONLY");
    });

    it("returns 403 for an admin with a leftover userType of professional", async () => {
      const admin = await createUserWithToken({
        email: "role-admin-professional@example.com",
        role: "SUPER_ADMIN",
        userType: "professional",
      });

      const res = await request(app).get("/api/professional/profile").set(auth(admin));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("CANDIDATE_ONLY");
    });

    it("still admits the matching candidate type only", async () => {
      const professional = await createUserWithToken({ email: "role-pro@example.com", userType: "professional" });

      expect((await request(app).get("/api/fresher/profile").set(auth(fresher))).status).not.toBe(403);
      expect((await request(app).get("/api/professional/profile").set(auth(professional))).status).not.toBe(403);
      expect((await request(app).get("/api/fresher/profile").set(auth(candidate))).status).toBe(403);
    });
  });

  describe("retired POST /api/student/apply", () => {
    it("cannot create an application for another user or with a body email", async () => {
      const res = await request(app)
        .post("/api/student/apply")
        .set(auth(candidate))
        .send({
          jobId: String(job._id),
          candidateId: String(fresher.user._id),
          email: "someone-else@example.com",
          title: "Fake title",
          company: "Fake company",
        });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/\/api\/applications/);
      expect(await Application.countDocuments()).toBe(0);
    });

    it("gives no fake success for scraped or external ids", async () => {
      const res = await request(app)
        .post("/api/student/apply")
        .set(auth(candidate))
        .send({ opportunityId: "scraped-linkedin-123", title: "Scraped job", company: "Somewhere" });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body).not.toHaveProperty("application");
      expect(await Application.countDocuments()).toBe(0);
    });

    it("is not reachable by employers", async () => {
      const res = await request(app).post("/api/student/apply").set(auth(employer)).send({ jobId: String(job._id) });
      expect(res.status).toBe(403);
    });
  });
});
