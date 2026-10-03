const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const User = require("../../models/User");
const { issueOtp, verifyOtp } = require("../../services/otpService");
const { updatePlatformSettings } = require("../../services/platformSettings");
const { approveLegacyEmployers } = require("../../scripts/approve-existing-employers");
const {
  createEmployerWithToken,
  createUserWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");

const AWAITING = "Your company is awaiting verification";
const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

const jobPayload = (overrides = {}) => ({
  title: "Verified Backend Developer",
  location: "Bangalore",
  description: "Build APIs.",
  ...overrides,
});
const internshipPayload = (overrides = {}) => ({
  title: "Verified Design Intern",
  location: "Remote",
  description: "Design things.",
  ...overrides,
});

describe("employer verification (S04)", () => {
  let employer;
  let admin;
  let companyAdmin;

  beforeEach(async () => {
    employer = await createEmployerWithToken({ email: "verify-employer@example.com" });
    admin = await createUserWithToken({
      email: "verify-admin@example.com",
      role: "SUPER_ADMIN",
      userType: "admin",
    });
    companyAdmin = await createUserWithToken({
      email: "verify-company-admin@example.com",
      role: "COMPANY_ADMIN",
      userType: "admin",
      companyId: new mongoose.Types.ObjectId(),
    });
  });

  const postJob = (identity, overrides) =>
    request(app).post("/api/jobs").set(auth(identity)).send(jobPayload(overrides));
  const postInternship = (identity, overrides) =>
    request(app).post("/api/internships").set(auth(identity)).send(internshipPayload(overrides));
  const verify = (identity, profileId, body) =>
    request(app).patch(`/api/admin/employers/${profileId}/verification`).set(auth(identity)).send(body);

  describe("posting requires an approved employer", () => {
    it.each(["pending", "rejected"])("returns 403 for a %s employer's job and internship", async (status) => {
      await createEmployerProfile(employer.user._id, { verificationStatus: status });

      for (const res of [await postJob(employer), await postInternship(employer)]) {
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(AWAITING);
      }
      expect(await Job.countDocuments()).toBe(0);
      expect(await Internship.countDocuments()).toBe(0);
    });

    it("returns 403 for an employer without a company profile", async () => {
      const res = await postJob(employer);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe(AWAITING);
    });

    it("lets an approved employer post, still pending moderation (S03)", async () => {
      await createEmployerProfile(employer.user._id);

      const job = await postJob(employer, { status: "Published" });
      const internship = await postInternship(employer, { status: "Published" });

      expect(job.status).toBe(201);
      expect(job.body.job.status).toBe("Pending Approval");
      expect(internship.status).toBe(201);
      expect(internship.body.internship.status).toBe("Pending Approval");
    });

    it("blocks duplicating and re-opening listings until approved, but allows pausing", async () => {
      const profile = await createEmployerProfile(employer.user._id);
      const created = (await postJob(employer)).body.job;
      await request(app).post(`/api/admin/opportunities/job/${created._id}/approve`).set(auth(admin)).send({});
      await EmployerProfile.updateOne({ _id: profile._id }, { verificationStatus: "pending" });
      const statusPath = `/api/jobs/${created._id}/status`;

      const dup = await request(app).post(`/api/jobs/${created._id}/duplicate`).set(auth(employer));
      expect(dup.status).toBe(403);

      const paused = await request(app).patch(statusPath).set(auth(employer)).send({ status: "Paused" });
      expect(paused.status).toBe(200);

      const reopened = await request(app).patch(statusPath).set(auth(employer)).send({ status: "Published" });
      expect(reopened.status).toBe(403);
      expect(reopened.body.message).toBe(AWAITING);
      expect((await Job.findById(created._id).lean()).status).toBe("Paused");
    });
  });

  describe("autoApproveJobs", () => {
    beforeEach(() => updatePlatformSettings({ autoApproveJobs: true }));

    it("publishes new listings from approved employers automatically", async () => {
      await createEmployerProfile(employer.user._id);

      const job = await postJob(employer);
      const internship = await postInternship(employer);

      expect(job.body.job.status).toBe("Published");
      expect(internship.body.internship.status).toBe("Published");
      const stored = await Job.findById(job.body.job._id).lean();
      expect(stored.approvalMethod).toBe("auto");
      expect(stored.approvedAt).toBeTruthy();
      expect(stored.approvedBy).toBeNull();
      expect((await request(app).get(`/api/jobs/${stored._id}`)).status).toBe(200);
    });

    it("keeps an explicit draft as Draft", async () => {
      await createEmployerProfile(employer.user._id);
      expect((await postJob(employer, { status: "Draft" })).body.job.status).toBe("Draft");
    });

    it("never auto-publishes for a pending employer", async () => {
      await createEmployerProfile(employer.user._id, { verificationStatus: "pending" });

      expect((await postJob(employer)).status).toBe(403);
      expect((await postInternship(employer)).status).toBe(403);
      expect(await Job.countDocuments({ status: "Published" })).toBe(0);
    });
  });

  describe("employer registration", () => {
    let seq = 0;
    const register = async (overrides = {}) => {
      seq += 1;
      const email = `new-employer-${seq}@example.com`;
      const { code } = await issueOtp(email, "verification");
      const verificationToken = await verifyOtp(email, "verification", code);
      return request(app).post("/api/auth/register-employer").send({
        companyName: "Fresh Co",
        email,
        verificationToken,
        phone: `98765432${String(seq).padStart(2, "0")}`,
        password: "Password@123",
        confirmPassword: "Password@123",
        contactPerson: "Pat Recruiter",
        designation: "HR",
        companyType: "Private",
        industry: "Technology",
        location: "Pune",
        ...overrides,
      });
    };

    it("starts new employers as pending by default", async () => {
      const res = await register();
      expect(res.status).toBe(201);
      const profile = await EmployerProfile.findOne({ userId: res.body.user._id }).lean();
      expect(profile.verificationStatus).toBe("pending");
      expect(profile.verifiedAt).toBeNull();
    });

    it("returns 403 when employer registration is closed", async () => {
      await updatePlatformSettings({ allowEmployerRegistration: false });

      const res = await register();
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Employer registration is closed");
      expect(await User.countDocuments({ email: /new-employer/ })).toBe(0);
    });

    it("blocks the Google employer onboarding path when closed", async () => {
      await updatePlatformSettings({ allowEmployerRegistration: false });
      const googleUser = await createUserWithToken({ email: "google-new@example.com" });

      const res = await request(app)
        .post("/api/auth/complete-employer-google-onboarding")
        .set(auth(googleUser))
        .send({ phone: "9876500000", companyName: "G Co", contactPerson: "G", designation: "HR", industry: "IT", location: "Delhi" });
      expect(res.status).toBe(403);
      expect(await EmployerProfile.countDocuments({ userId: googleUser.user._id })).toBe(0);
    });

    it("approves new employers when autoApproveEmployers is on", async () => {
      await updatePlatformSettings({ autoApproveEmployers: true });

      const res = await register();
      expect(res.status).toBe(201);
      const profile = await EmployerProfile.findOne({ userId: res.body.user._id }).lean();
      expect(profile.verificationStatus).toBe("approved");
      expect(profile.verifiedAt).toBeTruthy();
    });
  });

  describe("admin verification endpoint", () => {
    let profile;
    beforeEach(async () => {
      profile = await createEmployerProfile(employer.user._id, { verificationStatus: "pending", companyName: "Waiting Co" });
    });

    it("approves an employer, who can then post", async () => {
      const res = await verify(admin, profile._id, { status: "approved" });

      expect(res.status).toBe(200);
      const stored = await EmployerProfile.findById(profile._id).lean();
      expect(stored.verificationStatus).toBe("approved");
      expect(String(stored.verifiedBy)).toBe(String(admin.user._id));
      expect(stored.verifiedAt).toBeTruthy();
      expect((await postJob(employer)).status).toBe(201);
    });

    it("rejects an employer with a reason, who then cannot post", async () => {
      const res = await verify(admin, profile._id, { status: "rejected", reason: "Could not verify company" });

      expect(res.status).toBe(200);
      const stored = await EmployerProfile.findById(profile._id).lean();
      expect(stored.verificationStatus).toBe("rejected");
      expect(stored.rejectionReason).toBe("Could not verify company");
      expect((await postJob(employer)).status).toBe(403);
    });

    it("validates the requested status", async () => {
      expect((await verify(admin, profile._id, { status: "pending" })).status).toBe(400);
      expect((await verify(admin, new mongoose.Types.ObjectId(), { status: "approved" })).status).toBe(404);
    });

    it("cannot be called by the employer or a company admin", async () => {
      expect((await verify(employer, profile._id, { status: "approved" })).status).toBe(403);
      expect((await verify(companyAdmin, profile._id, { status: "approved" })).status).toBe(403);
      expect((await EmployerProfile.findById(profile._id).lean()).verificationStatus).toBe("pending");
    });

    it("lists employers with their verification status and filters pending ones", async () => {
      const other = await createEmployerWithToken({ email: "verify-other@example.com" });
      await createEmployerProfile(other.user._id, { companyName: "Approved Co" });

      const all = await request(app).get("/api/admin/employers").set(auth(admin));
      expect(all.status).toBe(200);
      const statuses = Object.fromEntries(all.body.data.employers.map((e) => [e.companyName, e.verificationStatus]));
      expect(statuses).toEqual({ "Waiting Co": "pending", "Approved Co": "approved" });
      expect(all.body.data.stats).toMatchObject({ total: 2, verified: 1, pending: 1, rejected: 0 });

      const pending = await request(app).get("/api/admin/employers?status=pending").set(auth(admin));
      expect(pending.body.data.employers.map((e) => e.companyName)).toEqual(["Waiting Co"]);
    });
  });

  describe("platform settings", () => {
    const putSettings = (identity, body) => request(app).put("/api/admin/settings").set(auth(identity)).send(body);

    it("cannot be changed by a company admin or an employer", async () => {
      expect((await putSettings(companyAdmin, { autoApproveJobs: true })).status).toBe(403);
      expect((await putSettings(employer, { autoApproveJobs: true })).status).toBe(403);

      const res = await request(app).get("/api/admin/settings").set(auth(admin));
      expect(res.body.settings.autoApproveJobs).toBe(false);
    });

    it("are saved by a platform admin and validated", async () => {
      const saved = await putSettings(admin, { autoApproveEmployers: true, unknownKey: "ignored" });
      expect(saved.status).toBe(200);

      const res = await request(app).get("/api/admin/settings").set(auth(admin));
      expect(res.body.settings).toMatchObject({ autoApproveEmployers: true, allowEmployerRegistration: true });
      expect(res.body.settings).not.toHaveProperty("unknownKey");
      expect((await putSettings(admin, { maintenanceMode: "yes" })).status).toBe(400);
    });

    it("maintenanceMode blocks non-admin writes with 503 but not reads or admin writes", async () => {
      await createEmployerProfile(employer.user._id);
      await updatePlatformSettings({ maintenanceMode: true });

      expect((await postJob(employer)).status).toBe(503);
      expect((await request(app).get("/api/jobs?source=campus")).status).toBe(200);
      expect((await putSettings(admin, { maintenanceMode: false })).status).toBe(200);
      expect((await postJob(employer)).status).toBe(201);
    });
  });

  describe("approve-existing-employers script", () => {
    it("dry-runs by default and only approves profiles without a stored status", async () => {
      const legacyUser = await createEmployerWithToken({ email: "legacy@example.com" });
      await EmployerProfile.collection.insertOne({ userId: legacyUser.user._id, companyName: "Legacy Co" });
      const pendingProfile = await createEmployerProfile(employer.user._id, { verificationStatus: "pending" });
      const log = () => {};

      expect(await approveLegacyEmployers({ log })).toMatchObject({ matched: 1, approved: 0 });
      expect(await EmployerProfile.collection.findOne({ companyName: "Legacy Co" })).not.toHaveProperty("verificationStatus");

      expect(await approveLegacyEmployers({ apply: true, log })).toMatchObject({ matched: 1, approved: 1 });
      expect((await EmployerProfile.findOne({ companyName: "Legacy Co" }).lean()).verificationStatus).toBe("approved");
      expect((await EmployerProfile.findById(pendingProfile._id).lean()).verificationStatus).toBe("pending");
    });
  });
});
