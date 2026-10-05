// Server-side made-up data: ATS scores, default city / category / level, match scores and
// the employer search job title.
const request = require("supertest");
const app = require("../../app");
const Internship = require("../../models/Internship");
const Job = require("../../models/Job");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const FresherProfile = require("../../models/FresherProfile");
const StudentProfile = require("../../models/StudentProfile");
const { analyzeATSMatch, selectBestATSResume } = require("../../services/atsScoringService");
const { scorePdfText } = require("../../services/atsPdfWorkflow");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const as = (token, method, path) => request(app)[method](path).set("Authorization", `Bearer ${token}`);

// The AI resume service picks Gemini at load time; load it with no key to test the
// offline paths (and stay off the network).
const loadOfflineAiService = () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  let service;
  jest.isolateModules(() => { service = require("../../services/aiResumeservice"); });
  process.env.GEMINI_API_KEY = saved;
  return service;
};

const fakeResume = {
  personal: { fullName: "Fake Candidate", email: "fake.candidate@example.test" },
  summary: "Student who builds small web pages.",
  skills: { programmingLanguages: ["HTML"], frameworks: [], tools: [], other: [] },
  projects: [{ name: "Fake Landing Page", technologies: "HTML", description: ["Made a landing page for a class."] }],
  experience: [],
  education: [{ college: "Fake College", degree: "BCA" }],
};
const cloudJd = "We are hiring a backend engineer. Required: Docker, Kubernetes, AWS, PostgreSQL, Redis and CI/CD pipelines.";
const emptyJd = "Friendly team, good culture, apply today.";

let seq = 0;
const uniq = (label) => `${label}-${Date.now()}-${++seq}`;

describe("ATS scores are never invented", () => {
  const ai = loadOfflineAiService();

  it("heuristic scan: no score when the job lists no known skills; no fixed formatting score", async () => {
    const none = await ai.analyzeResumeAgainstJD(fakeResume, emptyJd, "Fake Role");
    expect(none.atsScore).toBeNull();
    expect(none.scoreUnavailable).toBe(true);
    expect(none.scoreUnavailableReason).toMatch(/no score/i);

    const scored = await ai.analyzeResumeAgainstJD(fakeResume, cloudJd, "Backend Engineer");
    expect(typeof scored.atsScore).toBe("number");
    expect(scored.scoreBreakdown.formattingAndClarity).toBeNull();
    expect(scored.sectionAudits.summary.score).toBeNull();
    expect(scored.sectionAudits.experience.score).toBeNull(); // no experience entries
  });

  it("1-click fix without Gemini reports re-scanned scores, not a forced 90-96", async () => {
    const result = await ai.fixAndOptimizeResumeWithAI(fakeResume, cloudJd, { targetRole: "Backend Engineer", mistakesAndIssues: [] });
    const rescan = await ai.analyzeResumeAgainstJD(result.fixedResume, cloudJd, "Backend Engineer");
    expect(result.improvedAtsScore).toBe(rescan.atsScore);
    expect(result.improvedAtsScore).toBeLessThan(90);
    expect(result.previousAtsScore).toBe((await ai.analyzeResumeAgainstJD(fakeResume, cloudJd, "Backend Engineer")).atsScore);
    expect(result.fixesAppliedCount).toBe(0);

    const unscorable = await ai.fixAndOptimizeResumeWithAI(fakeResume, emptyJd, {});
    expect(unscorable).toMatchObject({ previousAtsScore: null, improvedAtsScore: null, scoreUnavailable: true });
    expect(unscorable.fixesAppliedCount).toBeNull();
  });

  it("ATS generator: a resume that matches nothing scores below the old 30% floor", async () => {
    const generated = await ai.generateATSResume(fakeResume, cloudJd, "Fake Cloud Co");
    expect(typeof generated.atsScore).toBe("number");
    expect(generated.atsScore).toBeLessThan(30);
  });

  it("deterministic matcher: no default credit, null when the job gives nothing to match", () => {
    const blank = analyzeATSMatch(fakeResume, { title: "", description: "" });
    expect(blank).toMatchObject({ overallScore: null, scoreUnavailable: true, rating: "Score unavailable" });
    expect(blank.sections.skills).toBeNull();
    expect(blank.sections.keywords).toBeNull();

    const selection = selectBestATSResume(fakeResume, [{ source: "x", data: fakeResume }], { title: "", description: "" });
    expect(selection.comparison).toMatchObject({ originalScore: null, tailoredScore: null, scoreImprovement: null });

    const real = analyzeATSMatch(fakeResume, { title: "Backend Engineer", description: cloudJd, requiredSkills: ["Docker", "AWS"] });
    expect(typeof real.overallScore).toBe("number");
    expect(real.sections.skills).toBe(0);
  });

  it("PDF scorer: no default points when the job description is empty", () => {
    const result = scorePdfText("Fake Candidate\nfake.candidate@example.test\nSkills\nHTML", "");
    expect(result).toMatchObject({ atsScore: null, scoreUnavailable: true, requiresFix: false });
    expect(result.sections.skills).toBeNull();
    expect(result.sections.keywords).toBeNull();
  });
});

describe("listings: location required, no Bangalore / category / level defaults", () => {
  const setup = async () => {
    const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: `8${String(Date.now() + ++seq).slice(-9)}` });
    await createEmployerProfile(employer.user._id, { companyName: "Fake Location Co" });
    return employer;
  };
  const jobBody = {
    title: "Fake Support Role", employmentType: "Full-time", workMode: "Remote",
    description: "A fake listing used only in tests.",
  };

  it("jobs: 400 without a location, 201 with Remote and nothing invented", async () => {
    const employer = await setup();
    for (const location of [undefined, "", "   "]) {
      const res = await as(employer.token, "post", "/api/jobs").send({ ...jobBody, location });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Location is required");
    }
    const res = await as(employer.token, "post", "/api/jobs").send({ ...jobBody, location: "Remote" });
    expect(res.statusCode).toBe(201);
    const stored = await Job.findById(res.body.job._id).lean();
    expect(stored).toMatchObject({ location: "Remote", city: "", state: "", category: "", subCategory: "", education: "" });
    expect(stored.experience?.level).toBeUndefined();
  });

  it("internships: 400 without a location, 201 with Remote and no default city", async () => {
    const employer = await setup();
    const missing = await as(employer.token, "post", "/api/internships").send(jobBody);
    expect(missing.statusCode).toBe(400);
    expect(missing.body.message).toBe("Location is required");
    const res = await as(employer.token, "post", "/api/internships").send({ ...jobBody, location: "Remote" });
    expect(res.statusCode).toBe(201);
    const stored = await Internship.findById(res.body.internship._id).lean();
    expect(stored).toMatchObject({ location: "Remote", city: "", state: "", category: "", subCategory: "", education: "" });
  });

  it("existing listings keep their stored city", async () => {
    const employer = await setup();
    const job = await createTestJob(null, { createdBy: employer.user._id, city: "Fakepur", status: "Draft" });
    await as(employer.token, "put", `/api/jobs/${job._id}`).send({ openings: 4 });
    expect((await Job.findById(job._id).lean()).city).toBe("Fakepur");
  });
});

describe("employer candidate search: match scores and job titles", () => {
  const setup = async () => {
    const employer = await createEmployerWithToken({ email: `${uniq("hr")}@employer.test`, phone: `8${String(Date.now() + ++seq).slice(-9)}` });
    const profile = await createEmployerProfile(employer.user._id, { companyName: "Fake Search Co" });
    const candidate = await createUserWithToken({
      email: `${uniq("cand")}@candidate.test`, phone: `7${String(Date.now() + ++seq).slice(-9)}`, fullName: "Fake Searchable",
    });
    await StudentProfile.create({ userId: candidate.user._id, technicalSkills: ["React", "Node.js"] });
    return { employer, profile, candidate };
  };
  const find = (body, user) => body.candidates.find((c) => String(c._id) === String(user._id));

  it("no target job or a job without skills: null + 'Not enough data', not 80% / 85%", async () => {
    const { employer, profile, candidate } = await setup();
    const plain = await as(employer.token, "get", "/api/candidates/search");
    expect(find(plain.body, candidate.user)).toMatchObject({ matchPercentage: null, matchReason: "Not enough data", strongSkills: [] });

    const noSkills = await createTestJob(profile._id, { createdBy: employer.user._id, requiredSkills: [], preferredSkills: [] });
    const res = await as(employer.token, "get", `/api/candidates/search?jobId=${noSkills._id}`);
    expect(find(res.body, candidate.user)).toMatchObject({ matchPercentage: null, matchReason: "Not enough data" });
  });

  it("a real match is computed only from the skills the job lists (no 30% floor, no free credit)", async () => {
    const { employer, profile, candidate } = await setup();
    const reqOnly = await createTestJob(profile._id, { createdBy: employer.user._id, requiredSkills: ["React", "Go", "Rust", "Elixir"], preferredSkills: [] });
    const res = await as(employer.token, "get", `/api/candidates/search?jobId=${reqOnly._id}`);
    expect(find(res.body, candidate.user)).toMatchObject({ matchPercentage: 25, matchReason: null });

    const noMatch = await createTestJob(profile._id, { createdBy: employer.user._id, requiredSkills: ["Haskell"], preferredSkills: [] });
    const none = await as(employer.token, "get", `/api/candidates/search?jobId=${noMatch._id}`);
    expect(find(none.body, candidate.user).matchPercentage).toBe(0);
  });

  it("shows the real job title from professional and fresher profiles", async () => {
    const { employer } = await setup();
    const pro = await createUserWithToken({
      email: `${uniq("pro")}@candidate.test`, phone: `6${String(Date.now() + ++seq).slice(-9)}`, userType: "professional",
    });
    await ProfessionalProfile.create({ userId: pro.user._id, currentEmployment: { company: "Fake Corp", jobTitle: "Fake QA Lead" } });
    const fresher = await createUserWithToken({
      email: `${uniq("fresh")}@candidate.test`, phone: `9${String(Date.now() + ++seq).slice(-9)}`, userType: "fresher",
    });
    await FresherProfile.create({ userId: fresher.user._id, internships: [{ companyName: "Fake Startup", role: "Fake Frontend Intern" }] });

    const res = await as(employer.token, "get", "/api/candidates/search");
    expect(find(res.body, pro.user).jobTitle).toBe("Fake QA Lead");
    expect(find(res.body, fresher.user).jobTitle).toBe("Fake Frontend Intern");
  });
});
