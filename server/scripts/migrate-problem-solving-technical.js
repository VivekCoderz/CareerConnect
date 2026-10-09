/**
 * One-time migration (CC-02): "Problem Solving" is a technical skill, not a soft skill.
 *
 * Profiles saved before the fix keep it in their soft-skill list. This moves it, under any
 * spelling ("problem solving", "Problem-Solving", ...), to the technical list the profile
 * page shows it under:
 *   student       softSkills         -> technicalSkills
 *   fresher       skills.softSkills  -> skills.technical
 *   professional  skills.softSkills  -> skills.management
 * Fresher and professional items keep their proficiency. Nothing else changes (updatedAt
 * included). If the technical list already has it, it is only removed from soft skills.
 * Logs counts only, never names or emails.
 *
 * Run it AFTER clean-fake-student-profiles and clean-fake-fresher-professional-profiles:
 * those recognise the old sample data by its exact soft-skill list, which includes
 * "Problem Solving".
 *
 * Safe to re-run: a profile with no Problem Solving soft skill is not touched.
 *
 * Usage (from server/):
 *   node scripts/migrate-problem-solving-technical.js           # dry run
 *   node scripts/migrate-problem-solving-technical.js --apply   # apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const { normalizeSkill } = require("../utils/skills");

const PROBLEM_SOLVING = normalizeSkill("Problem Solving");
// Narrows the read; isProblemSolving decides.
const NAME_PATTERN = /problem\W*solving/i;

const nameOf = (s) => (typeof s === "string" ? s : s?.name);
const isProblemSolving = (s) => normalizeSkill(nameOf(s)) === PROBLEM_SOLVING;

const TARGETS = [
  { label: "student", Model: StudentProfile, soft: "softSkills", technical: "technicalSkills", nameField: "softSkills" },
  { label: "fresher", Model: FresherProfile, soft: "skills.softSkills", technical: "skills.technical", nameField: "skills.softSkills.name" },
  { label: "professional", Model: ProfessionalProfile, soft: "skills.softSkills", technical: "skills.management", nameField: "skills.softSkills.name" },
];

const get = (doc, path) => path.split(".").reduce((v, key) => v?.[key], doc) || [];

async function migrateProblemSolving({ apply = false, log = console.log } = {}) {
  const summary = {};
  for (const { label, Model, soft, technical, nameField } of TARGETS) {
    const profiles = await Model.collection
      .find({ [nameField]: NAME_PATTERN }, { projection: { [soft]: 1, [technical]: 1 } })
      .toArray();

    let matched = 0;
    let updated = 0;
    for (const profile of profiles) {
      const softList = get(profile, soft);
      const moving = softList.filter(isProblemSolving);
      if (moving.length === 0) continue;
      matched += 1;
      if (!apply) continue;

      const technicalList = get(profile, technical);
      const nextTechnical = technicalList.some(isProblemSolving) ? technicalList : [...technicalList, moving[0]];
      const result = await Model.collection.updateOne(
        { _id: profile._id },
        { $set: { [soft]: softList.filter((s) => !isProblemSolving(s)), [technical]: nextTechnical } }
      );
      updated += result.modifiedCount;
    }
    log(`${label}: ${matched} profile(s) list Problem Solving as a soft skill${apply ? `; moved on ${updated}` : ""}.`);
    summary[label] = { matched, updated };
  }
  if (!apply) log("Dry run: nothing changed. Re-run with --apply to move it.");
  return summary;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await migrateProblemSolving({ apply });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
}

module.exports = { migrateProblemSolving };
