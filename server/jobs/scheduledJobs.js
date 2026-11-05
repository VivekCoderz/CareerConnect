// The background jobs the worker (worker.js) runs. Each one is scheduled once in the
// agendaJobs collection and locked while it runs, so it runs exactly once per interval no
// matter how many web or worker instances are up. The web server (server.js) runs none.
//
// interval: an Agenda interval ("5 minutes") or a cron expression in `timezone`.
// skipImmediate: when first scheduled, wait for the first interval instead of running now.

const { sweepPastInterviews } = require("../services/interviewSweep");
const { closeExpiredListings } = require("../utils/listingExpiry");
const { clearSearchCache } = require("../services/jobScraperService");
const { runScheduledSyncIfDue } = require("../services/externalJobSync");
const { sendPendingDigests } = require("../services/emailDigest");

const isOff = (flag) => String(process.env[flag]).toLowerCase() === "false";

// Close Published jobs/internships whose deadline (end of day IST) has passed. Public
// lists already hide expired listings in between, so this only makes the stored status match.
const runListingExpirySweep = async () => {
  const result = await closeExpiredListings({ onChange: () => clearSearchCache() });
  if (result.jobs || result.internships) {
    console.log(`Closed expired listings: ${result.jobs} job(s), ${result.internships} internship(s)`);
  }
};

// One summary email per candidate of their rejections / closed positions.
const runEmailDigest = async () => {
  const sent = await sendPendingDigests();
  if (sent) console.log(`Application digest: sent ${sent} summary emails`);
};

const SCHEDULED_JOBS = [
  {
    // Mark interviews whose end time has passed as completed.
    name: "interview-sweep",
    interval: "5 minutes",
    run: () => sweepPastInterviews(),
  },
  {
    name: "listing-expiry",
    interval: "15 minutes",
    run: runListingExpirySweep,
  },
  {
    // Sync approved external job feeds (Remotive, Arbeitnow); the sync itself skips a run
    // until EXTERNAL_JOB_SYNC_INTERVAL_HOURS has passed. ENABLE_EXTERNAL_JOB_SYNC=false turns it off.
    name: "external-job-sync",
    interval: "30 minutes",
    enabled: () => !isOff("ENABLE_EXTERNAL_JOB_SYNC"),
    run: runScheduledSyncIfDue,
  },
  {
    name: "email-digest",
    interval: "0 18 * * *", // 6 PM IST
    timezone: "Asia/Kolkata",
    skipImmediate: true, // never at deploy time, only at 6 PM
    run: runEmailDigest,
  },
];

/** The jobs to schedule now (a job with `enabled` returning false is left out). */
const enabledJobs = (jobs = SCHEDULED_JOBS) => jobs.filter((job) => !job.enabled || job.enabled());

module.exports = { SCHEDULED_JOBS, enabledJobs, runListingExpirySweep, runEmailDigest };
