// Runs the scheduled jobs with Agenda on the app's own MongoDB (collection agendaJobs).
//
// Exactly once across instances:
// - each job is one "single" document per name (a unique index makes that hold even
//   when two workers start at the same moment), and
// - a worker locks the document before running it, so a second worker skips it.
// A schedule is only written when it is new or its interval changed, so a restart keeps
// the stored next run time, and a run missed while the worker was down (such as the
// 6 PM digest) still happens once when it comes back.

const Sentry = require("@sentry/node");
const { enabledJobs } = require("./scheduledJobs");

const COLLECTION = "agendaJobs";
const LOCK_LIFETIME_MS = 10 * 60 * 1000; // a crashed run is retried by another worker after this

/**
 * Starts processing the jobs and returns the Agenda instance (call agenda.drain() on shutdown).
 * @param {import("mongodb").Db} db - mongoose.connection.db
 * @param {object} [options]
 * @param {Array} [options.jobs] - job definitions; defaults to the enabled SCHEDULED_JOBS
 * @param {string|number} [options.processEvery] - how often to look for due jobs
 */
const startScheduler = async (db, { jobs = enabledJobs(), processEvery = "30 seconds" } = {}) => {
  // Agenda 6 is ESM-only.
  const [{ Agenda }, { MongoBackend }] = await Promise.all([import("agenda"), import("@agendajs/mongo-backend")]);

  await db.collection(COLLECTION).createIndex(
    { name: 1 },
    { name: "single_job_name_unique", unique: true, partialFilterExpression: { type: "single" } }
  );

  const agenda = new Agenda({
    backend: new MongoBackend({ mongo: db, collection: COLLECTION }),
    processEvery,
    defaultConcurrency: 1,
    maxConcurrency: Math.max(jobs.length, 1),
    defaultLockLifetime: LOCK_LIFETIME_MS,
  });

  for (const job of jobs) {
    agenda.define(job.name, async () => {
      await job.run();
    }, { concurrency: 1, lockLimit: 1 });
  }

  agenda.on("error", (err) => console.error("[worker] scheduler error:", err.message));
  agenda.on("fail", (err, job) => {
    const name = job?.attrs?.name || "unknown";
    console.error(`[worker] job ${name} failed:`, err?.message || err);
    Sentry.captureException(err, { tags: { job: name } }); // no-op without SENTRY_DSN
  });

  await agenda.start();

  const schedule = async (job) => {
    const existing = await db.collection(COLLECTION).findOne({ name: job.name, type: "single" });
    const unchanged = existing &&
      String(existing.repeatInterval) === String(job.interval) &&
      (existing.repeatTimezone || null) === (job.timezone || null);
    if (unchanged) return;
    // A new schedule runs right away (as the old startup runs did) unless the job opts out.
    await agenda.every(job.interval, job.name, undefined, {
      timezone: job.timezone,
      skipImmediate: Boolean(existing) || Boolean(job.skipImmediate),
    });
  };
  for (const job of jobs) {
    try {
      await schedule(job);
    } catch (err) {
      // Another worker created this schedule at the same moment (unique index); use theirs.
      if (err?.code !== 11000) throw err;
      await schedule(job);
    }
  }

  console.log(`[worker] scheduled jobs: ${jobs.map((j) => `${j.name} (${j.interval})`).join(", ") || "none"}`);
  return agenda;
};

module.exports = { startScheduler, COLLECTION };
