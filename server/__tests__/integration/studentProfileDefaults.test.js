const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const StudentProfile = require("../../models/StudentProfile");
const {
  cleanFakeStudentProfiles,
  SAMPLE_SETS,
} = require("../../scripts/clean-fake-student-profiles");
const {
  createUserWithToken,
  createEmployerWithToken,
} = require("../helpers/createTestUser");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });

const expectEmptyProfile = (profile) => {
  expect(profile.technicalSkills).toEqual([]);
  expect(profile.softSkills).toEqual([]);
  expect(profile.education).toEqual([]);
  expect(profile.careerGoal ?? "").toBe("");
  expect(profile.jobPreferences?.preferredRoles ?? []).toEqual([]);
  expect(profile.jobPreferences?.preferredLocations ?? []).toEqual([]);
};

describe("auto-created student profiles (T04)", () => {
  let student;

  beforeEach(async () => {
    student = await createUserWithToken({ email: "t04-student@example.com" });
  });

  it("creates an empty profile from the dashboard and still renders it", async () => {
    const res = await request(app)
      .get("/api/student/dashboard")
      .set(auth(student));

    expect(res.status).toBe(200);
    expectEmptyProfile(
      await StudentProfile.findOne({ userId: student.user._id }).lean(),
    );
    const { profile, education, technicalSkills, careerGoal } = res.body.data;
    expectEmptyProfile(profile);
    expect(education).toEqual([]);
    expect(technicalSkills).toEqual([]);
    expect(careerGoal).toBe("");
    expect(res.body.data.profileCompletion).toBeLessThanOrEqual(20);
  });

  it("creates an empty profile from the profile getter with a low completion score", async () => {
    const res = await request(app)
      .get("/api/student/profile")
      .set(auth(student));

    expect(res.status).toBe(200);
    expectEmptyProfile(res.body.profile);
    expect(res.body.profileCompletion).toBeLessThanOrEqual(20);
    expect(
      await StudentProfile.countDocuments({ userId: student.user._id }),
    ).toBe(1);
  });

  it("creates only one profile when first requests arrive together", async () => {
    await Promise.all([
      request(app).get("/api/student/dashboard").set(auth(student)),
      request(app).get("/api/student/profile").set(auth(student)),
    ]);
    expect(
      await StudentProfile.countDocuments({ userId: student.user._id }),
    ).toBe(1);
  });

  it("keeps recommendations and skill-gap working for an empty profile", async () => {
    await request(app).get("/api/student/profile").set(auth(student));

    for (const path of [
      "/api/recommendations/skills",
      "/api/recommendations/jobs",
    ]) {
      const res = await request(app).get(path).set(auth(student));
      expect(res.status).toBeLessThan(500);
    }
  });

  it("leaves an existing profile untouched", async () => {
    await StudentProfile.create({
      userId: student.user._id,
      technicalSkills: ["Python"],
      education: [
        {
          institution: "Real College",
          degree: "BSc",
          startYear: 2023,
          endYear: 2026,
        },
      ],
      careerGoal: "Data Analyst",
    });

    await request(app).get("/api/student/dashboard").set(auth(student));
    await request(app).get("/api/student/profile").set(auth(student));

    const stored = await StudentProfile.findOne({
      userId: student.user._id,
    }).lean();
    expect(stored.technicalSkills).toEqual(["Python"]);
    expect(stored.education.map((e) => e.institution)).toEqual([
      "Real College",
    ]);
    expect(stored.careerGoal).toBe("Data Analyst");
  });
});

describe("employer view of a candidate with no education", () => {
  it("shows empty values instead of sample education, CGPA or location", async () => {
    const employer = await createEmployerWithToken({
      email: "t04-employer@example.com",
    });
    const candidate = await createUserWithToken({
      email: "t04-no-edu@example.com",
      fullName: "No Education",
    });
    await StudentProfile.create({
      userId: candidate.user._id,
      technicalSkills: ["Python"],
    });

    const search = await request(app)
      .get("/api/candidates/search")
      .set(auth(employer));
    expect(search.status).toBe(200);
    const listed = (search.body.candidates || search.body.data || []).find(
      (c) => String(c._id) === String(candidate.user._id),
    );
    expect(listed).toBeDefined();
    expect(listed).toMatchObject({
      institution: null,
      degree: null,
      cgpa: null,
      graduationYear: null,
      location: null,
    });

    const detail = await request(app)
      .get(`/api/candidates/${candidate.user._id}`)
      .set(auth(employer));
    for (const body of [search.body, detail.body]) {
      expect(JSON.stringify(body)).not.toMatch(
        /Geeta University|Panipat|"8\.5"/,
      );
    }
  });
});

describe("clean-fake-student-profiles script", () => {
  const [dashboardSample, profileSample] = SAMPLE_SETS;
  const sampleDoc = (sample, overrides = {}) => ({
    userId: new mongoose.Types.ObjectId(),
    technicalSkills: sample.technicalSkills,
    softSkills: sample.softSkills,
    education: [sample.education],
    ...(sample.careerGoal ? { careerGoal: sample.careerGoal } : {}),
    ...(sample.jobPreferences ? { jobPreferences: sample.jobPreferences } : {}),
    ...overrides,
  });
  const log = () => {};

  it("dry-runs by default and lists only exact sample-data profiles", async () => {
    const fromDashboard = await StudentProfile.create(
      sampleDoc(dashboardSample),
    );
    const fromProfile = await StudentProfile.create(sampleDoc(profileSample));
    const withBio = await StudentProfile.create(
      sampleDoc(dashboardSample, { bio: "I wrote this myself" }),
    );
    const changedSkill = await StudentProfile.create(
      sampleDoc(profileSample, {
        technicalSkills: ["JavaScript", "React", "Node.js", "Python"],
      }),
    );
    const real = await StudentProfile.create({
      userId: new mongoose.Types.ObjectId(),
      technicalSkills: ["JavaScript", "React", "Node.js"],
      education: [
        {
          institution: "Geeta University",
          degree: "BCA",
          startYear: 2022,
          endYear: 2025,
        },
      ],
    });

    const dry = await cleanFakeStudentProfiles({ log });
    expect(dry.ids.sort()).toEqual(
      [String(fromDashboard._id), String(fromProfile._id)].sort(),
    );
    expect(dry).toMatchObject({ matched: 2, skipped: 1, cleared: 0 });
    expect(
      (await StudentProfile.findById(fromDashboard._id).lean()).technicalSkills,
    ).toHaveLength(4);

    const applied = await cleanFakeStudentProfiles({ apply: true, log });
    expect(applied.cleared).toBe(2);
    expectEmptyProfile(await StudentProfile.findById(fromDashboard._id).lean());
    expectEmptyProfile(await StudentProfile.findById(fromProfile._id).lean());
    for (const untouched of [withBio, changedSkill, real]) {
      const stored = await StudentProfile.findById(untouched._id).lean();
      expect(stored.technicalSkills).toEqual(untouched.technicalSkills);
      expect(stored.education).toHaveLength(1);
    }
  });
});
