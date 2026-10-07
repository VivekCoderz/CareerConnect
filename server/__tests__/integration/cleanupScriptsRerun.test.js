// The one-time cleanup scripts must be safe to re-run (5 Oct: a second --apply cleared a
// profile the first run had left alone, after migrate-allowcontact-false changed it).
const mongoose = require("mongoose");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const StudentProfile = require("../../models/StudentProfile");
const {
  cleanFresherProfessionalSampleData,
  FRESHER_SAMPLE_SETS,
  PROFESSIONAL_SAMPLE_SETS,
  OLD_DEFAULTS,
} = require("../../scripts/clean-fake-fresher-professional-profiles");
const { cleanFakeStudentProfiles, SAMPLE_SETS: STUDENT_SAMPLE_SETS } = require("../../scripts/clean-fake-student-profiles");
const { migrateAllowContact } = require("../../scripts/migrate-allowcontact-false");

const log = () => {};
const BEFORE_DEPLOY = new Date("2026-10-06");
const OLD_TIME = new Date("2026-09-20T10:00:00Z");

// Everything stored, straight from the collection: what a re-run must leave identical.
const snapshot = async (...Models) => {
  const all = {};
  for (const Model of Models) {
    all[Model.modelName] = await Model.collection.find({}).sort({ _id: 1 }).toArray();
  }
  return all;
};
const raw = (Model, doc) => Model.collection.findOne({ _id: doc._id });

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
// Profiles the old code saved before 6 Oct: created then, allowContact true (the old default).
const createOld = async (Model, doc) => {
  const created = await Model.create(doc);
  await Model.collection.updateOne({ _id: created._id }, { $set: { createdAt: OLD_TIME, updatedAt: OLD_TIME } });
  return Model.findById(created._id).lean();
};

const [, fresherDashboardSet] = FRESHER_SAMPLE_SETS;
const [proProfileSet, proDashboardSet] = PROFESSIONAL_SAMPLE_SETS;
const isFresherSampleCleared = (doc) => doc.targetRole !== "Full Stack Developer" && (doc.education ?? []).length === 0;
const isProSampleCleared = (doc) => (doc.currentEmployment?.company ?? "") === "";

describe("clean-fake-fresher-professional-profiles: re-runs", () => {
  const seed = async () => ({
    fresherSample: await createOld(FresherProfile, sampleDoc("fresher", fresherDashboardSet)),
    fresherWithBio: await createOld(FresherProfile, sampleDoc("fresher", fresherDashboardSet, { bio: "Fake bio the user wrote" })),
    proSample: await createOld(ProfessionalProfile, sampleDoc("professional", proDashboardSet)),
    proWithCert: await createOld(ProfessionalProfile, sampleDoc("professional", proProfileSet, {
      certifications: [{ name: "Fake Test Certificate", issuingOrganization: "Fake Test Org" }],
    })),
    placeholders: await createOld(ProfessionalProfile, {
      userId: new mongoose.Types.ObjectId(),
      currentEmployment: { company: "Industry", jobTitle: "Working Professional", industry: "Information Technology" },
    }),
    real: await createOld(ProfessionalProfile, {
      userId: new mongoose.Types.ObjectId(),
      currentEmployment: { company: "Fake Real Corp", jobTitle: "Fake Engineer", industry: "Information Technology" },
    }),
  });

  it("dry run changes nothing, not even markers", async () => {
    await seed();
    const before = await snapshot(FresherProfile, ProfessionalProfile);
    const dry = await cleanFresherProfessionalSampleData({ log });
    expect(dry.samples).toMatchObject({ matched: 2, skipped: 2, cleared: 0, markedLeftAlone: 0 });
    expect(dry.placeholders["currentEmployment.company"]).toMatchObject({ matched: 1, cleared: 0 });
    expect(await snapshot(FresherProfile, ProfessionalProfile)).toEqual(before);
  });

  it("--apply twice gives the same result as --apply once", async () => {
    const seeded = await seed();
    const first = await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(first.samples).toMatchObject({ matched: 2, skipped: 2, cleared: 2, markedLeftAlone: 2 });
    expect(first.placeholders["currentEmployment.company"].cleared).toBe(1);
    expect(first.placeholders["currentEmployment.industry"].cleared).toBe(1);
    const afterOnce = await snapshot(FresherProfile, ProfessionalProfile);

    const second = await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(second.samples).toMatchObject({ matched: 0, skipped: 0, cleared: 0, markedLeftAlone: 0 });
    expect(Object.values(second.placeholders).map((p) => p.matched)).toEqual([0, 0, 0]);
    expect(await snapshot(FresherProfile, ProfessionalProfile)).toEqual(afterOnce);

    expect(isFresherSampleCleared(await raw(FresherProfile, seeded.fresherSample))).toBe(true);
    expect(isProSampleCleared(await raw(ProfessionalProfile, seeded.proSample))).toBe(true);
    expect((await raw(ProfessionalProfile, seeded.placeholders)).currentEmployment)
      .toMatchObject({ company: "", jobTitle: "", industry: "" });
    expect((await raw(ProfessionalProfile, seeded.real)).currentEmployment.industry).toBe("Information Technology");
    for (const [Model, doc] of [
      [FresherProfile, seeded.fresherSample],
      [ProfessionalProfile, seeded.proSample],
      [ProfessionalProfile, seeded.placeholders],
    ]) {
      expect((await raw(Model, doc)).sampleDataCleanedAt).toBeInstanceOf(Date);
    }
  });

  it("a profile with other edits is never cleared on any run, even after the edit is undone", async () => {
    const { fresherWithBio, proWithCert } = await seed();
    const keep = async () => ({
      fresher: await raw(FresherProfile, fresherWithBio),
      pro: await raw(ProfessionalProfile, proWithCert),
    });

    await cleanFresherProfessionalSampleData({ apply: true, log });
    const afterFirst = await keep();
    expect(afterFirst.fresher.sampleDataLeftAloneAt).toBeInstanceOf(Date);
    expect(afterFirst.pro.sampleDataLeftAloneAt).toBeInstanceOf(Date);
    // Marking doesn't count as an edit: updatedAt is unchanged.
    expect(afterFirst.fresher.updatedAt).toEqual(OLD_TIME);
    expect(afterFirst.fresher.education).toHaveLength(1);
    expect(afterFirst.pro.currentEmployment.company).toBe("Enterprise Cloud Systems");

    // The user later removes the extra content: the profile now holds only sample data.
    await FresherProfile.collection.updateOne({ _id: fresherWithBio._id }, { $unset: { bio: "" } });
    await ProfessionalProfile.collection.updateOne({ _id: proWithCert._id }, { $set: { certifications: [] } });
    const edited = await keep();

    await cleanFresherProfessionalSampleData({ apply: true, log });
    await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(await keep()).toEqual(edited);
  });

  it("5 Oct sequence: left alone, then migrate-allowcontact-false, then a second --apply still leaves it alone", async () => {
    // Saved by the old code with allowContact true (the default before 4 Oct).
    const pro = await createOld(ProfessionalProfile, sampleDoc("professional", proDashboardSet, {
      "recruiterPreferences.allowContact": true,
    }));

    const first = await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(first.samples).toMatchObject({ matched: 0, skipped: 1, cleared: 0 });

    await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log });
    expect((await raw(ProfessionalProfile, pro)).recruiterPreferences.allowContact).toBe(false);

    const second = await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(second.samples).toMatchObject({ matched: 0, cleared: 0 });
    expect((await raw(ProfessionalProfile, pro)).currentEmployment.company).toBe("Enterprise Cloud Systems");
  });

  it("migration first, cleanup never run before: allowContact changed by the script still counts as a change", async () => {
    const pro = await createOld(ProfessionalProfile, sampleDoc("professional", proDashboardSet, {
      "recruiterPreferences.allowContact": true,
    }));
    await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log });

    const result = await cleanFresherProfessionalSampleData({ apply: true, log });
    expect(result.samples).toMatchObject({ matched: 0, skipped: 1, cleared: 0 });
    expect((await raw(ProfessionalProfile, pro)).currentEmployment.company).toBe("Enterprise Cloud Systems");
  });
});

describe("clean-fake-student-profiles: re-runs", () => {
  const [dashboardSample, profileSample] = STUDENT_SAMPLE_SETS;
  const studentDoc = (sample, overrides = {}) => ({
    userId: new mongoose.Types.ObjectId(),
    technicalSkills: sample.technicalSkills,
    softSkills: sample.softSkills,
    education: [sample.education],
    ...(sample.careerGoal ? { careerGoal: sample.careerGoal } : {}),
    ...(sample.jobPreferences ? { jobPreferences: sample.jobPreferences } : {}),
    ...overrides,
  });
  const seed = async () => ({
    sample: await createOld(StudentProfile, studentDoc(dashboardSample)),
    profileSample: await createOld(StudentProfile, studentDoc(profileSample)),
    withBio: await createOld(StudentProfile, studentDoc(dashboardSample, { bio: "Fake student bio" })),
  });

  it("dry run changes nothing", async () => {
    await seed();
    const before = await snapshot(StudentProfile);
    expect(await cleanFakeStudentProfiles({ log })).toMatchObject({ matched: 2, skipped: 1, cleared: 0 });
    expect(await snapshot(StudentProfile)).toEqual(before);
  });

  it("--apply twice gives the same result as once, and an edited profile is never cleared", async () => {
    const { sample, withBio } = await seed();
    expect(await cleanFakeStudentProfiles({ apply: true, log }))
      .toMatchObject({ matched: 2, skipped: 1, cleared: 2, markedLeftAlone: 1 });
    const afterOnce = await snapshot(StudentProfile);
    expect((await raw(StudentProfile, sample)).sampleDataCleanedAt).toBeInstanceOf(Date);
    expect((await raw(StudentProfile, withBio)).technicalSkills).toEqual(dashboardSample.technicalSkills);

    expect(await cleanFakeStudentProfiles({ apply: true, log }))
      .toMatchObject({ matched: 0, skipped: 0, cleared: 0, markedLeftAlone: 0 });
    expect(await snapshot(StudentProfile)).toEqual(afterOnce);

    // Bio removed later: still left alone.
    await StudentProfile.collection.updateOne({ _id: withBio._id }, { $unset: { bio: "" } });
    await cleanFakeStudentProfiles({ apply: true, log });
    const stored = await raw(StudentProfile, withBio);
    expect(stored.technicalSkills).toEqual(dashboardSample.technicalSkills);
    expect(stored.education).toHaveLength(1);
  });
});

describe("migrate-allowcontact-false: re-runs", () => {
  const insert = async (allowContact, createdAt = OLD_TIME) => {
    const { insertedId } = await ProfessionalProfile.collection.insertOne({
      userId: new mongoose.Types.ObjectId(),
      professionalHeadline: "Fake Headline For Rerun Tests",
      recruiterPreferences: { allowContact },
      createdAt,
      updatedAt: createdAt,
    });
    return { _id: insertedId };
  };

  it("dry run changes nothing; --apply twice gives the same result as once", async () => {
    const allowed = await insert(true);
    await insert(false);
    await insert(true, new Date("2026-10-07T09:00:00Z"));

    const before = await snapshot(ProfessionalProfile);
    expect(await migrateAllowContact({ before: BEFORE_DEPLOY, log })).toEqual({ matched: 1, updated: 0 });
    expect(await snapshot(ProfessionalProfile)).toEqual(before);

    expect(await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log })).toEqual({ matched: 1, updated: 1 });
    const afterOnce = await snapshot(ProfessionalProfile);
    expect((await raw(ProfessionalProfile, allowed)).allowContactMigratedAt).toBeInstanceOf(Date);

    expect(await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log })).toEqual({ matched: 0, updated: 0 });
    expect(await snapshot(ProfessionalProfile)).toEqual(afterOnce);
  });

  it("a professional who opts back in after the migration is not switched off by a re-run", async () => {
    const pro = await insert(true);
    await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log });
    await ProfessionalProfile.collection.updateOne({ _id: pro._id }, { $set: { "recruiterPreferences.allowContact": true } });

    expect(await migrateAllowContact({ apply: true, before: BEFORE_DEPLOY, log })).toEqual({ matched: 0, updated: 0 });
    expect((await raw(ProfessionalProfile, pro)).recruiterPreferences.allowContact).toBe(true);
  });
});
