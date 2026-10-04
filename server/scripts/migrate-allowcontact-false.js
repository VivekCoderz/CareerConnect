/**
 * One-time migration: recruiter contact becomes opt-in (DPDP, approved by Ram).
 *
 * New professional profiles start with recruiterPreferences.allowContact = false. Profiles
 * created before that change were saved with true without the professional choosing it.
 * This sets those to false. Only profiles where allowContact is exactly true are touched,
 * and only that one field changes (updatedAt included: timestamps are left as they are).
 * Logs counts only, never emails or names.
 *
 * Usage (from server/):
 *   node scripts/migrate-allowcontact-false.js           # dry run: prints the count
 *   node scripts/migrate-allowcontact-false.js --apply   # set allowContact to false
 */
require("dotenv").config();
const mongoose = require("mongoose");
const ProfessionalProfile = require("../models/ProfessionalProfile");

const ALLOWED = { "recruiterPreferences.allowContact": true };

async function migrateAllowContact({ apply = false, log = console.log } = {}) {
  const matched = await ProfessionalProfile.countDocuments(ALLOWED);
  log(`${matched} professional profile(s) have recruiter contact allowed (allowContact: true).`);

  if (!apply) {
    log("Dry run: nothing changed. Re-run with --apply to set allowContact to false.");
    return { matched, updated: 0 };
  }

  const result = await ProfessionalProfile.updateMany(
    ALLOWED,
    { $set: { "recruiterPreferences.allowContact": false } },
    { timestamps: false }
  );
  log(`Set allowContact to false on ${result.modifiedCount} profile(s).`);
  return { matched, updated: result.modifiedCount };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await migrateAllowContact({ apply });
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

module.exports = { migrateAllowContact };
