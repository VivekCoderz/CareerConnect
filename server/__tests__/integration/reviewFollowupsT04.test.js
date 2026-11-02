// Review follow-ups (Ram): signup placeholders cleanup, no match floors, recruiter contact opt-in.
jest.mock("../../services/jobScraperService", () => ({
  ...jest.requireActual("../../services/jobScraperService"),
  getAggregatedOpportunities: jest.fn().mockResolvedValue({ data: [] }),
}));

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const { cleanSignupPlaceholders } = require("../../scripts/clean-fake-fresher-professional-profiles");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);
let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;
const phone = (lead) => `${lead}${String(Date.now() + ++seq).slice(-9)}`;

describe("cleanup script: signup placeholders on professional profiles", () => {
  const log = () => {};
  const create = (currentEmployment) => ProfessionalProfile.create({
    userId: new mongoose.Types.ObjectId(),
    currentEmployment: { industry: "Fake Industry Sector", ...currentEmployment },
  });

  it("dry run changes nothing; --apply clears exactly 'Industry' / 'Working Professional' / 'Information Technology'", async () => {
    const both = await create({ company: "Industry", jobTitle: "Working Professional", industry: "Information Technology" });
    const companyOnly = await create({ company: "Industry", jobTitle: "Fake QA Lead" });
    const similar = await create({
      company: "Industry Labs Fake", jobTitle: "Working Professionals", industry: "Information Technology Services",
    });
    const real = await create({ company: "Fake Real Corp", jobTitle: "Fake Engineer" });
    // A real company with "Information Technology": a genuine choice, not the signup default.
    const realIt = await create({ company: "Fake Real Corp", jobTitle: "Fake Engineer", industry: "Information Technology" });
    // Only the title is a placeholder: the industry beside it is the default too.
    const titleIt = await create({ company: "Fake Real Corp", jobTitle: "Working Professional", industry: "Information Technology" });

    const dry = await cleanSignupPlaceholders({ log });
    expect(dry["currentEmployment.company"]).toMatchObject({ matched: 2, cleared: 0 });
    expect(dry["currentEmployment.jobTitle"]).toMatchObject({ matched: 2, cleared: 0 });
    expect(dry["currentEmployment.industry"]).toMatchObject({ matched: 2, cleared: 0 });
    expect((await ProfessionalProfile.findById(both._id).lean()).currentEmployment.company).toBe("Industry");

    const applied = await cleanSignupPlaceholders({ apply: true, log });
    expect(applied["currentEmployment.company"].cleared).toBe(2);
    expect(applied["currentEmployment.jobTitle"].cleared).toBe(2);
    expect(applied["currentEmployment.industry"].cleared).toBe(2);

    const read = async (doc) => (await ProfessionalProfile.findById(doc._id).lean()).currentEmployment;
    expect(await read(both)).toMatchObject({ company: "", jobTitle: "", industry: "" });
    expect(await read(companyOnly)).toMatchObject({ company: "", jobTitle: "Fake QA Lead" });
    expect(await read(similar)).toMatchObject({
      company: "Industry Labs Fake", jobTitle: "Working Professionals", industry: "Information Technology Services",
    });
    expect(await read(real)).toMatchObject({ company: "Fake Real Corp", jobTitle: "Fake Engineer" });
    expect(await read(realIt)).toMatchObject({ company: "Fake Real Corp", industry: "Information Technology" });
    expect(await read(titleIt)).toMatchObject({ company: "Fake Real Corp", jobTitle: "", industry: "" });
  });
});

describe("job match on fresher / professional dashboards has no floor or cap", () => {
  const setup = async (userType, Model, skills) => {
    const candidate = await createUserWithToken({ email: `${uniq(userType)}@candidate.test`, phone: phone(7), userType });
    await Model.create({ userId: candidate.user._id, skills });
    const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: phone(8) });
    const profile = await createEmployerProfile(employer.user._id);
    const make = (title, requiredSkills) => createTestJob(profile._id, {
      createdBy: employer.user._id, approvedAt: new Date(), title, requiredSkills,
    });
    const noMatch = await make("Fake Haskell Role", ["Haskell", "Elixir"]);
    const fullMatch = await make("Fake React Role", ["React"]);
    const noSkills = await make("Fake Generic Role", []);
    return { candidate, noMatch, fullMatch, noSkills };
  };
  const scoreOf = (jobs, job) => jobs.find((j) => String(j._id) === String(job._id))?.matchPercentage;

  it.each([
    ["fresher", FresherProfile, "/api/fresher/dashboard", { frameworks: [{ name: "React", proficiency: "Intermediate" }] }],
    ["professional", ProfessionalProfile, "/api/professional/dashboard", { frameworks: [{ name: "React" }] }],
  ])("%s: 0% with no match (no 45/55 floor), 100% with a full match, null when the job lists no skills",
    async (userType, Model, path, skills) => {
      const { candidate, noMatch, fullMatch, noSkills } = await setup(userType, Model, skills);
      const res = await as(candidate.token, "get", path);
      expect(res.statusCode).toBe(200);
      const jobs = res.body.data.recommendedJobs;
      expect(scoreOf(jobs, noMatch)).toBe(0);
      expect(scoreOf(jobs, fullMatch)).toBe(100);
      expect(scoreOf(jobs, noSkills)).toBeNull();
    });
});

describe("recruiter contact is opt-in (DPDP)", () => {
  it("a new professional profile starts with allowContact false; a stored true is kept", async () => {
    const fresh = await createUserWithToken({ email: `${uniq("pro")}@candidate.test`, phone: phone(6), userType: "professional" });
    const res = await as(fresh.token, "get", "/api/professional/profile");
    expect(res.statusCode).toBe(200);
    expect(res.body.profile.recruiterPreferences.allowContact).toBe(false);
    expect((await ProfessionalProfile.findOne({ userId: fresh.user._id }).lean()).recruiterPreferences.allowContact).toBe(false);

    const existing = await createUserWithToken({ email: `${uniq("pro")}@candidate.test`, phone: phone(9), userType: "professional" });
    await ProfessionalProfile.collection.insertOne({
      userId: existing.user._id, recruiterPreferences: { allowContact: true, preferredContactMethod: "Email" },
      createdAt: new Date(), updatedAt: new Date(),
    });
    const kept = await as(existing.token, "get", "/api/professional/profile");
    expect(kept.body.profile.recruiterPreferences.allowContact).toBe(true);
  });
});
