/**
 * Clear sample data that studentController used to put into auto-created profiles (T04).
 *
 * Before T04, opening the student dashboard or profile without a StudentProfile created
 * one filled with sample skills, a "Geeta University" education entry and (dashboard
 * only) a career goal and job preferences. This script finds profiles that still hold
 * exactly one of those two sample sets and that the student has not otherwise edited.
 *
 * "Not edited" is judged from content, not timestamps: reading a profile re-saves its
 * completion score, so updatedAt changes without the student editing anything. A profile
 * is only cleared when its skills and education match a sample set exactly, careerGoal and
 * jobPreferences are unset or still the sample values, and bio, projects, certifications,
 * achievements and experience are empty. Near-matches are listed as skipped.
 *
 * Usage (from server/):
 *   node scripts/clean-fake-student-profiles.js           # dry run: lists matches
 *   node scripts/clean-fake-student-profiles.js --apply   # clear the sample fields
 */
require("dotenv").config();
const mongoose = require("mongoose");
const StudentProfile = require("../models/StudentProfile");

const SAMPLE_EDUCATION = {
  institution: "Geeta University",
  degree: "B.Tech Computer Science",
  startYear: 2024,
  endYear: 2028,
  currentlyStudying: true,
};

const SAMPLE_SETS = [
  {
    source: "dashboard",
    technicalSkills: ["JavaScript", "React", "Node.js", "Git"],
    softSkills: ["Communication", "Problem Solving", "Teamwork"],
    education: { ...SAMPLE_EDUCATION, fieldOfStudy: "Computer Science & Engineering" },
    careerGoal: "Full Stack Developer",
    jobPreferences: {
      preferredRoles: ["Full Stack Developer", "Frontend Developer"],
      preferredLocations: ["Bangalore", "Gurgaon", "Remote"],
      jobTypes: ["internship", "full-time"],
      remote: true,
    },
  },
  {
    source: "profile",
    technicalSkills: ["JavaScript", "React", "Node.js"],
    softSkills: [],
    education: { ...SAMPLE_EDUCATION, fieldOfStudy: "" },
    careerGoal: "",
    jobPreferences: null,
  },
];

const sameList = (a = [], b = []) => a.length === b.length && a.every((value, i) => value === b[i]);
const isEmpty = (value) => value === undefined || value === null || value === "" ||
  (Array.isArray(value) && value.length === 0);

const educationMatches = (education = [], sample) =>
  education.length === 1 &&
  Object.entries(sample).every(([key, value]) => (education[0][key] ?? "") === value);

const jobPreferencesUnset = (prefs) =>
  !prefs || ["preferredRoles", "preferredLocations", "jobTypes"].every((key) => isEmpty(prefs[key]));

const jobPreferencesMatch = (prefs, sample) =>
  Boolean(prefs && sample) &&
  ["preferredRoles", "preferredLocations", "jobTypes"].every((key) => sameList(prefs[key], sample[key])) &&
  prefs.remote === sample.remote;

// Returns { set, edited } when skills and education match a sample set, otherwise null.
function classifyProfile(profile) {
  const set = SAMPLE_SETS.find((sample) =>
    sameList(profile.technicalSkills, sample.technicalSkills) &&
    sameList(profile.softSkills, sample.softSkills) &&
    educationMatches(profile.education, sample.education)
  );
  if (!set) return null;

  const goalUntouched = isEmpty(profile.careerGoal) || profile.careerGoal === set.careerGoal;
  const prefsUntouched = jobPreferencesUnset(profile.jobPreferences) ||
    jobPreferencesMatch(profile.jobPreferences, set.jobPreferences);
  const otherContent = ["bio", "projects", "certifications", "achievements", "experience"]
    .some((field) => !isEmpty(profile[field]));

  return { set, edited: !goalUntouched || !prefsUntouched || otherContent };
}

function clearUpdate(profile, set) {
  const update = { $set: { technicalSkills: [], softSkills: [], education: [] }, $unset: {} };
  if (profile.careerGoal && profile.careerGoal === set.careerGoal) update.$unset.careerGoal = "";
  if (jobPreferencesMatch(profile.jobPreferences, set.jobPreferences)) update.$unset.jobPreferences = "";
  if (Object.keys(update.$unset).length === 0) delete update.$unset;
  return update;
}

async function cleanFakeStudentProfiles({ apply = false, log = console.log } = {}) {
  // Narrow in the database, then compare exactly in code.
  const candidates = await StudentProfile.find({
    "education.institution": SAMPLE_EDUCATION.institution,
    technicalSkills: { $all: ["JavaScript", "React", "Node.js"] },
  }).lean();

  const matches = [];
  const skipped = [];
  for (const profile of candidates) {
    const result = classifyProfile(profile);
    if (!result) continue;
    (result.edited ? skipped : matches).push({ profile, set: result.set });
  }

  log(`${matches.length} profile(s) still holding only the old sample data:`);
  matches.forEach(({ profile, set }) => log(`  - ${profile._id} (user ${profile.userId}, from ${set.source})`));
  if (skipped.length > 0) {
    log(`${skipped.length} profile(s) with sample skills/education but other edits (left alone):`);
    skipped.forEach(({ profile }) => log(`  - ${profile._id} (user ${profile.userId})`));
  }

  if (!apply) {
    log("");
    log("Dry run: nothing changed. Re-run with --apply to clear the sample fields.");
    return { matched: matches.length, skipped: skipped.length, cleared: 0, ids: matches.map((m) => String(m.profile._id)) };
  }

  let cleared = 0;
  for (const { profile, set } of matches) {
    // Only clear if the profile hasn't changed since it was read.
    const result = await StudentProfile.updateOne(
      { _id: profile._id, updatedAt: profile.updatedAt },
      clearUpdate(profile, set)
    );
    cleared += result.modifiedCount;
  }
  log("");
  log(`Cleared sample data from ${cleared} profile(s).`);
  return { matched: matches.length, skipped: skipped.length, cleared, ids: matches.map((m) => String(m.profile._id)) };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await cleanFakeStudentProfiles({ apply });
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

module.exports = { cleanFakeStudentProfiles, SAMPLE_SETS };
