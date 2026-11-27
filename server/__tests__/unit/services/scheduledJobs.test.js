// The worker's job list (jobs/scheduledJobs.js). The run-once-across-instances behaviour
// is checked by `npm run test:scheduler`, which runs Agenda outside Jest.
const fs = require("fs");
const path = require("path");
const { SCHEDULED_JOBS, enabledJobs } = require("../../../jobs/scheduledJobs");

describe("scheduled jobs", () => {
  afterEach(() => {
    delete process.env.ENABLE_EXTERNAL_JOB_SYNC;
  });

  it("schedules the interview sweep, listing expiry, external job sync and 6 PM digest", () => {
    expect(SCHEDULED_JOBS.map((j) => [j.name, j.interval])).toEqual([
      ["interview-sweep", "5 minutes"],
      ["listing-expiry", "15 minutes"],
      ["external-job-sync", "30 minutes"],
      ["email-digest", "0 18 * * *"],
    ]);
    expect(new Set(SCHEDULED_JOBS.map((j) => j.name)).size).toBe(SCHEDULED_JOBS.length);
  });

  it("runs the digest at 6 PM India time and never at deploy time", () => {
    const digest = SCHEDULED_JOBS.find((j) => j.name === "email-digest");
    expect(digest).toMatchObject({ timezone: "Asia/Kolkata", skipImmediate: true });
  });

  it("leaves out the external job sync when ENABLE_EXTERNAL_JOB_SYNC=false", () => {
    expect(enabledJobs().map((j) => j.name)).toContain("external-job-sync");
    process.env.ENABLE_EXTERNAL_JOB_SYNC = "false";
    expect(enabledJobs().map((j) => j.name)).toEqual(["interview-sweep", "listing-expiry", "email-digest"]);
  });

  it("the web server no longer starts any timers of its own", () => {
    const server = fs.readFileSync(path.join(__dirname, "../../../server.js"), "utf8");
    expect(server).not.toMatch(/setInterval|startEmailDigestScheduler|startExternalJobSyncSchedule|sweepPastInterviews/);
  });
});
