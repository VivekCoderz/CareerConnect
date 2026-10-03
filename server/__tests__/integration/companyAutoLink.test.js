const request = require("supertest");
const app = require("../../app");
const Company = require("../../models/Company");
const EmployerProfile = require("../../models/EmployerProfile");
const User = require("../../models/User");
const { createEmployerWithToken } = require("../helpers/createTestUser");

// An employer must not join another company just by using its name or email:
// company membership gives access to that company's listings and applicants.
describe("employers are never linked to a company automatically", () => {
  let company;
  let employer;

  beforeEach(async () => {
    company = await Company.create({ name: "Acme Labs", email: "hr@acme.test", status: "active" });
    employer = await createEmployerWithToken({ email: `intruder${Date.now()}@other.test` });
    await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme Labs", officialEmail: "hr@acme.test" });
  });

  it("the dashboard does not link by matching company name or email", async () => {
    const res = await request(app).get("/api/employer/dashboard").set("Authorization", `Bearer ${employer.token}`);
    expect(res.statusCode).toBe(200);
    expect((await User.findById(employer.user._id).lean()).companyId ?? null).toBeNull();
  });

  it("a connection request for an existing company is refused, not auto-approved", async () => {
    const res = await request(app)
      .post("/api/employer/request-company-approval")
      .set("Authorization", `Bearer ${employer.token}`)
      .send({
        companyName: "acme labs", officialCompanyEmail: "hr@acme.test", companyWebsite: "https://acme.test",
        industry: "IT", companySize: "11-50", verificationDocument: "https://acme.test/doc.pdf",
        requestingEmployeeName: "Intruder", employeeDesignation: "HR", officialEmployeeEmail: "x@other.test",
      });
    expect(res.statusCode).toBe(409);
    expect(res.body.status).toBe("COMPANY_EXISTS");
    expect((await User.findById(employer.user._id).lean()).companyId ?? null).toBeNull();
    expect(String(company._id)).toBeTruthy();
  });
});
