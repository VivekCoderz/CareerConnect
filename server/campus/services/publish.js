const AuditLog = require("../../models/AuditLog");
const CampusAttempt = require("../models/CampusAttempt");
const { recompute, pendingItems } = require("./scoring");

// Releasing results (PRD R11), shared by staff (Review) and the university admin (dashboard).
// Every submitted, fully marked test not released yet is released. Tests still being taken wait
// for a later publish; pending marks block it, so nothing goes out unreviewed.

/** Counts for the publish button: what would be released now and what still blocks it. */
const publishState = async (assessment) => {
  const unreleased = await CampusAttempt.find({ assessmentId: assessment._id, releasedAt: null });
  const inProgress = unreleased.filter((a) => a.status === "in_progress").length;
  const ready = unreleased.filter((a) => a.status !== "in_progress");
  const pending = ready.filter((a) => pendingItems(a).length).length;
  return { unreleased, ready, inProgress, pending, toRelease: pending ? 0 : ready.length };
};

/** Returns { status, body } for the HTTP response. */
const publishResults = async (assessment, user) => {
  const { ready, inProgress, pending } = await publishState(assessment);
  if (pending) {
    return { status: 409, body: { success: false, code: "NOT_READY", message: `Not ready: ${pending} submitted test(s) still have marks pending.`, inProgress, pending } };
  }
  if (!ready.length) {
    return {
      status: 409,
      body: { success: false, code: "NOTHING_TO_PUBLISH", message: inProgress ? `Nothing to publish yet: ${inProgress} test(s) are still in progress.` : "Every submitted test is already published.", inProgress, pending: 0 },
    };
  }
  const now = new Date();
  for (const attempt of ready) {
    recompute(assessment, attempt);
    attempt.review.status = "reviewed";
    attempt.releasedAt = now;
    await attempt.save();
  }
  assessment.resultsPublishedAt = now;
  await assessment.save();
  AuditLog.create({
    actorId: user._id, actorName: user.fullName || "", actorEmail: user.email || "",
    action: "CAMPUS_RESULTS_PUBLISHED", module: "Campus", target: String(assessment._id), details: { attempts: ready.length, inProgress },
  }).catch(() => null);
  return { status: 200, body: { success: true, resultsPublishedAt: now, attempts: ready.length, inProgress } };
};

module.exports = { publishState, publishResults };
