const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Company = require("../../models/Company");
const OrganizationRequest = require("../../models/OrganizationRequest");
const { createUserWithToken } = require("../helpers/createTestUser");

const createSuperAdmin = () =>
  createUserWithToken({ email: "root@careerconnect.test", role: "SUPER_ADMIN", userType: "admin" });

const createOrgRequest = (overrides = {}) =>
  OrganizationRequest.create({
    organizationName: "Acme Labs",
    officialEmail: "hr@acme.test",
    website: "https://acme.test",
    contactPerson: "Asha Rao",
    designation: "HR Manager",
    ...overrides,
  });

const approve = (token, id) =>
  request(app).patch(`/api/admin/organization-requests/${id}/approve`).set("Authorization", `Bearer ${token}`);

describe("organization approval (ADM-01, ADM-02, ADM-13, ADM-14)", () => {
  it("creates a new Company Admin with an activation link for a new email", async () => {
    const admin = await createSuperAdmin();
    const orgRequest = await createOrgRequest();

    const res = await approve(admin.token, orgRequest._id);

    expect(res.statusCode).toBe(200);
    const created = await User.findOne({ email: "hr@acme.test" });
    expect(created.role).toBe("COMPANY_ADMIN");
    expect(created.hasPassword).toBe(false);
    expect(res.body.invitationToken).toBeTruthy();
  });

  it("refuses to approve when the email belongs to an existing student, and leaves the account unchanged", async () => {
    const admin = await createSuperAdmin();
    const student = await createUserWithToken({ email: "student@acme.test" });
    const orgRequest = await createOrgRequest({ officialEmail: "student@acme.test" });

    const res = await approve(admin.token, orgRequest._id);

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("EMAIL_ALREADY_REGISTERED");
    const unchanged = await User.findById(student.user._id).select("+invitationToken");
    expect(unchanged.role).toBe("user");
    expect(unchanged.invitationToken).toBeFalsy();
    expect(await Company.countDocuments({ name: "Acme Labs" })).toBe(0);
    expect((await OrganizationRequest.findById(orgRequest._id)).status).toBe("PENDING");
  });

  it("never demotes a Super Admin through an organization request", async () => {
    const admin = await createSuperAdmin();
    const orgRequest = await createOrgRequest({ officialEmail: "root@careerconnect.test" });

    const res = await approve(admin.token, orgRequest._id);

    expect(res.statusCode).toBe(409);
    expect((await User.findById(admin.user._id)).role).toBe("SUPER_ADMIN");
  });

  it("refuses to approve a rejected request", async () => {
    const admin = await createSuperAdmin();
    const orgRequest = await createOrgRequest({ status: "REJECTED" });

    const res = await approve(admin.token, orgRequest._id);

    expect(res.statusCode).toBe(400);
    expect(await User.countDocuments({ email: "hr@acme.test" })).toBe(0);
  });

  it("does not attach the requester to another company through a wildcard name", async () => {
    const admin = await createSuperAdmin();
    const existing = await Company.create({ name: "Google", email: "contact@google.test", status: "active" });
    const orgRequest = await createOrgRequest({ organizationName: ".*" });

    const res = await approve(admin.token, orgRequest._id);

    expect(res.statusCode).toBe(200);
    expect(String(res.body.company._id)).not.toBe(String(existing._id));
    expect(res.body.company.name).toBe(".*");
  });
});

describe("admin activation link (ADM-01)", () => {
  it("does not replace the password of an account that is already active", async () => {
    const active = await createUserWithToken({
      email: "active-admin@acme.test",
      role: "COMPANY_ADMIN",
      userType: "admin",
      password: "Original@123",
    });
    await User.updateOne(
      { _id: active.user._id },
      { invitationToken: "reused-token", invitationExpires: new Date(Date.now() + 60_000), hasPassword: true, status: "active" }
    );

    const res = await request(app)
      .post("/api/admin/activate")
      .send({ token: "reused-token", password: "Hijacked@123", confirmPassword: "Hijacked@123" });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("ALREADY_ACTIVATED");
    const user = await User.findById(active.user._id).select("+password");
    expect(await user.comparePassword("Original@123")).toBe(true);
  });
});
