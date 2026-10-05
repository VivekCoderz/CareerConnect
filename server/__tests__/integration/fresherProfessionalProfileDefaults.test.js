// T04 follow-up: freshers and professionals get an empty profile, never sample data.
jest.mock("../../services/jobScraperService", () => ({
  ...jest.requireActual("../../services/jobScraperService"),
  getAggregatedOpportunities: jest.fn().mockResolvedValue({ data: [] }),
}));

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const {
  cleanFakeFresherProfessionalProfiles,
  FRESHER_SAMPLE_SETS,
  PROFESSIONAL_SAMPLE_SETS,
  OLD_DEFAULTS,
} = require("../../scripts/clean-fake-fresher-professional-profiles");
const {
  createUserWithToken,
  createEmployerWithToken,
  createEmployerProfile,
} = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

// Values that only ever came from the old sample data or invented schema defaults.
const INVENTED = new RegExp([
  "8\\.2 CGPA", "State Technical University", "University / Institute of Technology", "University / College",
  "Software Engineering Graduate", "Enterprise Cloud Systems", "InnovateX", "Senior Software Engineer",
  "Engineering Lead / Staff Engineer", "Full Stack & (Cloud Architecture|Distributed Systems)", "30 Days",
  "Immediately Available", "Looking for Job", "Authorized to work in India", "Get my first job",
  "Employed \\(Passive / Open\\)", "Depends on Opportunity", "3-5 years", "Next 6 Months",
  "Configured target role as",
].join("|"));

const expectEmptyFresher = (profile) => {
  expect(profile.education).toEqual([]);
  for (const list of Object.values(profile.skills || {})) expect(list).toEqual([]);
  expect(profile.projects).toEqual([]);
  expect(profile.professionalHeadline ?? "").toBe("");
  expect(profile.targetRole ?? "").toBe("");
  expect(profile.careerGoal ?? "").toBe("");
  expect(profile.targetIndustry ?? "").toBe("");
  expect(profile.jobPreferences?.preferredRoles ?? []).toEqual([]);
  expect(profile.jobPreferences?.expectedSalary?.min ?? 0).toBe(0);
  expect(profile.availability?.status).toBeUndefined();
  expect(profile.workAuthorization?.status ?? "").toBe("");
};

const expectEmptyProfessional = (profile) => {
  expect(profile.experience).toEqual([]);
  for (const list of Object.values(profile.skills || {})) expect(list).toEqual([]);
  expect(profile.professionalHeadline ?? "").toBe("");
  expect(profile.careerSpecialization ?? "").toBe("");
  expect(profile.currentLevel).toBeUndefined();
  expect(profile.targetLevel).toBeUndefined();
  expect(profile.currentEmployment?.company ?? "").toBe("");
  expect(profile.currentEmployment?.jobTitle ?? "").toBe("");
  expect(profile.currentEmployment?.department ?? "").toBe("");
  expect(profile.currentEmployment?.industry ?? "").toBe("");
  expect(profile.experienceLevelCategory).toBeUndefined();
  expect(profile.careerGoal?.targetRole ?? "").toBe("");
  expect(profile.careerGoal?.timeline).toBeUndefined();
  expect(profile.availability?.noticePeriod).toBeUndefined();
  expect(profile.availability?.status).toBeUndefined();
  expect(profile.compensation?.currentSalary ?? 0).toBe(0);
  expect(profile.compensation?.expectedMinSalary ?? 0).toBe(0);
  expect(profile.compensation?.expectedMaxSalary ?? 0).toBe(0);
  expect(profile.relocation?.willingToRelocate).toBeUndefined();
};

const KINDS = [
  {
    userType: "fresher",
    base: "/api/fresher",
    Model: FresherProfile,
    expectEmpty: expectEmptyFresher,
    existing: {
      targetRole: "Data Analyst",
      education: [{ qualificationType: "B.Sc", degree: "BSc Statistics", institution: "Real College", graduationYear: 2025 }],
      skills: { programmingLanguages: [{ name: "Python", proficiency: "Advanced" }] },
    },
    expectExisting: (stored) => {
      expect(stored.targetRole).toBe("Data Analyst");
      expect(stored.education.map((e) => e.institution)).toEqual(["Real College"]);
      expect(stored.skills.programmingLanguages.map((s) => s.name)).toEqual(["Python"]);
    },
  },
  {
    userType: "professional",
    base: "/api/professional",
    Model: ProfessionalProfile,
    expectEmpty: expectEmptyProfessional,
    existing: {
      currentEmployment: { company: "Real Employer Pvt Ltd", jobTitle: "QA Engineer" },
      compensation: { currentSalary: 9 },
      availability: { noticePeriod: "60 Days" },
    },
    expectExisting: (stored) => {
      expect(stored.currentEmployment.company).toBe("Real Employer Pvt Ltd");
      expect(stored.compensation.currentSalary).toBe(9);
      expect(stored.availability.noticePeriod).toBe("60 Days");
    },
  },
];

describe.each(KINDS)("auto-created $userType profiles", ({ userType, base, Model, expectEmpty, existing, expectExisting }) => {
  let candidate;

  beforeEach(async () => {
    candidate = await createUserWithToken({ email: `t04-${userType}@example.com`, userType });
  });

  it("creates an empty profile from the dashboard and still renders it", async () => {
    const res = await request(app).get(`${base}/dashboard`).set(auth(candidate));

    expect(res.status).toBe(200);
    expectEmpty(await Model.findOne({ userId: candidate.user._id }).lean());
    expectEmpty(res.body.data.profile);
    expect(res.body.data.profileCompletion).toBeLessThanOrEqual(20);
    expect(JSON.stringify(res.body)).not.toMatch(INVENTED);
  });

  it("creates an empty profile from the profile getter with a low completion score", async () => {
    const res = await request(app).get(`${base}/profile`).set(auth(candidate));

    expect(res.status).toBe(200);
    expectEmpty(res.body.profile);
    expect(res.body.profileCompletion).toBeLessThanOrEqual(20);
    expect(JSON.stringify(res.body)).not.toMatch(INVENTED);
    expect(await Model.countDocuments({ userId: candidate.user._id })).toBe(1);
  });

  it("creates only one profile when first requests arrive together", async () => {
    const responses = await Promise.all([
      request(app).get(`${base}/dashboard`).set(auth(candidate)),
      request(app).get(`${base}/profile`).set(auth(candidate)),
      request(app).get(`${base}/profile`).set(auth(candidate)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await Model.countDocuments({ userId: candidate.user._id })).toBe(1);
  });

  it("returns recommendations without inventing a target role", async () => {
    await request(app).get(`${base}/profile`).set(auth(candidate));

    const res = await request(app).get(`${base}/recommendations`).set(auth(candidate));
    expect(res.status).toBe(200);
    expect(res.body.data.targetRole).toBe("");
    expect(res.body.data.benchmarkRole).toBeTruthy();
    expect(res.body.data.masteredSkills).toEqual([]);
  });

  it("shows a 0% match on listed jobs while the profile has no skills", async () => {
    const employer = await createEmployerWithToken({ email: `t04-${userType}-hr@example.com` });
    const company = await createEmployerProfile(employer.user._id);
    await createTestJob(company._id, {
      createdBy: employer.user._id, approvedAt: new Date(), requiredSkills: ["React", "Node.js"],
    });

    const res = await request(app).get(`${base}/dashboard`).set(auth(candidate));
    expect(res.status).toBe(200);
    const listed = res.body.data.recommendedJobs.filter((job) => !job.isExternal);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((job) => job.matchPercentage === 0)).toBe(true);
  });

  it("saves edits to an empty profile", async () => {
    await request(app).get(`${base}/profile`).set(auth(candidate));

    const res = await request(app).put(`${base}/profile`).set(auth(candidate))
      .send({ professionalHeadline: "Looking for my first QA role", experience: [] });
    expect(res.status).toBe(200);
    const stored = await Model.findOne({ userId: candidate.user._id }).lean();
    expect(stored.professionalHeadline).toBe("Looking for my first QA role");
    expect(stored.experienceLevelCategory).toBeUndefined();
  });

  it("leaves an existing profile untouched", async () => {
    await Model.create({ userId: candidate.user._id, ...existing });

    expect((await request(app).get(`${base}/dashboard`).set(auth(candidate))).status).toBe(200);
    expect((await request(app).get(`${base}/profile`).set(auth(candidate))).status).toBe(200);

    expectExisting(await Model.findOne({ userId: candidate.user._id }).lean());
    expect(await Model.countDocuments({ userId: candidate.user._id })).toBe(1);
  });
});

describe("fresher recommendations overview with an empty profile", () => {
  it("leaves unset preferences blank and only gives reasons backed by the profile", async () => {
    const fresher = await createUserWithToken({ email: "t04-reco-fresher@example.com", userType: "fresher" });
    await request(app).get("/api/fresher/profile").set(auth(fresher));

    const res = await request(app).get("/api/recommendations").set(auth(fresher));
    expect(res.status).toBe(200);
    expect(res.body.data.careerSummary).toMatchObject({
      targetRole: "", preferredLocations: "", workMode: "", careerGoal: "", profileCompleteness: 0,
    });
    const { reasons } = res.body.data.topOverallMatch;
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.join(" ")).not.toMatch(/Your core skills|Your degree|Remote \/ Hybrid/);
  });
});

describe("employer view of new freshers and professionals", () => {
  it("shows no invented education, employer, salary or notice period", async () => {
    const employer = await createEmployerWithToken({ email: "t04-fp-employer@example.com" });
    const fresher = await createUserWithToken({ email: "t04-new-fresher@example.com", userType: "fresher" });
    const professional = await createUserWithToken({ email: "t04-new-pro@example.com", userType: "professional" });
    await request(app).get("/api/fresher/dashboard").set(auth(fresher));
    await request(app).get("/api/professional/dashboard").set(auth(professional));

    const search = await request(app).get("/api/candidates/search").set(auth(employer));
    expect(search.status).toBe(200);
    const listed = (search.body.candidates || []).filter((c) =>
      [String(fresher.user._id), String(professional.user._id)].includes(String(c._id)));
    expect(listed).toHaveLength(2);
    for (const candidate of listed) {
      expect(candidate).toMatchObject({ skills: [], degree: null, institution: null, cgpa: null, jobTitle: null });
    }

    for (const identity of [fresher, professional]) {
      const detail = await request(app).get(`/api/candidates/${identity.user._id}`).set(auth(employer));
      expect(detail.status).toBe(200);
      expect(detail.body.candidate.skills).toEqual([]);
      expect(JSON.stringify(detail.body)).not.toMatch(INVENTED);
      expect(detail.body.candidate.profile.compensation?.currentSalary ?? 0).toBe(0);
    }
    expect(JSON.stringify(search.body)).not.toMatch(INVENTED);
  });
});

describe("clean-fake-fresher-professional-profiles script", () => {
  const log = () => {};

  // Builds a stored document from a sample set's dotted paths, the way the old code saved it.
  const materialize = (value) => {
    if (value?.$localDate) return new Date(Date.UTC(...value.$localDate));
    if (Array.isArray(value)) return value.map(materialize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, materialize(v)]));
    }
    return value;
  };
  const toDoc = (fields) => {
    const doc = {};
    for (const [path, value] of Object.entries(fields)) {
      const keys = path.split(".");
      let target = doc;
      keys.slice(0, -1).forEach((key) => { target = target[key] ??= {}; });
      target[keys.at(-1)] = materialize(value);
    }
    return doc;
  };
  const sampleDoc = (kind, set, overrides = {}) => ({
    userId: new mongoose.Types.ObjectId(),
    ...toDoc({ ...OLD_DEFAULTS[kind], ...set.fields, ...overrides }),
  });

  it("dry-runs by default, matches only exact sample data, and clears it with --apply", async () => {
    const [fresherProfileSet, fresherDashboardSet] = FRESHER_SAMPLE_SETS;
    const [proProfileSet, proDashboardSet] = PROFESSIONAL_SAMPLE_SETS;

    const samples = [
      await FresherProfile.create(sampleDoc("fresher", fresherProfileSet, {
        "resume.resumeUrl": "https://example.test/resume-placeholder.pdf",
      })),
      await FresherProfile.create(sampleDoc("fresher", fresherDashboardSet)),
      await ProfessionalProfile.create(sampleDoc("professional", proProfileSet)),
      await ProfessionalProfile.create(sampleDoc("professional", proDashboardSet)),
    ];

    const left = {
      // Other content added on top of the sample data: skipped.
      fresherWithBio: await FresherProfile.create(sampleDoc("fresher", fresherDashboardSet, { bio: "I wrote this myself" })),
      proWithCert: await ProfessionalProfile.create(sampleDoc("professional", proDashboardSet, {
        certifications: [{ name: "Sample Cert", issuingOrganization: "Example Org" }],
      })),
      // A sample value the user changed: not a sample profile at all.
      fresherEditedCgpa: await FresherProfile.create(sampleDoc("fresher", fresherProfileSet, {
        education: [{ ...fresherProfileSet.fields.education[0], percentageOrCgpa: "7.1 CGPA" }],
      })),
      proEditedSalary: await ProfessionalProfile.create(sampleDoc("professional", proProfileSet, {
        "compensation.expectedMinSalary": 40,
      })),
      proChangedLocation: await ProfessionalProfile.create(sampleDoc("professional", proDashboardSet, {
        "currentEmployment.location": "Pune",
      })),
      // Real profiles that share some values with the samples.
      realFresher: await FresherProfile.create({
        userId: new mongoose.Types.ObjectId(),
        targetRole: "Full Stack Developer",
        education: [{ qualificationType: "B.Tech", degree: "B.Tech IT", institution: "Real College", graduationYear: 2025 }],
        skills: { programmingLanguages: [{ name: "JavaScript", proficiency: "Intermediate" }] },
      }),
      realPro: await ProfessionalProfile.create({
        userId: new mongoose.Types.ObjectId(),
        currentEmployment: { company: "Enterprise Cloud Systems", jobTitle: "Support Engineer", location: "Noida" },
      }),
    };

    const dry = await cleanFakeFresherProfessionalProfiles({ log });
    expect(dry.ids.sort()).toEqual(samples.map((p) => String(p._id)).sort());
    expect(dry).toMatchObject({ matched: 4, skipped: 2, cleared: 0 });
    expect((await FresherProfile.findById(samples[0]._id).lean()).education).toHaveLength(1);

    const applied = await cleanFakeFresherProfessionalProfiles({ apply: true, log });
    expect(applied.cleared).toBe(4);

    const [fresherA, fresherB] = await Promise.all(samples.slice(0, 2).map((p) => FresherProfile.findById(p._id).lean()));
    const [proA, proB] = await Promise.all(samples.slice(2).map((p) => ProfessionalProfile.findById(p._id).lean()));
    [fresherA, fresherB].forEach(expectEmptyFresher);
    [proA, proB].forEach(expectEmptyProfessional);
    expect(fresherA.resume.resumeUrl).toBe("https://example.test/resume-placeholder.pdf");

    for (const doc of Object.values(left)) {
      const Model = doc instanceof FresherProfile ? FresherProfile : ProfessionalProfile;
      const stored = await Model.findById(doc._id).lean();
      expect(stored.updatedAt.getTime()).toBe(doc.updatedAt.getTime());
    }
  });
});
