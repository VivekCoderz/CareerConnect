/**
 * One-time migration: fill FresherProfile.preferences for freshers saved before it existed.
 *
 * The dashboard banner reads preferences.{targetRole, techStack, jobType, location}. Older
 * profiles have the role in targetRole / targetRoles / jobPreferences.preferredRoles, or
 * only in User.interests (signup saved the "areas of interest" there and nowhere else, so
 * the dashboard showed "Not set yet"). Each empty preference is filled from those, using
 * the same rules as the dashboard (backfillPreferences in utils/fresherPreferences.js).
 * The values that were found are also copied back to targetRole / jobPreferences, so the
 * rest of the app agrees with the banner.
 *
 * Safe to re-run: only profiles without preferencesSyncedAt are read, and every profile
 * this touches gets it, so a preference the fresher clears later is never filled again.
 * The dashboard does the same fill for one profile on first load, so freshers who log in
 * before this runs are covered too. Logs counts only, never names or emails.
 *
 * Usage (from server/):
 *   node scripts/migrate-fresher-preferences.js           # dry run
 *   node scripts/migrate-fresher-preferences.js --apply   # apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const FresherProfile = require("../models/FresherProfile");
const User = require("../models/User");
const { backfillPreferencesUpdate } = require("../utils/fresherPreferences");

async function migrateFresherPreferences({ apply = false, log = console.log, now = new Date() } = {}) {
  const NOT_SYNCED = { preferencesSyncedAt: { $exists: false } };
  const profiles = await FresherProfile.find(NOT_SYNCED);
  const users = new Map(
    (await User.find({ _id: { $in: profiles.map((p) => p.userId) } }).select("interests").lean())
      .map((u) => [String(u._id), u])
  );

  const updates = profiles.map((profile) => ({
    _id: profile._id,
    ...backfillPreferencesUpdate(profile, users.get(String(profile.userId)), now),
  }));
  const filled = updates.filter((u) => u.changed).length;
  log(`${profiles.length} fresher profile(s) not migrated yet; ${filled} get preferences from old fields or signup interests.`);

  if (!apply) {
    log("Dry run: nothing changed. Re-run with --apply to save.");
    return { matched: profiles.length, filled, updated: 0 };
  }

  let updated = 0;
  for (const { _id, set } of updates) {
    const result = await FresherProfile.updateOne({ _id, ...NOT_SYNCED }, { $set: set }, { timestamps: false });
    updated += result.modifiedCount;
  }
  log(`Migrated ${updated} profile(s).`);
  return { matched: profiles.length, filled, updated };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await migrateFresherPreferences({ apply });
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

module.exports = { migrateFresherPreferences };
