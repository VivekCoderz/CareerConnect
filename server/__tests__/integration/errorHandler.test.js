const request = require("supertest");
const app = require("../../app");
const EmployerProfile = require("../../models/EmployerProfile");
const { createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

describe("global error handler: bad input returns 400, not 500", () => {
  it("returns 400 for a malformed ID", async () => {
    const employer = await createEmployerWithToken({ email: "hr@acme.test" });

    const res = await as(employer.token, "put", "/api/jobs/abc").send({ title: "x" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid value for: id");
  });

  it("returns 400 naming the field for a value of the wrong type", async () => {
    const employer = await createEmployerWithToken({ email: "hr2@acme.test" });
    const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme Labs" });
    const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Draft" });

    const res = await as(employer.token, "put", `/api/jobs/${job._id}`).send({ openings: "abc" });

    expect(res.statusCode).toBe(400);
    expect(res.body.fields).toContain("openings");
    expect(res.body.message).not.toMatch(/Cast to|mongoose/i);
  });
});
