const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const Job = require("../../models/Job");
const Company = require("../../models/Company");
const { createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

const setup = async () => {
  const company = await Company.create({ name: "Acme Labs", email: "hr@acme.test", status: "active" });
  const superAdmin = await createUserWithToken({ email: "root@careerconnect.test", role: "SUPER_ADMIN", userType: "admin" });
  const companyAdmin = await createUserWithToken({
    email: "admin@acme.test",
    role: "COMPANY_ADMIN",
    userType: "admin",
    companyId: company._id,
  });
  const pendingJob = await createTestJob(null, { status: "Pending Approval", companyId: company._id });
  return { company, superAdmin, companyAdmin, pendingJob };
};

describe("admin login (ADM-03, ADM-15)", () => {
  it("keeps an admin signed in after a password reset (token carries authVersion)", async () => {
    const admin = await createUserWithToken({
      email: "reset-admin@careerconnect.test",
      role: "SUPER_ADMIN",
      userType: "admin",
      password: "Admin@1234",
    });
    await User.updateOne({ _id: admin.user._id }, { authVersion: 3 });

    const login = await request(app).post("/api/admin/login").send({ email: "reset-admin@careerconnect.test", password: "Admin@1234" });
    expect(login.statusCode).toBe(200);

    const me = await as(login.body.token, "get", "/api/admin/me");
    expect(me.statusCode).toBe(200);
  });

  it("does not reveal that an account is deactivated when the password is wrong", async () => {
    const admin = await createUserWithToken({
      email: "off-admin@careerconnect.test",
      role: "SUPER_ADMIN",
      userType: "admin",
      password: "Admin@1234",
    });
    await User.updateOne({ _id: admin.user._id }, { isActive: false });

    const res = await request(app).post("/api/admin/login").send({ email: "off-admin@careerconnect.test", password: "Wrong@1234" });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});

describe("platform-level moderation (ADM-05, ADM-08, ADM-09, ADM-10, ADM-16)", () => {
  it("lets only a Super Admin approve, and only listings that are pending", async () => {
    const { superAdmin, companyAdmin, pendingJob } = await setup();
    const path = `/api/admin/opportunities/job/${pendingJob._id}/approve`;

    expect((await as(companyAdmin.token, "post", path)).statusCode).toBe(403);
    expect((await as(superAdmin.token, "post", path)).statusCode).toBe(200);
    expect((await Job.findById(pendingJob._id)).status).toBe("Published");

    const draft = await createTestJob(null, { status: "Draft" });
    const draftRes = await as(superAdmin.token, "post", `/api/admin/opportunities/job/${draft._id}/approve`);
    expect(draftRes.statusCode).toBe(400);
    expect((await Job.findById(draft._id)).status).toBe("Draft");
  });

  it("does not let a Company Admin publish through the status endpoint", async () => {
    const { companyAdmin, pendingJob } = await setup();

    const res = await as(companyAdmin.token, "patch", `/api/admin/opportunities/job/${pendingJob._id}/status`).send({ status: "Published" });

    expect(res.statusCode).toBe(403);
    expect((await Job.findById(pendingJob._id)).status).toBe("Pending Approval");
  });

  it("rejects a status change without a valid status", async () => {
    const { superAdmin, pendingJob } = await setup();
    const path = `/api/admin/opportunities/job/${pendingJob._id}/status`;

    expect((await as(superAdmin.token, "patch", path).send({})).statusCode).toBe(400);
    expect((await as(superAdmin.token, "patch", path).send({ status: "Banana" })).statusCode).toBe(400);
  });

  it("lets only a Super Admin feature a listing, including another company's", async () => {
    const { superAdmin, companyAdmin } = await setup();
    const otherCompany = await Company.create({ name: "Other Co", email: "hr@other.test", status: "active" });
    const otherJob = await createTestJob(null, { status: "Published", companyId: otherCompany._id });
    const path = `/api/admin/opportunities/job/${otherJob._id}/feature`;

    expect((await as(companyAdmin.token, "patch", path).send({ isFeatured: true })).statusCode).toBe(403);
    expect((await Job.findById(otherJob._id)).isFeatured).not.toBe(true);
    expect((await as(superAdmin.token, "patch", path).send({ isFeatured: true })).statusCode).toBe(200);
  });

  it("does not publish or feature a listing through the edit form", async () => {
    const { superAdmin, pendingJob } = await setup();

    const res = await as(superAdmin.token, "put", `/api/admin/opportunities/job/${pendingJob._id}`)
      .send({ title: "Edited title", status: "Published", isFeatured: true });

    expect(res.statusCode).toBe(200);
    const job = await Job.findById(pendingJob._id);
    expect(job.title).toBe("Edited title");
    expect(job.status).toBe("Pending Approval");
    expect(job.isFeatured).not.toBe(true);
  });
});
