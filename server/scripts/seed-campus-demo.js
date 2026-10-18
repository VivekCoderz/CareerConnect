/**
 * Demo data for the campus portal (docs/campus/architecture.md, section 13).
 *
 * Creates the Sandip University demo tenant, batch MBA 2025-27, 57 sample students with
 * @demo.e2job.test emails, one manager, the 50-question MBA assessment (open now for 7 days)
 * and three training classes. With --with-results, 40 sample students also get a submitted,
 * marked and published test so the dashboards and reports show real-looking numbers.
 *
 * Safe by default: refuses to run unless the database is careerconnect_qa, or
 * --allow-production-demo is passed (only ever for the demo tenant). Re-running updates the
 * same records instead of creating duplicates. Sample data only; no real student is touched.
 *
 * Usage (from server/, with MONGODB_URI set):
 *   node scripts/seed-campus-demo.js [--with-results] [--extra-emails a@x.com,b@y.com] [--manager-email m@x.com]
 */
const mongoose = require("mongoose");
const User = require("../models/User");
const Institution = require("../campus/models/Institution");
const Batch = require("../campus/models/Batch");
const CampusMember = require("../campus/models/CampusMember");
const CampusAssessment = require("../campus/models/CampusAssessment");
const CampusAttempt = require("../campus/models/CampusAttempt");
const CampusGradingJob = require("../campus/models/CampusGradingJob");
const { CampusSession } = require("../campus/models/CampusSession");
const bank = require("../campus/data/mba-assessment-v1");
const { startAttempt, finalizeAttempt } = require("../campus/services/attempts");
const { recompute } = require("../campus/services/scoring");

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] || "" : null;
};
const has = (name) => process.argv.includes(name);

const FIRST = ["Aarav", "Diya", "Kabir", "Ananya", "Rohan", "Isha", "Vihaan", "Meera", "Arjun", "Saanvi", "Aditya", "Riya", "Kunal", "Pooja", "Siddharth", "Neha", "Yash", "Tanvi", "Harsh", "Sneha"];
const LAST = ["Patil", "Deshmukh", "Joshi", "Kulkarni", "Pawar", "Shinde", "Jadhav", "More", "Gaikwad", "Bhosale", "Chavan", "Kale"];
const rand = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rnd = rand(42);

const WRITTEN_SAMPLES = [
  "First I would check sales by region and channel and compare our price with the competitor. I would also ask retailers and customers why they switched. If price is the main reason, I would launch a smaller value pack and a two-week promotion in the weakest regions. I would also improve shelf presence in modern trade and stress our real fruit content in communication, so customers see why we cost more.",
  "I would meet the team one to one to understand workload and blockers, then re-plan the project with clear priorities and owners. Short weekly goals and a daily ten-minute check-in would help us catch delays early. I would remove low-value tasks and recognise good work openly.",
  "Many older customers worry about fraud and find apps hard to use. I would offer assisted sign-up in branches, a simple mode with large text, and clear safety messages. Family members could help through a referral offer. Success would be measured by active users above 50 and their monthly transactions.",
];

async function main() {
  const uri = process.env.MONGODB_URI || "";
  if (!/\/careerconnect_qa(\?|$)/.test(uri) && !has("--allow-production-demo")) {
    throw new Error("Refusing: MONGODB_URI is not the careerconnect_qa database. Pass --allow-production-demo only for the demo tenant.");
  }
  await mongoose.connect(uri);

  const institution = await Institution.findOneAndUpdate(
    { slug: "sandip" },
    {
      $set: {
        name: "Sandip University",
        shortName: "Sandip University",
        logoUrl: "/campus/sandip-logo.png",
        brandColor: "#8B1E24",
        programName: "MBA Assessment and Training Programme",
        helpContact: "support@e2job.com",
        status: "active",
      },
      $addToSet: {
        domains: { $each: ["sandip.e2job.com"] },
        allowedEmailDomains: { $each: ["sandipuniversity.edu.in", "demo.e2job.test"] },
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const batch = await Batch.findOneAndUpdate(
    { institutionId: institution._id, name: "MBA 2025-27" },
    { $setOnInsert: { institutionId: institution._id, name: "MBA 2025-27" } },
    { upsert: true, returnDocument: "after" }
  );

  const upsertMember = async ({ fullName, email, rollNo, cgpa, phone, role = "student", verified = false }) => {
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ fullName, email, userType: "student", role: "user", isEmailVerified: true, hasPassword: false, authProviders: ["google"] });
    const member = (await CampusMember.findOne({ institutionId: institution._id, email })) ||
      new CampusMember({ institutionId: institution._id, email, userId: user._id, importedAt: new Date() });
    Object.assign(member, { batchId: batch._id, fullName, rollNo, cgpa: role === "student" ? cgpa : null, phone, role, status: "active" });
    if (verified) member.verification = { status: "verified", by: null, at: new Date() };
    if (role === "manager") member.consentAt = member.consentAt || new Date();
    await member.save();
    return member;
  };

  const students = [];
  for (let i = 0; i < 57; i += 1) {
    const fullName = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    const cgpa = Math.round((5.2 + rnd() * 4.3) * 100) / 100;
    students.push(await upsertMember({
      fullName, email: `student${String(i + 1).padStart(2, "0")}@demo.e2job.test`, rollNo: `MBA25${String(i + 1).padStart(3, "0")}`,
      cgpa, phone: `98${String(10000000 + i * 1371).padStart(8, "0")}`, verified: i % 3 !== 0,
    }));
  }
  const extra = (arg("--extra-emails") || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  for (const [i, email] of extra.entries()) {
    await upsertMember({ fullName: `Demo Student ${i + 1}`, email, rollNo: `MBA25D${i + 1}`, cgpa: [5.5, 6.8, 8.4][i % 3], phone: "" });
    const domain = email.split("@")[1];
    await Institution.updateOne({ _id: institution._id }, { $addToSet: { allowedEmailDomains: domain } });
  }
  const managerEmail = (arg("--manager-email") || "manager@demo.e2job.test").toLowerCase();
  await upsertMember({ fullName: "University Portal Manager", email: managerEmail, rollNo: "", cgpa: null, phone: "", role: "manager" });
  if (managerEmail.split("@")[1] !== "demo.e2job.test") {
    await Institution.updateOne({ _id: institution._id }, { $addToSet: { allowedEmailDomains: managerEmail.split("@")[1] } });
  }

  const now = Date.now();
  const assessment = await CampusAssessment.findOneAndUpdate(
    { institutionId: institution._id, batchId: batch._id, title: bank.title },
    {
      $set: {
        instructions: bank.instructions,
        sections: bank.sections,
        questions: bank.questions,
        timeLimitMinutes: bank.timeLimitMinutes,
        opensAt: new Date(now - 60 * 60 * 1000),
        closesAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        status: "scheduled",
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  await CampusSession.deleteMany({ institutionId: institution._id, title: /^\[Demo\]/ });
  const at = (minutes) => new Date(now + minutes * 60 * 1000);
  await CampusSession.insertMany([
    { title: "[Demo] Orientation: how the programme works", band: null, startAt: at(-24 * 60), endAt: at(-23 * 60), trainerName: "E2Job Trainer" },
    { title: "[Demo] Quant foundations", band: 1, startAt: at(10), endAt: at(70), trainerName: "E2Job Trainer" },
    { title: "[Demo] Case interview practice", band: null, startAt: at(24 * 60), endAt: at(25 * 60), trainerName: "E2Job Trainer" },
  ].map((s) => ({ ...s, institutionId: institution._id, batchId: batch._id, meetUrl: "https://meet.google.com/abc-defg-hij", status: "scheduled" })));

  let attempts = 0;
  if (has("--with-results")) {
    await CampusAttempt.deleteMany({ assessmentId: assessment._id, memberId: { $in: students.map((s) => s._id) } });
    for (const member of students.slice(0, 40)) {
      member.consentAt = member.consentAt || new Date();
      await member.save();
      const { attempt } = await startAttempt(assessment, member);
      const skill = member.cgpa / 10;
      attempt.answers = bank.questions.filter((q) => q.type !== "speaking").map((q) => (q.type === "mcq"
        ? { questionId: q.id, optionId: rnd() < 0.35 + skill * 0.5 ? q.correctOptionId : q.options[Math.floor(rnd() * 4)].id }
        : { questionId: q.id, text: WRITTEN_SAMPLES[Number(q.id.slice(1)) - 47] }));
      attempt.proctor.countedEvents = rnd() < 0.15 ? 1 + Math.floor(rnd() * 2) : 0;
      await attempt.save();
      const done = await finalizeAttempt(attempt._id, "student");
      done.marks.forEach((m) => {
        if (m.status === "pending") Object.assign(m, { score: Math.round((0.4 + skill * 0.5 + rnd() * 0.1) * m.maxScore), status: "done", source: m.source === "ai" ? "ai" : "reviewer", reason: "Demo mark." });
      });
      done.markModified("marks");
      recompute(assessment, done);
      done.review.status = "reviewed";
      await done.save();
      attempts += 1;
    }
    await CampusGradingJob.deleteMany({ assessmentId: assessment._id });
    assessment.resultsPublishedAt = new Date();
    await assessment.save();
  }

  console.log(JSON.stringify({
    institution: institution.slug, batch: batch.name, students: students.length + extra.length, manager: managerEmail,
    assessment: String(assessment._id), questions: assessment.questions.length, sessions: 3, attemptsWithResults: attempts,
  }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
