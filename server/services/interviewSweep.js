// Marks interviews whose end time has passed as "completed".
//
// Only interviews that could be over are loaded: active status AND scheduledAt (the start
// instant) <= now, served by the { status: 1, scheduledAt: 1 } index. getInterviewTimeDetails
// then confirms the end time has passed, and all completions are written in one bulkWrite
// (each interview gets its own completedAt = its end time). Older interviews saved without
// scheduledAt are handled in a small batch per run, and their scheduledAt is filled in so
// later runs find them through the index. AI interviews are never auto-completed.

const Interview = require("../models/Interview");
const socketService = require("./socketService");
const { getInterviewTimeDetails, computeScheduledAt } = require("../utils/interviewTimeUtils");

const ACTIVE_STATUSES = ["scheduled", "rescheduled", "Scheduled", "Rescheduled"];
const LEGACY_BATCH_LIMIT = 200;

// Fields getInterviewTimeDetails reads, plus ids for the socket event.
const SWEEP_FIELDS =
  "_id status scheduledDate startTime scheduledTime endTime duration durationMinutes " +
  "candidateId employerId applicationId interviewType interviewFormat";

// AI interviews finish when the candidate submits, not at the scheduled end time.
// (interviewFormat comes with the AI interview feature; interviewType covers older data.)
const NOT_AI = {
  interviewFormat: { $ne: "ai" },
  interviewType: { $not: /^ai\b/i },
};

/** Filter for interviews that may be over by `now`. Uses the { status, scheduledAt } index. */
const buildSweepFilter = (now = new Date()) => ({
  status: { $in: ACTIVE_STATUSES },
  scheduledAt: { $lte: now },
  ...NOT_AI,
});

/** Filter for older interviews saved before scheduledAt was filled in. */
const buildLegacyFilter = () => ({
  status: { $in: ACTIVE_STATUSES },
  scheduledAt: null,
  ...NOT_AI,
});

/**
 * Runs one sweep. Never throws; failures are logged once per run.
 * Returns { checked, completed, backfilled }.
 */
async function sweepPastInterviews({ now = new Date() } = {}) {
  const result = { checked: 0, completed: 0, backfilled: 0 };
  try {
    const [candidates, legacy] = await Promise.all([
      Interview.find(buildSweepFilter(now)).select(SWEEP_FIELDS).lean(),
      Interview.find(buildLegacyFilter()).select(SWEEP_FIELDS).sort({ _id: 1 }).limit(LEGACY_BATCH_LIMIT).lean(),
    ]);

    // Give older interviews a scheduledAt so later runs reach them through the index.
    const backfills = legacy
      .map((interview) => ({ interview, startAt: computeScheduledAt(interview) }))
      .filter(({ startAt }) => startAt)
      .map(({ interview, startAt }) => ({
        updateOne: { filter: { _id: interview._id, scheduledAt: null }, update: { $set: { scheduledAt: startAt } } },
      }));

    const pool = [...candidates, ...legacy];
    result.checked = pool.length;

    const finished = pool
      .map((interview) => ({ interview, details: getInterviewTimeDetails(interview, now) }))
      .filter(({ details }) => details.isTimePast);

    const completions = finished.map(({ interview, details }) => ({
      updateOne: {
        // Re-check the status so an interview rescheduled meanwhile isn't overwritten.
        filter: { _id: interview._id, status: { $in: ACTIVE_STATUSES } },
        update: { $set: { status: "completed", completedAt: details.endDateTime || now } },
      },
    }));

    if (backfills.length > 0) {
      result.backfilled = (await Interview.bulkWrite(backfills, { ordered: false })).modifiedCount;
    }
    if (completions.length > 0) {
      result.completed = (await Interview.bulkWrite(completions, { ordered: false })).modifiedCount;
      for (const { interview } of finished) {
        socketService.emitInterviewStatusUpdated(interview.candidateId, { ...interview, status: "completed" });
      }
    }
  } catch (err) {
    console.error("[interview sweep] Run failed:", err.message);
    result.error = err.message;
  }
  return result;
}

module.exports = {
  ACTIVE_STATUSES,
  LEGACY_BATCH_LIMIT,
  buildSweepFilter,
  buildLegacyFilter,
  sweepPastInterviews,
};
