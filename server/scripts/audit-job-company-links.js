/**
 * Read-only audit (FL-01/02): jobs whose company link is missing or broken.
 *
 * A job belongs to a company page through employerId (the poster's EmployerProfile) and,
 * when the poster is linked to a Company, through companyId. This counts our own (not
 * external) jobs where:
 *   - employerId is empty               -> on no company page at all
 *   - employerId has no EmployerProfile -> on no company page at all
 *   - companyId is empty but the poster's user is linked to a Company
 *                                       -> missing from colleagues' views of that company
 *                                          (the employer dashboard backfills these on load)
 *   - companyId points at no Company    -> dangling reference
 * Logs counts and up to 20 job ids per group, never titles, names or emails. Changes nothing.
 *
 * Usage (from server/):
 *   node scripts/audit-job-company-links.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const Company = require("../models/Company");
const User = require("../models/User");

const SAMPLE = 20;

async function auditJobCompanyLinks({ log = console.log } = {}) {
  const jobs = await Job.find({ isExternal: { $ne: true } })
    .select("_id employerId companyId createdBy")
    .lean();

  const ids = (field) => [...new Set(jobs.map((j) => j[field]).filter(Boolean).map(String))];
  const [profiles, companies, users] = await Promise.all([
    EmployerProfile.find({ _id: { $in: ids("employerId") } }).select("_id").lean(),
    Company.find({ _id: { $in: ids("companyId") } }).select("_id").lean(),
    User.find({ _id: { $in: ids("createdBy") }, companyId: { $ne: null } }).select("_id").lean(),
  ]);
  const has = (docs) => new Set(docs.map((d) => String(d._id)));
  const profileIds = has(profiles);
  const companyIds = has(companies);
  const linkedUsers = has(users);

  const groups = {
    noEmployerId: jobs.filter((j) => !j.employerId),
    // Older listings store the poster's user id in employerId; those still resolve.
    unknownEmployerId: jobs.filter((j) => j.employerId && !profileIds.has(String(j.employerId)) && String(j.employerId) !== String(j.createdBy)),
    noCompanyIdButLinkedPoster: jobs.filter((j) => !j.companyId && j.createdBy && linkedUsers.has(String(j.createdBy))),
    unknownCompanyId: jobs.filter((j) => j.companyId && !companyIds.has(String(j.companyId))),
  };

  log(`Checked ${jobs.length} job(s).`);
  const summary = {};
  for (const [name, list] of Object.entries(groups)) {
    summary[name] = list.length;
    log(`${name}: ${list.length}${list.length ? ` (e.g. ${list.slice(0, SAMPLE).map((j) => j._id).join(", ")})` : ""}`);
  }
  return summary;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");
  await mongoose.connect(uri);
  try {
    await auditJobCompanyLinks();
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

module.exports = { auditJobCompanyLinks };
