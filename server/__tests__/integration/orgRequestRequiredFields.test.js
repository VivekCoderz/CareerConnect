const request = require("supertest");
const app = require("../../app");
const Company = require("../../models/Company");
const EmployerProfile = require("../../models/EmployerProfile");
const OrganizationRequest = require("../../models/OrganizationRequest");
const { createEmployerWithToken, createUserWithToken } = require("../helpers/createTestUser");

// Industry and company size must come from the person submitting the request:
// the server never fills them in with "Information Technology" / "11-50".
const validBody = (overrides = {}) => ({
  companyName: "Fakeco Testing Pvt Ltd",
  officialCompanyEmail: "hr@fakeco-testing.test",
  companyWebsite: "https://fakeco-testing.test",
  industry: "Fake Test Industry",
  companySize: "51-200",
  verificationDocument: "https://fakeco-testing.test/fake-registration.pdf",
  requestingEmployeeName: "Test Person Fake",
  employeeDesignation: "Fake HR Tester",
  officialEmployeeEmail: "test.person@fakeco-testing.test",
  ...overrides,
});

describe("POST /api/employer/request-company-approval requires industry and company size", () => {
  let employer;

  beforeEach(async () => {
    employer = await createEmployerWithToken({ email: `fake.employer.${Date.now()}@fakeco-testing.test` });
  });

  const submit = (body) =>
    request(app)
      .post("/api/employer/request-company-approval")
      .set("Authorization", `Bearer ${employer.token}`)
      .send(body);

  const expectNothingSaved = async () => {
    expect(await OrganizationRequest.countDocuments({})).toBe(0);
    expect(await EmployerProfile.countDocuments({ userId: employer.user._id })).toBe(0);
  };

  it.each([
    ["missing", { industry: undefined }],
    ["empty", { industry: "" }],
    ["blank", { industry: "   " }],
  ])("%s industry -> 400 and nothing saved", async (_label, overrides) => {
    const res = await submit(validBody(overrides));
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/^Industry is required/);
    await expectNothingSaved();
  });

  it.each([
    ["missing", { companySize: undefined }],
    ["empty", { companySize: "" }],
    ["blank", { companySize: "   " }],
  ])("%s company size -> 400 and nothing saved", async (_label, overrides) => {
    const res = await submit(validBody(overrides));
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/^Company size is required/);
    await expectNothingSaved();
  });

  it.each(["999-fake", "11 - 50", "10000", "large"])("invalid company size %p -> 400 and nothing saved", async (size) => {
    const res = await submit(validBody({ companySize: size }));
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/^Company size must be one of: 1-10, 11-50, 51-200, 201-500, 500\+/);
    await expectNothingSaved();
  });

  it("valid request is saved with exactly the submitted industry and size", async () => {
    const res = await submit(validBody());
    expect(res.statusCode).toBe(201);

    const saved = await OrganizationRequest.find({}).lean();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      organizationName: "Fakeco Testing Pvt Ltd",
      industry: "Fake Test Industry",
      companySize: "51-200",
      status: "PENDING",
    });
    const profile = await EmployerProfile.findOne({ userId: employer.user._id }).lean();
    expect(profile).toMatchObject({ industry: "Fake Test Industry", companySize: "51-200" });
  });

  it("accepts the employer profile's en-dash size and stores the form's hyphen form", async () => {
    const res = await submit(validBody({ companySize: "201–500" }));
    expect(res.statusCode).toBe(201);
    expect((await OrganizationRequest.findOne({}).lean()).companySize).toBe("201-500");
  });

  it("a resubmitted rejected request also needs industry and size, and keeps the old values on 400", async () => {
    await OrganizationRequest.create({
      organizationName: "Fakeco Testing Pvt Ltd",
      officialEmail: "hr@fakeco-testing.test",
      website: "https://fakeco-testing.test",
      contactPerson: "Test Person Fake",
      designation: "Fake HR Tester",
      industry: "Old Fake Industry",
      companySize: "1-10",
      requestedBy: employer.user._id,
      status: "REJECTED",
    });

    const res = await submit(validBody({ industry: "" }));
    expect(res.statusCode).toBe(400);
    const stored = await OrganizationRequest.findOne({}).lean();
    expect(stored).toMatchObject({ industry: "Old Fake Industry", companySize: "1-10", status: "REJECTED" });
  });

  it("the status endpoint does not prefill a fake industry or size", async () => {
    const res = await request(app)
      .get("/api/employer/organization-status")
      .set("Authorization", `Bearer ${employer.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.prefill).toMatchObject({ industry: "", companySize: "" });
  });
});

describe("other organization/company create paths do not invent an industry or size", () => {
  it("public organization access request stores no industry or size", async () => {
    const res = await request(app).post("/api/organizations/request-access").send({
      organizationName: "Fakeorg Public Testing",
      officialEmail: "contact@fakeorg-public.test",
      website: "https://fakeorg-public.test",
      contactPerson: "Fake Public Contact",
      designation: "Fake Director",
      phone: "9000000000",
      address: "1 Fake Test Street",
      city: "Faketown",
      state: "Fakestate",
      reason: "Fake test reason",
    });
    expect(res.statusCode).toBe(201);
    const saved = await OrganizationRequest.findById(res.body.request._id).lean();
    expect(saved.industry).toBe("");
    expect(saved.companySize).toBe("");
  });

  it("approving a request without an industry creates a company without one", async () => {
    const admin = await createUserWithToken({ email: "root@fake-admin.test", role: "SUPER_ADMIN", userType: "admin" });
    const orgRequest = await OrganizationRequest.create({
      organizationName: "Fakeorg Approval Testing",
      officialEmail: "admin@fakeorg-approval.test",
      website: "https://fakeorg-approval.test",
      contactPerson: "Fake Approval Contact",
      designation: "Fake Manager",
    });

    const res = await request(app)
      .patch(`/api/admin/organization-requests/${orgRequest._id}/approve`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.statusCode).toBe(200);
    const company = await Company.findOne({ name: "Fakeorg Approval Testing" }).lean();
    expect(company.industry).toBe("");
  });

  it("super admin company create without industry stores none", async () => {
    const admin = await createUserWithToken({ email: "root2@fake-admin.test", role: "SUPER_ADMIN", userType: "admin" });
    const res = await request(app)
      .post("/api/admin/companies")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: "Fakeorg Admin Created" });
    expect(res.statusCode).toBe(201);
    const company = await Company.findOne({ name: "Fakeorg Admin Created" }).lean();
    expect(company.industry).toBe("");
  });
});
