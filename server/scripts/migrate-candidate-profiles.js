// Copies the old studentprofiles / fresherprofiles / professionalprofiles collections into
// candidateprofiles. See docs/candidate-profile-migration.md for when and how to run it.
//
//   node scripts/migrate-candidate-profiles.js --dry-run          report only, no writes
//   node scripts/migrate-candidate-profiles.js                    copy, then check the counts
//   node scripts/migrate-candidate-profiles.js --limit 100        only the first 100 users
//   node scripts/migrate-candidate-profiles.js --user <userId>    only this user (repeatable)
//
// Exits with code 1 if the counts check fails. The old collections are only read.
const dns = require("dns");
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { migrateCandidateProfiles, formatReport } = require("../services/candidateProfileMigration");

const parseArgs = (argv) => {
  const options = { dryRun: false, userIds: null, limit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--limit") options.limit = Number(argv[++i]);
    else if (arg === "--user") (options.userIds ||= []).push(argv[++i]);
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.limit !== null && !(Number.isInteger(options.limit) && options.limit > 0)) {
    throw new Error("--limit needs a positive whole number");
  }
  for (const id of options.userIds || []) {
    if (!mongoose.isValidObjectId(id)) throw new Error(`Not a valid user id: ${id}`);
  }
  return options;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not set");
  await mongoose.connect(uri);
  try {
    console.log(`Database: ${mongoose.connection.name}`);
    const report = await migrateCandidateProfiles(options);
    console.log(formatReport(report));
    process.exitCode = report.ok ? 0 : 1;
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
