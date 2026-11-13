// Copies studentprofiles, fresherprofiles and professionalprofiles into candidateprofiles
// (models/CandidateProfile.js). Run it with scripts/migrate-candidate-profiles.js.
//
// - Reads the old collections only; never writes to them.
// - Copies each profile unchanged (same _id and fields) and adds candidateType and
//   migratedFrom { collection, sourceId, sourceUpdatedAt, migratedAt }.
// - Re-runnable: a profile already copied from the same source version is left alone, and
//   one changed in candidateprofiles since it was copied is never overwritten (reported).
// - One profile per user: if a user has profiles in more than one old collection, the one
//   matching User.userType is copied (else the most recently updated); the others are
//   copied to candidateprofile_archive with reason "migration-conflict".
// - Skipped and reported: profiles whose user doesn't exist, or isn't a candidate.
// - Counts check: every old profile is counted exactly once, and the per-type counts in
//   candidateprofiles match what was copied. A failed check sets `ok: false`.

const mongoose = require("mongoose");
const CandidateProfile = require("../models/CandidateProfile");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const User = require("../models/User");

const { ARCHIVE_COLLECTION } = CandidateProfile;
const BATCH_SIZE = 500;
const MAX_LISTED = 20; // ids listed per report section

const SOURCES = [
  { collection: "studentprofiles", candidateType: "student", Model: StudentProfile },
  { collection: "fresherprofiles", candidateType: "fresher", Model: FresherProfile },
  { collection: "professionalprofiles", candidateType: "professional", Model: ProfessionalProfile },
];
const NON_CANDIDATE_TYPES = ["employer", "admin"];

const sameTime = (a, b) => (a ? new Date(a).getTime() : null) === (b ? new Date(b).getTime() : null);

/**
 * Picks the profile to copy for one user.
 * @param {Array<{collection, candidateType, _id, updatedAt}>} entries - that user's old profiles
 * @param {string} [userType]
 * @returns {{ winner, losers }}
 */
const pickWinner = (entries, userType) => {
  const sorted = [...entries].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const winner = sorted.find((e) => e.candidateType === userType) || sorted[0];
  return { winner, losers: sorted.filter((e) => e !== winner) };
};

/** The candidateprofiles document for one old profile: unchanged fields plus type and origin. */
const buildCandidateDoc = (source, { collection, candidateType }, migratedAt) => ({
  ...source,
  candidateType,
  migratedFrom: {
    collection,
    sourceId: source._id,
    sourceUpdatedAt: source.updatedAt || null,
    migratedAt,
  },
});

/**
 * What to do with an old profile, given what candidateprofiles holds for that user.
 * @returns {"write" | "unchanged" | "keptNewer"}
 */
const decideAction = (source, collection, existing) => {
  if (!existing) return "write";
  const from = existing.migratedFrom;
  // Created by the app in candidateprofiles, not by this script: never overwrite.
  if (!from?.migratedAt) return "keptNewer";
  // Changed in candidateprofiles after it was copied: never overwrite.
  if (existing.updatedAt && new Date(existing.updatedAt) > new Date(from.migratedAt)) return "keptNewer";
  if (from.collection === collection && String(from.sourceId) === String(source._id) &&
      sameTime(from.sourceUpdatedAt, source.updatedAt)) {
    return "unchanged";
  }
  return "write"; // the old profile changed since the last run (or a different one won)
};

const listPush = (list, value) => {
  if (list.length < MAX_LISTED) list.push(String(value));
};

/**
 * Runs the migration (or, with dryRun, everything except the writes).
 * @param {object} [options]
 * @param {boolean} [options.dryRun]
 * @param {string[]} [options.userIds] - only these users
 * @param {number} [options.limit] - only the first N users (sorted by id)
 * @param {Date} [options.now]
 */
const migrateCandidateProfiles = async ({ dryRun = false, userIds = null, limit = null, now = new Date() } = {}) => {
  const db = mongoose.connection.db;
  const target = CandidateProfile.collection;
  const archive = db.collection(ARCHIVE_COLLECTION);
  if (!dryRun) await CandidateProfile.init(); // unique userId index before any write

  const onlyUsers = userIds ? userIds.map((id) => new mongoose.Types.ObjectId(String(id))) : null;
  const sourceFilter = onlyUsers ? { userId: { $in: onlyUsers } } : {};

  const report = {
    dryRun,
    source: {},
    written: {}, unchanged: {}, keptNewer: {}, conflicts: {}, skippedOrphan: {}, skippedNotCandidate: {},
    typeMismatch: 0,
    validationWarnings: 0,
    expected: {}, actual: {},
    lists: { conflicts: [], skippedOrphan: [], skippedNotCandidate: [], keptNewer: [], typeMismatch: [], validationWarnings: [] },
    samples: {},
  };
  for (const { candidateType } of SOURCES) {
    for (const key of ["written", "unchanged", "keptNewer", "conflicts", "skippedOrphan", "skippedNotCandidate", "expected"]) {
      report[key][candidateType] = 0;
    }
  }

  // 1. Every old profile's id, user and updatedAt, grouped by user.
  const byUser = new Map();
  const noUserId = [];
  for (const source of SOURCES) {
    report.source[source.candidateType] = await db.collection(source.collection).countDocuments(sourceFilter);
    const cursor = db.collection(source.collection)
      .find(sourceFilter, { projection: { _id: 1, userId: 1, updatedAt: 1 } })
      .batchSize(BATCH_SIZE);
    for await (const doc of cursor) {
      const entry = { ...source, _id: doc._id, updatedAt: doc.updatedAt };
      if (!doc.userId) {
        noUserId.push(entry);
        continue;
      }
      const key = String(doc.userId);
      if (!byUser.has(key)) byUser.set(key, { userId: doc.userId, entries: [] });
      byUser.get(key).entries.push(entry);
    }
  }
  // With --limit only the first N users' profiles are counted, so these aren't.
  for (const entry of limit ? [] : noUserId) {
    report.skippedOrphan[entry.candidateType] += 1;
    listPush(report.lists.skippedOrphan, `${entry.collection}:${entry._id} (no userId)`);
  }

  let users = [...byUser.values()].sort((a, b) => String(a.userId).localeCompare(String(b.userId)));
  if (limit) {
    const kept = users.slice(0, limit);
    // --limit: count only the profiles of the users being processed.
    for (const source of SOURCES) report.source[source.candidateType] = 0;
    for (const u of kept) for (const e of u.entries) report.source[e.candidateType] += 1;
    users = kept;
  }

  // 2. Per batch of users: decide, then copy.
  const expectedIds = { student: [], fresher: [], professional: [] };
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const accounts = await User.find({ _id: { $in: batch.map((u) => u.userId) } })
      .select("role userType").lean();
    const accountById = new Map(accounts.map((a) => [String(a._id), a]));
    const existing = await target.find({ userId: { $in: batch.map((u) => u.userId) } }).toArray();
    const existingByUser = new Map(existing.map((d) => [String(d.userId), d]));

    const winners = [];
    for (const { userId, entries } of batch) {
      const account = accountById.get(String(userId));
      if (!account) {
        for (const e of entries) {
          report.skippedOrphan[e.candidateType] += 1;
          listPush(report.lists.skippedOrphan, `${e.collection}:${e._id}`);
        }
        continue;
      }
      if (account.role !== "user" || NON_CANDIDATE_TYPES.includes(account.userType)) {
        for (const e of entries) {
          report.skippedNotCandidate[e.candidateType] += 1;
          listPush(report.lists.skippedNotCandidate, `${e.collection}:${e._id} (role ${account.role}, userType ${account.userType})`);
        }
        continue;
      }
      const { winner, losers } = pickWinner(entries, account.userType);
      if (winner.candidateType !== account.userType) {
        report.typeMismatch += 1;
        listPush(report.lists.typeMismatch, `${userId} (profile ${winner.candidateType}, userType ${account.userType})`);
      }
      for (const loser of losers) {
        report.conflicts[loser.candidateType] += 1;
        listPush(report.lists.conflicts, `${userId}: kept ${winner.collection}, archived ${loser.collection}:${loser._id}`);
      }
      winners.push({ userId, winner, losers });
    }

    // Full documents for this batch's winners and losers, read from the old collections.
    const fullDocs = new Map();
    for (const source of SOURCES) {
      const ids = winners.flatMap(({ winner, losers }) => [winner, ...losers])
        .filter((e) => e.collection === source.collection).map((e) => e._id);
      if (!ids.length) continue;
      for (const doc of await db.collection(source.collection).find({ _id: { $in: ids } }).toArray()) {
        fullDocs.set(`${source.collection}:${doc._id}`, doc);
      }
    }

    const writes = [];
    const archived = [];
    for (const { userId, winner, losers } of winners) {
      const source = fullDocs.get(`${winner.collection}:${winner._id}`);
      const current = existingByUser.get(String(userId));
      const action = decideAction(source, winner.collection, current);
      const type = winner.candidateType;
      expectedIds[type].push(userId);
      report.expected[type] += 1;

      if (action === "unchanged") report.unchanged[type] += 1;
      else if (action === "keptNewer") {
        report.keptNewer[type] += 1;
        listPush(report.lists.keptNewer, `${userId} (${winner.collection}:${winner._id})`);
      } else {
        report.written[type] += 1;
        const doc = buildCandidateDoc(source, winner, now);
        const invalid = await new winner.Model(doc).validate().then(() => null, (err) => err);
        if (invalid) {
          // Copied anyway: the app reads it today without validating, so skipping would hide
          // the profile. Listed so it can be fixed.
          report.validationWarnings += 1;
          listPush(report.lists.validationWarnings, `${winner.collection}:${winner._id}: ${Object.keys(invalid.errors || {}).join(", ") || invalid.message}`);
        }
        if (!report.samples[type]) report.samples[type] = Object.keys(doc).sort();
        writes.push({ doc, current });
      }

      for (const loser of losers) {
        archived.push({
          reason: "migration-conflict",
          userId,
          candidateType: loser.candidateType,
          collection: loser.collection,
          sourceId: loser._id,
          keptCollection: winner.collection,
          archivedAt: now,
          doc: fullDocs.get(`${loser.collection}:${loser._id}`),
        });
      }
    }

    if (dryRun) continue;
    for (const { doc, current } of writes) {
      if (current && !current._id.equals(doc._id)) {
        // A different old profile won this time; _id can't change in place.
        await target.deleteOne({ _id: current._id });
        await target.insertOne(doc);
      } else {
        await target.replaceOne({ _id: doc._id }, doc, { upsert: true });
      }
    }
    for (const entry of archived) {
      await archive.replaceOne(
        { reason: entry.reason, collection: entry.collection, sourceId: entry.sourceId },
        entry,
        { upsert: true }
      );
    }
  }

  // 3. Counts check.
  const sum = (key) => Object.values(report[key]).reduce((a, b) => a + b, 0);
  const totalSource = sum("source");
  const accounted = sum("written") + sum("unchanged") + sum("keptNewer") + sum("conflicts") +
    sum("skippedOrphan") + sum("skippedNotCandidate");
  const problems = [];
  if (totalSource !== accounted) {
    problems.push(`old profiles ${totalSource} != written + unchanged + keptNewer + conflicts + skipped ${accounted}`);
  }
  for (const { candidateType } of SOURCES) {
    const perType = report.source[candidateType] - report.conflicts[candidateType] -
      report.skippedOrphan[candidateType] - report.skippedNotCandidate[candidateType];
    if (perType !== report.expected[candidateType]) {
      problems.push(`${candidateType}: old ${report.source[candidateType]} - conflicts - skipped = ${perType}, expected ${report.expected[candidateType]}`);
    }
    if (dryRun) continue;
    // Each copied user must now have a candidateprofiles document of that type.
    let actual = 0;
    const ids = expectedIds[candidateType];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      actual += await target.countDocuments({ candidateType, userId: { $in: ids.slice(i, i + BATCH_SIZE) } });
    }
    report.actual[candidateType] = actual;
    if (actual !== report.expected[candidateType]) {
      problems.push(`${candidateType}: candidateprofiles has ${actual}, expected ${report.expected[candidateType]}`);
    }
  }
  report.totals = { source: totalSource, accounted };
  report.problems = problems;
  report.ok = problems.length === 0;
  return report;
};

/** The report as text for the console. */
const formatReport = (report) => {
  const types = SOURCES.map((s) => s.candidateType);
  const row = (label, key) => `${label.padEnd(24)}${types.map((t) => String(report[key][t] ?? "-").padStart(14)).join("")}`;
  const lines = [
    report.dryRun ? "DRY RUN: nothing was written." : "Migration run.",
    "",
    `${"".padEnd(24)}${types.map((t) => t.padStart(14)).join("")}`,
    row("old profiles", "source"),
    row(report.dryRun ? "would copy" : "copied", "written"),
    row("already copied", "unchanged"),
    row("newer in new collection", "keptNewer"),
    row("conflicts (archived)", "conflicts"),
    row("skipped: no user", "skippedOrphan"),
    row("skipped: not candidate", "skippedNotCandidate"),
    row("expected in new", "expected"),
  ];
  if (!report.dryRun) lines.push(row("found in new", "actual"));
  lines.push(
    "",
    `Every old profile counted once: ${report.totals.source} old, ${report.totals.accounted} accounted for.`,
    `Profile type differs from User.userType: ${report.typeMismatch}`,
    `Copied with schema validation warnings: ${report.validationWarnings}`,
  );
  for (const [name, list] of Object.entries(report.lists)) {
    if (list.length) lines.push("", `${name} (first ${MAX_LISTED}):`, ...list.map((l) => `  ${l}`));
  }
  if (report.dryRun) {
    for (const [type, keys] of Object.entries(report.samples)) {
      lines.push("", `Fields of a copied ${type} profile: ${keys.join(", ")}`);
    }
  }
  lines.push("", report.ok ? "Counts check: OK" : `Counts check: FAILED\n  ${report.problems.join("\n  ")}`);
  return lines.join("\n");
};

module.exports = {
  SOURCES,
  pickWinner,
  buildCandidateDoc,
  decideAction,
  migrateCandidateProfiles,
  formatReport,
};
