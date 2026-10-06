/**
 * One-time migration: recruiter contact becomes opt-in (DPDP, approved by Ram).
 *
 * New professional profiles start with recruiterPreferences.allowContact = false. Profiles
 * created before that change were saved with true without the professional choosing it.
 * This sets those to false. Only profiles where allowContact is exactly true are touched,
 * and only that one field changes (updatedAt included: timestamps are left as they are).
 * Logs counts only, never emails or names.
 *
 * Only profiles created before --before are touched, so a professional who opts in after
 * the deploy isn't switched back off by a later run.
 *
 * Safe to re-run: the profiles to change are read once before anything is written, and
 * each changed profile gets allowContactMigratedAt (see lib/cleanupMarkers.js). Profiles
 * with that marker are never changed again, so a professional who opts back in after
 * being migrated keeps their choice even though their profile predates --before.
 * The marker also tells clean-fake-fresher-professional-profiles that this allowContact
 * value came from a script.
 *
 * Usage (from server/):
 *   node scripts/migrate-allowcontact-false.js --before=2026-10-06           # dry run
 *   node scripts/migrate-allowcontact-false.js --before=2026-10-06 --apply   # apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const { ALLOW_CONTACT_MIGRATED } = require("./lib/cleanupMarkers");

async function migrateAllowContact({ apply = false, before = null, log = console.log, now = new Date() } = {}) {
  const ALLOWED = {
    "recruiterPreferences.allowContact": true,
    [ALLOW_CONTACT_MIGRATED]: { $exists: false },
    ...(before ? { createdAt: { $lt: before } } : {}),
  };
  // Decide from this one read; the update below only touches these profiles.
  const ids = await ProfessionalProfile.find(ALLOWED).distinct("_id");
  const matched = ids.length;
  log(`${matched} professional profile(s) have recruiter contact allowed (allowContact: true).`);

  if (!apply) {
    log("Dry run: nothing changed. Re-run with --apply to set allowContact to false.");
    return { matched, updated: 0 };
  }

  const result = await ProfessionalProfile.updateMany(
    { _id: { $in: ids }, ...ALLOWED },
    { $set: { "recruiterPreferences.allowContact": false, [ALLOW_CONTACT_MIGRATED]: now } },
    { strict: false, timestamps: false }
  );
  log(`Set allowContact to false on ${result.modifiedCount} profile(s).`);
  return { matched, updated: result.modifiedCount };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const beforeArg = process.argv.find((arg) => arg.startsWith("--before="));
  const before = beforeArg ? new Date(beforeArg.slice("--before=".length)) : null;
  if (!before || Number.isNaN(before.getTime())) {
    throw new Error("Pass --before=<deploy date>, e.g. --before=2026-10-06");
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await migrateAllowContact({ apply, before });
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
