/**
 * Approve employers that existed before employer verification (S04) was introduced.
 *
 * Matches EmployerProfiles with no verificationStatus stored. Saving an old profile after
 * S04 is deployed can persist the default "pending", so pass --before=<S04 deploy date> to
 * also match never-reviewed "pending" profiles created before that date. Profiles an admin
 * has reviewed (verifiedBy set) are never touched.
 *
 * Usage (from server/):
 *   node scripts/approve-existing-employers.js                       # dry run: lists who would be approved
 *   node scripts/approve-existing-employers.js --before=2026-10-01   # dry run incl. pre-S04 "pending"
 *   node scripts/approve-existing-employers.js --before=2026-10-01 --apply
 */
require("dotenv").config();
const mongoose = require("mongoose");
const EmployerProfile = require("../models/EmployerProfile");
require("../models/User");

const legacyFilter = (before) => ({
  $or: [
    { verificationStatus: { $exists: false } },
    ...(before ? [{ verificationStatus: "pending", verifiedBy: null, createdAt: { $lt: before } }] : []),
  ],
});

async function approveLegacyEmployers({ apply = false, before = null, log = console.log } = {}) {
  const filter = legacyFilter(before);
  const employers = await EmployerProfile.find(filter)
    .select("_id companyName officialEmail userId createdAt")
    .populate("userId", "email fullName isActive")
    .sort({ createdAt: 1 })
    .lean();

  log(`${employers.length} existing employer(s) awaiting a first verification decision:`);
  for (const e of employers) {
    const owner = e.userId?.email || "(no user)";
    const inactive = e.userId && e.userId.isActive === false ? " [inactive account]" : "";
    const created = e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : "unknown";
    log(`  - ${e._id}  ${e.companyName || "(no company name)"}  <${e.officialEmail || owner}>  created ${created}${inactive}`);
  }

  if (!apply) {
    log("");
    log("Dry run: nothing changed. Re-run with --apply to approve these employers.");
    return { matched: employers.length, approved: 0 };
  }

  const result = await EmployerProfile.updateMany(
    { _id: { $in: employers.map((e) => e._id) }, ...filter },
    { $set: { verificationStatus: "approved", verifiedAt: new Date(), verifiedBy: null, rejectionReason: null } }
  );
  log("");
  log(`Approved ${result.modifiedCount} employer(s).`);
  return { matched: employers.length, approved: result.modifiedCount };
}

function parseBefore(argv) {
  const arg = argv.find((a) => a.startsWith("--before="));
  if (!arg) return null;
  const date = new Date(arg.slice("--before=".length));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --before date: ${arg}`);
  return date;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const before = parseBefore(process.argv);
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}${before ? `, created before ${before.toISOString()}` : ""}`);
  console.log("");
  try {
    await approveLegacyEmployers({ apply, before });
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

module.exports = { approveLegacyEmployers, legacyFilter };
