const mongoose = require("mongoose");
const CandidateProfile = require("../../models/CandidateProfile");
const StudentProfile = require("../../models/StudentProfile");
const FresherProfile = require("../../models/FresherProfile");
const ProfessionalProfile = require("../../models/ProfessionalProfile");
const User = require("../../models/User");
const { migrateCandidateProfiles, pickWinner, decideAction } = require("../../services/candidateProfileMigration");

const OLD = ["studentprofiles", "fresherprofiles", "professionalprofiles"];
const old = (name) => mongoose.connection.db.collection(name);
const archive = () => mongoose.connection.db.collection(CandidateProfile.ARCHIVE_COLLECTION);

let seq = 0;
const makeUser = (fields = {}) => {
  seq += 1;
  return User.create({
    fullName: `Candidate ${seq}`,
    email: `candidate${seq}@migration.test`,
    password: "Password123!",
    role: "user",
    userType: "student",
    ...fields,
  });
};
const at = (iso) => new Date(iso);

// Old profiles are inserted raw, as they sit in the old collections today.
const seed = async () => {
  const student = await makeUser({ userType: "student" });
  const fresher = await makeUser({ userType: "fresher" });
  const pro = await makeUser({ userType: "professional" });
  const twoProfiles = await makeUser({ userType: "fresher" });
  const employer = await makeUser({ role: "employer", userType: "employer" });

  await old("studentprofiles").insertMany([
    { userId: student._id, careerGoal: "Backend developer", technicalSkills: ["Node.js"], education: [], createdAt: at("2026-01-01"), updatedAt: at("2026-02-01") },
    // Same user also has a FresherProfile; userType is fresher, so the fresher one is kept.
    { userId: twoProfiles._id, careerGoal: "Old student goal", createdAt: at("2026-01-01"), updatedAt: at("2026-06-01") },
    { userId: new mongoose.Types.ObjectId(), careerGoal: "Orphan", createdAt: at("2026-01-01"), updatedAt: at("2026-01-02") },
    { userId: employer._id, careerGoal: "Employer with a stray profile", createdAt: at("2026-01-01"), updatedAt: at("2026-01-02") },
  ]);
  await old("fresherprofiles").insertMany([
    { userId: fresher._id, targetRole: "Data Analyst", profileVisibility: "private", createdAt: at("2026-01-01"), updatedAt: at("2026-03-01") },
    { userId: twoProfiles._id, targetRole: "QA Engineer", profileVisibility: "public", createdAt: at("2026-01-01"), updatedAt: at("2026-04-01") },
  ]);
  await old("professionalprofiles").insertMany([
    { userId: pro._id, careerGoal: { goal: "Lead a team", targetRole: "Engineering Manager" }, projects: [{ name: "Payments", description: "Rebuilt payments" }], createdAt: at("2026-01-01"), updatedAt: at("2026-05-01") },
  ]);
  return { student, fresher, pro, twoProfiles, employer };
};

const oldSnapshot = async () => Promise.all(OLD.map((name) => old(name).find().sort({ _id: 1 }).toArray()));

describe("candidate profile migration", () => {
  afterEach(async () => {
    for (const name of [...OLD, CandidateProfile.ARCHIVE_COLLECTION]) await old(name).deleteMany({});
  });

  it("dry run reports every old profile and writes nothing", async () => {
    await seed();
    const before = await oldSnapshot();

    const report = await migrateCandidateProfiles({ dryRun: true });

    expect(report.ok).toBe(true);
    expect(report.source).toEqual({ student: 4, fresher: 2, professional: 1 });
    expect(report.written).toEqual({ student: 1, fresher: 2, professional: 1 });
    expect(report.conflicts).toEqual({ student: 1, fresher: 0, professional: 0 });
    expect(report.skippedOrphan.student).toBe(1);
    expect(report.skippedNotCandidate.student).toBe(1);
    expect(report.totals).toEqual({ source: 7, accounted: 7 });
    expect(await CandidateProfile.countDocuments()).toBe(0);
    expect(await archive().countDocuments()).toBe(0);
    expect(await oldSnapshot()).toEqual(before);
  });

  it("copies each profile unchanged, keeps the old collections as they were, and the counts match", async () => {
    const { student, fresher, pro, twoProfiles } = await seed();
    const before = await oldSnapshot();

    const report = await migrateCandidateProfiles();

    expect(report.ok).toBe(true);
    expect(report.actual).toEqual({ student: 1, fresher: 2, professional: 1 });
    expect(await oldSnapshot()).toEqual(before); // old collections are only read

    const s = await StudentProfile.findOne({ userId: student._id }).lean();
    expect(s).toMatchObject({ candidateType: "student", careerGoal: "Backend developer", technicalSkills: ["Node.js"] });
    expect(String(s._id)).toBe(String(before[0][0]._id)); // same _id as the old document
    expect(s.updatedAt).toEqual(at("2026-02-01")); // timestamps kept
    expect(s.migratedFrom).toMatchObject({ collection: "studentprofiles", sourceUpdatedAt: at("2026-02-01") });

    expect(await FresherProfile.findOne({ userId: fresher._id }).lean()).toMatchObject({ targetRole: "Data Analyst", profileVisibility: "private" });
    // careerGoal is an Object for professionals and a String for students; both keep their shape.
    expect(await ProfessionalProfile.findOne({ userId: pro._id }).lean()).toMatchObject({
      careerGoal: { goal: "Lead a team", targetRole: "Engineering Manager" },
      projects: [expect.objectContaining({ name: "Payments" })],
    });

    // The user with two profiles keeps the one matching userType; the other is archived.
    expect(await CandidateProfile.findOne({ userId: twoProfiles._id }).lean()).toMatchObject({ candidateType: "fresher", targetRole: "QA Engineer" });
    expect(await StudentProfile.findOne({ userId: twoProfiles._id })).toBeNull();
    const archived = await archive().findOne({ userId: twoProfiles._id });
    expect(archived).toMatchObject({ reason: "migration-conflict", collection: "studentprofiles", keptCollection: "fresherprofiles" });
    expect(archived.doc.careerGoal).toBe("Old student goal");

    // No profile for the orphan or the employer.
    expect(await CandidateProfile.countDocuments()).toBe(4);
  });

  it("is re-runnable: unchanged profiles are skipped, edits in the new collection are never overwritten", async () => {
    const { student, fresher, pro } = await seed();
    await migrateCandidateProfiles({ now: at("2026-11-01") });

    // A candidate edits their profile through the app after the migration...
    await StudentProfile.updateOne({ userId: student._id }, { $set: { careerGoal: "Edited after migration" } });
    // ...and an old profile changes (the old app was still running between runs).
    await old("professionalprofiles").updateOne({ userId: pro._id }, { $set: { professionalSummary: "Late edit", updatedAt: at("2026-11-02") } });

    const report = await migrateCandidateProfiles({ now: at("2026-11-03") });

    expect(report.ok).toBe(true);
    expect(report.keptNewer.student).toBe(1);
    expect(report.unchanged.fresher).toBe(2);
    expect(report.written.professional).toBe(1);
    expect((await StudentProfile.findOne({ userId: student._id }).lean()).careerGoal).toBe("Edited after migration");
    expect((await ProfessionalProfile.findOne({ userId: pro._id }).lean()).professionalSummary).toBe("Late edit");
    expect(await FresherProfile.countDocuments({ userId: fresher._id })).toBe(1);
    expect(await archive().countDocuments()).toBe(1); // the conflict isn't archived twice
  });

  it("--user limits the run to one user", async () => {
    const { pro } = await seed();
    const report = await migrateCandidateProfiles({ userIds: [String(pro._id)] });
    expect(report.ok).toBe(true);
    expect(report.source).toEqual({ student: 0, fresher: 0, professional: 1 });
    expect(await CandidateProfile.countDocuments()).toBe(1);
  });

  it("--limit counts only the processed users' profiles", async () => {
    await seed();
    const report = await migrateCandidateProfiles({ dryRun: true, limit: 2 });
    expect(report.ok).toBe(true);
    expect(report.totals.source).toBe(report.totals.accounted);
  });
});

describe("candidate profile migration helpers", () => {
  const e = (candidateType, updatedAt) => ({ candidateType, collection: `${candidateType}profiles`, _id: new mongoose.Types.ObjectId(), updatedAt: at(updatedAt) });

  it("pickWinner prefers the userType, else the most recently updated", () => {
    const s = e("student", "2026-06-01");
    const f = e("fresher", "2026-01-01");
    expect(pickWinner([s, f], "fresher").winner).toBe(f);
    expect(pickWinner([s, f], "professional").winner).toBe(s);
    expect(pickWinner([s, f], "fresher").losers).toEqual([s]);
  });

  it("decideAction never overwrites a document the app created or changed", () => {
    const source = { _id: new mongoose.Types.ObjectId(), updatedAt: at("2026-01-01") };
    expect(decideAction(source, "studentprofiles", null)).toBe("write");
    expect(decideAction(source, "studentprofiles", { updatedAt: at("2026-12-01") })).toBe("keptNewer");
    const copied = { updatedAt: at("2026-01-01"), migratedFrom: { collection: "studentprofiles", sourceId: source._id, sourceUpdatedAt: at("2026-01-01"), migratedAt: at("2026-11-01") } };
    expect(decideAction(source, "studentprofiles", copied)).toBe("unchanged");
    expect(decideAction(source, "studentprofiles", { ...copied, updatedAt: at("2026-11-05") })).toBe("keptNewer");
    expect(decideAction({ ...source, updatedAt: at("2026-11-04") }, "studentprofiles", copied)).toBe("write");
  });
});

describe("one candidate profile per user", () => {
  it("creating a profile of a new type archives the user's profile of the old type", async () => {
    const user = await makeUser({ userType: "fresher" });
    await StudentProfile.create({ userId: user._id, careerGoal: "Was a student" });

    await FresherProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true });

    expect(await CandidateProfile.countDocuments({ userId: user._id })).toBe(1);
    expect((await CandidateProfile.findOne({ userId: user._id }).lean()).candidateType).toBe("fresher");
    expect(await archive().findOne({ userId: user._id, reason: "type-changed" })).toMatchObject({ candidateType: "student", newCandidateType: "fresher" });
    await archive().deleteMany({});
  });

  it("all three types live in candidateprofiles", async () => {
    expect(StudentProfile.collection.name).toBe("candidateprofiles");
    expect(FresherProfile.collection.name).toBe("candidateprofiles");
    expect(ProfessionalProfile.collection.name).toBe("candidateprofiles");
  });
});
