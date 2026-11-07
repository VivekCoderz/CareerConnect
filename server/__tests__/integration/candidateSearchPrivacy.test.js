// H13: employer candidate search respects profile visibility and doesn't reveal registered emails.
const request = require("supertest");
const app = require("../../app");
const Application = require("../../models/Application");
const EmployerProfile = require("../../models/EmployerProfile");
const StudentProfile = require("../../models/StudentProfile");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const { createUserWithToken, createEmployerWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, path) => request(app).get(path).set("Authorization", `Bearer ${token}`);
const ids = (res) => res.body.candidates.map((c) => String(c._id));

let seq = 0;
const candidate = (overrides = {}) => {
  seq += 1;
  return createUserWithToken({
    email: `h13-cand-${seq}@example.com`,
    phone: `90000100${String(seq).padStart(2, "0")}`,
    ...overrides,
  });
};

const setupEmployer = async () => {
  const employer = await createEmployerWithToken({ email: `h13-hr-${++seq}@employer.test` });
  const profile = await EmployerProfile.create({ userId: employer.user._id, companyName: "H13 Labs" });
  const job = await createTestJob(profile._id, { createdBy: employer.user._id, status: "Published" });
  return { employer, profile, job };
};

describe("GET /api/candidates/search privacy (H13)", () => {
  it("never lists a private fresher or professional", async () => {
    const { employer } = await setupEmployer();
    const privateFresher = await candidate({ userType: "fresher", fullName: "Hidden Fresher" });
    await FresherProfile.create({ userId: privateFresher.user._id, profileVisibility: "private" });
    const privatePro = await candidate({ userType: "professional", fullName: "Hidden Professional" });
    await ProfessionalProfile.create({ userId: privatePro.user._id, profileVisibility: "private" });
    const publicFresher = await candidate({ userType: "fresher", fullName: "Hidden Twin Public" });
    await FresherProfile.create({ userId: publicFresher.user._id, profileVisibility: "public" });
    const recruiterOnlyPro = await candidate({ userType: "professional", fullName: "Recruiter Only Pro" });
    await ProfessionalProfile.create({ userId: recruiterOnlyPro.user._id, profileVisibility: "recruiter-only" });

    for (const path of [
      "/api/candidates/search",
      "/api/candidates/search?search=Hidden",
      "/api/candidates/search?userType=fresher",
      "/api/candidates/search?userType=professional",
    ]) {
      const res = await as(employer.token, path);
      expect(res.status).toBe(200);
      expect(ids(res)).not.toContain(String(privateFresher.user._id));
      expect(ids(res)).not.toContain(String(privatePro.user._id));
    }

    const all = await as(employer.token, "/api/candidates/search");
    expect(ids(all)).toEqual(expect.arrayContaining([String(publicFresher.user._id), String(recruiterOnlyPro.user._id)]));
  });

  it("hides a private profile even from an employer it applied to", async () => {
    const { employer, profile, job } = await setupEmployer();
    const applicant = await candidate({ userType: "fresher", fullName: "Private Applicant" });
    await FresherProfile.create({ userId: applicant.user._id, profileVisibility: "private" });
    await Application.create({
      candidateId: applicant.user._id, jobId: job._id, employerId: profile._id,
      opportunityType: "Job", opportunityTitle: job.title,
    });

    const res = await as(employer.token, "/api/candidates/search?search=Private%20Applicant");
    expect(ids(res)).not.toContain(String(applicant.user._id));
  });

  it("never lists a user without a candidate profile", async () => {
    const { employer } = await setupEmployer();
    const noProfile = await candidate({ fullName: "Campus Import" });
    const withProfile = await candidate({ fullName: "Campus Student" });
    await StudentProfile.create({ userId: withProfile.user._id });

    const all = await as(employer.token, "/api/candidates/search");
    expect(ids(all)).not.toContain(String(noProfile.user._id));
    expect(ids(all)).toContain(String(withProfile.user._id));

    const byName = await as(employer.token, "/api/candidates/search?search=Campus%20Import");
    expect(byName.body.candidates).toEqual([]);
  });

  it("matches email only for people who applied to this employer", async () => {
    const { employer, profile, job } = await setupEmployer();
    const stranger = await candidate({ email: "h13-stranger@example.com", fullName: "Some Stranger" });
    await StudentProfile.create({ userId: stranger.user._id });
    const applicant = await candidate({ email: "h13-applicant@example.com", fullName: "Real Applicant" });
    await StudentProfile.create({ userId: applicant.user._id });
    await Application.create({
      candidateId: applicant.user._id, jobId: job._id, employerId: profile._id,
      opportunityType: "Job", opportunityTitle: job.title,
    });

    const strangerSearch = await as(employer.token, "/api/candidates/search?search=h13-stranger%40example.com");
    expect(strangerSearch.status).toBe(200);
    expect(strangerSearch.body.candidates).toEqual([]);

    // Another employer's applicant is still a stranger to this one.
    const other = await setupEmployer();
    const otherSearch = await as(other.employer.token, "/api/candidates/search?search=h13-applicant%40example.com");
    expect(otherSearch.body.candidates).toEqual([]);

    const applicantSearch = await as(employer.token, "/api/candidates/search?search=h13-applicant%40example.com");
    expect(ids(applicantSearch)).toEqual([String(applicant.user._id)]);
    expect(applicantSearch.body.candidates[0].email).toBe("h13-applicant@example.com");

    // Name search still finds non-applicants, without their contact details.
    const byName = await as(employer.token, "/api/candidates/search?search=Some%20Stranger");
    expect(ids(byName)).toEqual([String(stranger.user._id)]);
    expect(byName.body.candidates[0]).toMatchObject({ email: null, phone: null });
  });
});
