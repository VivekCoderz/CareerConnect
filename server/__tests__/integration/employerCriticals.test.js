const request = require("supertest");
const app = require("../../app");
const Job = require("../../models/Job");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const Interview = require("../../models/Interview");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

const setup = async () => {
  const employer = await createEmployerWithToken({ email: "hr@acme.test" });
  const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "Acme Labs" });
  const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });
  const applicant = await createUserWithToken({ email: "applicant@student.test", phone: "9000000001" });
  const application = await Application.create({
    candidateId: applicant.user._id, jobId: job._id, employerId: profile._id,
    opportunityType: "Job", opportunityTitle: job.title,
  });
  return { employer, profile, job, applicant, application };
};

describe("employer critical fixes (BUG-01 to BUG-04)", () => {
  it("BUG-01: adds a recruiter note instead of failing with 500", async () => {
    const { employer, application } = await setup();

    const res = await as(employer.token, "post", `/api/applications/${application._id}/notes`).send({ text: "Strong React skills" });

    expect(res.statusCode).toBe(200);
    expect(res.body.notes.map((n) => n.text)).toContain("Strong React skills");
  });

  it("BUG-02: editing a published job sends it back for approval", async () => {
    const { employer, job } = await setup();

    const res = await as(employer.token, "put", `/api/jobs/${job._id}`).send({ applyUrl: "https://evil.example/phish" });

    expect(res.statusCode).toBe(200);
    expect((await Job.findById(job._id)).status).toBe("Pending Approval");
  });

  it("BUG-02: changing only the number of openings keeps the job live", async () => {
    const { employer, job } = await setup();

    await as(employer.token, "put", `/api/jobs/${job._id}`).send({ openings: 7 });

    expect((await Job.findById(job._id)).status).toBe("Published");
  });

  it("BUG-03: shows contact details only for candidates who applied to this employer", async () => {
    const { employer } = await setup();
    await createUserWithToken({ email: "stranger@student.test", phone: "9000000002" });

    const res = await as(employer.token, "get", "/api/candidates/search");

    expect(res.statusCode).toBe(200);
    const byEmail = (email) => res.body.candidates.find((c) => c.email === email);
    expect(byEmail("applicant@student.test")).toBeTruthy();
    expect(res.body.candidates.some((c) => c.phone === "9000000002")).toBe(false);
    expect(res.body.candidates.some((c) => c.email === "stranger@student.test")).toBe(false);
  });

  it("BUG-03: does not invent education or location for empty profiles", async () => {
    const { employer } = await setup();

    const res = await as(employer.token, "get", "/api/candidates/search");

    const candidate = res.body.candidates.find((c) => c.email === "applicant@student.test");
    expect(candidate.institution).toBeNull();
    expect(candidate.cgpa).toBeNull();
    expect(candidate.location).toBeNull();
  });

  it("BUG-04: the applicant list includes interview data", async () => {
    const { employer, profile, job, applicant, application } = await setup();
    await Interview.create({
      employerId: profile._id, candidateId: applicant.user._id, jobId: job._id,
      applicationId: application._id, scheduledDate: "2028-01-02", status: "scheduled",
    });

    const res = await as(employer.token, "get", "/api/applications/employer/list");

    expect(res.statusCode).toBe(200);
    const listed = res.body.applications.find((a) => String(a._id) === String(application._id));
    expect(listed.interviews).toHaveLength(1);
    expect(listed.latestInterview).toBeTruthy();
  });
});
