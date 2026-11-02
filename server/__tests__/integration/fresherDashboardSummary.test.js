// Fresher dashboard banner and "Jobs for you": every value comes from the fresher's own
// profile, and the keys signup, the profile editor and the dashboard use agree.
const request = require("supertest");
const app = require("../../app");
const FresherProfile = require("../../models/FresherProfile");
const Application = require("../../models/Application");
const { createUserWithToken } = require("../helpers/createTestUser");
const { createTestJob } = require("../helpers/createTestJob");
const { migrateFresherPreferences } = require("../../scripts/migrate-fresher-preferences");
const { interestsToPreferences, profileStrength } = require("../../utils/fresherPreferences");

const auth = (identity) => ({ Authorization: `Bearer ${identity.token}` });
const createFresher = (overrides = {}) =>
  createUserWithToken({ userType: "fresher", fullName: "Asha Verma", firstName: "", ...overrides });
const summary = (fresher) => request(app).get("/api/dashboard/summary").set(auth(fresher));
const recommended = (fresher, query = "") => request(app).get(`/api/jobs/recommended${query}`).set(auth(fresher));
const savePreferences = (fresher, preferences) =>
  request(app).put("/api/fresher/profile").set(auth(fresher)).send({ preferences });

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe("signup interests become dashboard preferences", () => {
  test("interest names map to a role, anything else is tech stack", () => {
    expect(interestsToPreferences(["Full Stack (MERN/Java)", "MERN", "mern"])).toEqual({
      targetRole: "Full Stack Developer",
      techStack: ["MERN"],
    });
    expect(interestsToPreferences(["Full Stack", "MERN"]).targetRole).toBe("Full Stack Developer");
  });

  test("a fresher whose role was only saved as signup interests sees it (not 'Not set yet')", async () => {
    const fresher = await createFresher({ interests: ["Full Stack (MERN/Java)", "MERN"] });
    await FresherProfile.create({ userId: fresher.user._id });

    const res = await summary(fresher).expect(200);
    expect(res.body.data.firstName).toBe("Asha");
    expect(res.body.data.preferences).toEqual({
      targetRole: "Full Stack Developer",
      techStack: ["MERN"],
      jobType: "",
      location: "",
    });

    // The old fields agree, so the rest of the app shows the same role.
    const profile = await FresherProfile.findOne({ userId: fresher.user._id }).lean();
    expect(profile.targetRole).toBe("Full Stack Developer");
    expect(profile.jobPreferences.preferredRoles).toEqual(["Full Stack Developer"]);
    expect(profile.preferencesSyncedAt).toBeTruthy();
  });

  test("a cleared preference is not filled back in from old data", async () => {
    const fresher = await createFresher({ interests: ["Full Stack (MERN/Java)"] });
    await FresherProfile.create({ userId: fresher.user._id });
    await summary(fresher).expect(200);

    await savePreferences(fresher, { targetRole: "" }).expect(200);
    const res = await summary(fresher).expect(200);
    expect(res.body.data.preferences.targetRole).toBe("");
    expect(res.body.data.skillScore).toBeNull();
    expect(res.body.data.skillScoreStatus).toBe("no_role");
  });
});

describe("GET /api/dashboard/summary", () => {
  test("requires a signed-in fresher", async () => {
    await request(app).get("/api/dashboard/summary").expect(401);
    const student = await createUserWithToken({ userType: "student" });
    await summary(student).expect(403);
  });

  test("new fresher: empty preferences, 0 counts, no invented values", async () => {
    const fresher = await createFresher();
    const res = await summary(fresher).expect(200);
    expect(res.body.data).toMatchObject({
      preferences: { targetRole: "", techStack: [], jobType: "", location: "" },
      profileCompletion: 0,
      nextStep: "targetRole",
      matchedJobs: 0,
      newMatchedJobs: 0,
      applications: 0,
      skillScore: null,
      profileViews: 0,
    });
    expect(res.body.data.nextStepHint).toMatch(/Target role/);
  });

  test("counts, skill score and completion come from the profile", async () => {
    const fresher = await createFresher();
    const employer = await createUserWithToken({ role: "employer", userType: "employer" });
    await FresherProfile.create({
      userId: fresher.user._id,
      education: [{ institution: "GU", degree: "B.Tech", graduationYear: 2026, isHighest: true }],
      skills: { programmingLanguages: [{ name: "JavaScript" }], frameworks: [{ name: "React.js" }] },
      profileViews: 4,
    });
    await savePreferences(fresher, {
      targetRole: "Full Stack Developer", techStack: ["MERN"], jobType: "Full-time", location: "Remote",
    }).expect(200);

    const fresh = await createTestJob(employer.user._id, { title: "Full Stack Developer", workMode: "Remote" });
    await createTestJob(employer.user._id, { title: "Full Stack Engineer", createdAt: daysAgo(20) });
    await createTestJob(employer.user._id, {
      title: "Senior Full Stack Developer", experience: { minYears: 5, level: "Senior (5+ yrs)" },
    });
    await Application.collection.insertOne({ candidateId: fresher.user._id, jobId: fresh._id });

    const { data } = (await summary(fresher).expect(200)).body;
    expect(data.matchedJobs).toBe(2); // the senior role isn't fresher-eligible
    expect(data.newMatchedJobs).toBe(1); // `old` is 20 days old
    expect(data.applications).toBe(1);
    expect(data.profileViews).toBe(4);
    // MERN counts as MongoDB, Express, React, Node.js, JavaScript: 5 of 10 Full Stack skills.
    expect(data.skillScore).toBe(50);
    // Everything but the resume is filled.
    expect(data.profileCompletion).toBe(86);
    expect(data.nextStep).toBe("resumeUrl");
    expect(data.nextStepHint).toBe("Resume upload karo, 100% ho jayega");
  });

  test("hint names the next missing field with the percentage it reaches", () => {
    expect(profileStrength({ preferences: { targetRole: "QA Engineer" } })).toEqual({
      percent: 14, nextStep: "techStack", hint: "Apna tech stack add karo, 29% ho jayega",
    });
  });
});

describe("saving preferences", () => {
  test("dashboard save updates the banner and the old fields; profile editor save updates preferences", async () => {
    const fresher = await createFresher();
    const res = await savePreferences(fresher, {
      targetRole: "  Frontend Developer ", techStack: ["React", "react", " Tailwind "], jobType: "Part-time", location: "Pune",
    }).expect(200);
    expect(res.body.profile.preferences).toMatchObject({
      targetRole: "Frontend Developer", techStack: ["React", "Tailwind"], jobType: "Part-time", location: "Pune",
    });
    expect(res.body.profile.targetRole).toBe("Frontend Developer");
    expect(res.body.profile.jobPreferences.employmentTypes).toEqual(["Part-time"]);
    expect(res.body.profile.jobPreferences.preferredLocations).toEqual(["Pune"]);

    // Full profile editor: sends the old keys, keeps Part-time it can't show.
    await request(app).put("/api/fresher/profile").set(auth(fresher)).send({
      targetRole: "Backend Developer",
      targetRoles: ["Backend Developer"],
      jobPreferences: { preferredRoles: ["Backend Developer"], employmentTypes: ["Part-time"], preferredLocations: ["Pune", "Delhi"] },
    }).expect(200);
    const { data } = (await summary(fresher).expect(200)).body;
    expect(data.preferences).toEqual({
      targetRole: "Backend Developer", techStack: ["React", "Tailwind"], jobType: "Part-time", location: "Pune",
    });
  });

  test("an unknown job type is not saved", async () => {
    const fresher = await createFresher();
    const res = await savePreferences(fresher, { jobType: "Gig" }).expect(200);
    expect(res.body.profile.preferences.jobType).toBe("");
  });
});

describe("GET /api/jobs/recommended", () => {
  let employer;
  beforeEach(async () => {
    employer = await createUserWithToken({ role: "employer", userType: "employer" });
  });

  test("scores fresher jobs: role 40, skills 10 each (max 30), type 15, location/remote 15", async () => {
    const fresher = await createFresher();
    await FresherProfile.create({ userId: fresher.user._id, skills: { technical: [{ name: "SQL" }] } });
    await savePreferences(fresher, {
      targetRole: "Full Stack Developer", techStack: ["MERN"], jobType: "Full-time", location: "Bangalore",
    }).expect(200);

    const best = await createTestJob(employer.user._id, {
      title: "MERN Full Stack Developer", requiredSkills: ["React", "Node.js", "MongoDB", "SQL"], createdAt: daysAgo(3),
    });
    const skillsOnly = await createTestJob(employer.user._id, {
      title: "Data Engineer", requiredSkills: ["SQL", "Express", "React"], employmentType: "Internship", location: "Delhi", city: "Delhi",
      workMode: "On-site",
    });
    await createTestJob(employer.user._id, {
      title: "Accountant", requiredSkills: ["Tally"], employmentType: "Internship", location: "Delhi", city: "Delhi", workMode: "On-site",
    });
    await createTestJob(employer.user._id, {
      title: "Full Stack Developer", experience: { minYears: 2, level: "Junior (1-3 yrs)" },
    });

    const res = await recommended(fresher).expect(200);
    const { jobs, noPreferences, total } = res.body.data;
    expect(noPreferences).toBe(false);
    expect(total).toBe(2); // the accountant job doesn't match; the junior job isn't fresher-eligible
    expect(jobs[0]).toMatchObject({ id: String(best._id), matchScore: 100, hasApplied: false });
    expect(jobs[0].matchedSkills).toEqual(["React", "Node.js", "MongoDB", "SQL"]);
    // Three skills (SQL from the profile, Express and React from MERN), nothing else.
    expect(jobs[1]).toMatchObject({ id: String(skillsOnly._id), matchScore: 30 });
  });

  test("filter chips, paging, and the applied flag", async () => {
    const fresher = await createFresher();
    await savePreferences(fresher, { targetRole: "Full Stack Developer" }).expect(200);
    const intern = await createTestJob(employer.user._id, { title: "Full Stack Developer Intern", employmentType: "Internship" });
    await createTestJob(employer.user._id, { title: "Full Stack Developer", workMode: "Remote" });
    await Application.collection.insertOne({ candidateId: fresher.user._id, jobId: intern._id });

    const internships = (await recommended(fresher, "?type=internship").expect(200)).body.data;
    expect(internships.jobs.map((j) => j.id)).toEqual([String(intern._id)]);
    expect(internships.jobs[0].hasApplied).toBe(true);

    const remote = (await recommended(fresher, "?type=remote").expect(200)).body.data;
    expect(remote.jobs).toHaveLength(1);
    expect(remote.jobs[0].workMode).toBe("Remote");

    const page2 = (await recommended(fresher, "?page=2&limit=1").expect(200)).body.data;
    expect(page2).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2, hasMore: false });
    expect(page2.jobs).toHaveLength(1);
  });

  test("no preferences: newest fresher jobs, no match score, noPreferences flag", async () => {
    const fresher = await createFresher();
    await createTestJob(employer.user._id, { title: "Older", createdAt: daysAgo(5) });
    await createTestJob(employer.user._id, { title: "Newer" });

    const { data } = (await recommended(fresher).expect(200)).body;
    expect(data.noPreferences).toBe(true);
    expect(data.jobs.map((j) => j.title)).toEqual(["Newer", "Older"]);
    expect(data.jobs[0].matchScore).toBeNull();
  });

  test("/api/jobs/recommended isn't read as a job id, and needs a fresher", async () => {
    await request(app).get("/api/jobs/recommended").expect(401);
  });
});

describe("profile views", () => {
  test("public profile views are counted, except the fresher's own", async () => {
    const fresher = await createFresher({ username: "asha_v" });
    await FresherProfile.create({ userId: fresher.user._id });

    await request(app).get("/api/fresher/public/asha_v").expect(200);
    await request(app).get("/api/fresher/public/asha_v").set(auth(fresher)).expect(200);
    const { data } = (await summary(fresher).expect(200)).body;
    expect(data.profileViews).toBe(1);
  });
});

describe("migrate-fresher-preferences script", () => {
  test("fills preferences from old fields and interests, once", async () => {
    const legacy = await createFresher();
    await FresherProfile.create({
      userId: legacy.user._id,
      targetRoles: ["Data Analyst"],
      jobPreferences: { employmentTypes: ["Internship"], preferredLocations: ["Noida"] },
    });
    const viaInterests = await createFresher({ interests: ["Cloud & DevOps", "AWS"] });
    await FresherProfile.create({ userId: viaInterests.user._id });

    const logs = [];
    const dry = await migrateFresherPreferences({ log: (l) => logs.push(l) });
    expect(dry).toMatchObject({ matched: 2, filled: 2, updated: 0 });
    expect((await FresherProfile.findOne({ userId: legacy.user._id }).lean()).preferencesSyncedAt).toBeUndefined();

    const applied = await migrateFresherPreferences({ apply: true, log: () => {} });
    expect(applied.updated).toBe(2);
    const a = await FresherProfile.findOne({ userId: legacy.user._id }).lean();
    expect(a.preferences).toEqual({ targetRole: "Data Analyst", techStack: [], jobType: "Internship", location: "Noida" });
    const b = await FresherProfile.findOne({ userId: viaInterests.user._id }).lean();
    expect(b.preferences).toMatchObject({ targetRole: "DevOps Engineer", techStack: ["AWS"] });
    expect(b.targetRole).toBe("DevOps Engineer");

    expect((await migrateFresherPreferences({ apply: true, log: () => {} })).matched).toBe(0);
    expect(logs.join(" ")).not.toMatch(/Asha|@/);
  });
});
