# Background worker

The scheduled jobs run in a separate **worker service**, not in the web server. The worker uses [Agenda](https://github.com/agenda/agenda) on the app's existing MongoDB, so no new database or service is needed beyond the worker process itself.

**Done when:** with 2 web instances on staging, each scheduled job runs exactly once.

## What runs where

| Process | Start command | Runs |
|---|---|---|
| Web (`server/server.js`) | `npm start` | HTTP API and Socket.IO only. No timers. |
| Worker (`server/worker.js`) | `npm run worker` | The jobs below. |

| Job | When | Code |
|---|---|---|
| `interview-sweep` | every 5 minutes | `services/interviewSweep.js` |
| `listing-expiry` | every 15 minutes | `utils/listingExpiry.js` |
| `external-job-sync` | checked every 30 minutes; syncs once `EXTERNAL_JOB_SYNC_INTERVAL_HOURS` (default 6) has passed. Off with `ENABLE_EXTERNAL_JOB_SYNC=false`. | `services/externalJobSync.js` |
| `email-digest` | 6 PM IST daily | `services/emailDigest.js` |

The job list is `server/jobs/scheduledJobs.js`. The Agenda setup is `server/jobs/scheduler.js`.

## Why each job runs once

- Each job is one document in the `agendaJobs` collection. A unique index on the job name stops two workers that start at the same moment from creating two schedules.
- A worker locks a job's document before running it, so another worker, or a second copy of the worker, skips it.
- The web instances run no jobs at all, so adding web instances never adds job runs.
- A restart keeps the stored next run time. A run that was missed while the worker was down (for example the 6 PM digest during a deploy) runs once when the worker comes back.
- If a worker dies mid-run, the lock expires after 10 minutes and another worker runs the job.

`npm run test:scheduler` checks this. It starts two workers on an in-memory MongoDB, counts every run, and fails if a job ran twice in one interval. CI runs it on every PR.

## Behaviour changes

- **Interview sweep live update:** when the sweep marks an interview completed, it used to push a Socket.IO event from the web server. The worker has no Socket.IO connections, so that push is skipped; the candidate sees "completed" on the next page load or refresh. The interview data itself is unchanged.
- **Search cache:** the listing expiry and external job sync clear the in-memory search cache in the worker, not in the web instances. Each web instance's cache still expires on its own (about 30 minutes), so a newly synced external listing can take up to that long to appear in search. Expired listings are already filtered out when lists are read.

## Render setup

The worker needs a **Background Worker** service on Render. Background Workers are not available on the free plan (Starter or above).

1. *New → Background Worker*, from the same repository.
2. **Root directory** `server`, **build command** `npm ci`, **start command** `npm run worker`.
3. **Branch:** `hardening` for staging, `main` for production (the same branch as the web service it pairs with).
4. **Environment variables:** copy all of them from the paired web service, so the jobs see the same settings. The ones the jobs use are `MONGODB_URI`, `CLIENT_URL` (links in emails), the email settings (`BREVO_*`, `FALLBACK_EMAIL_*`, `EMAIL_USER`, `EMAIL_REPLY_TO`, `NOTIFICATION_EMAIL_DAILY_BUDGET`), `SENTRY_*`, `ENABLE_EXTERNAL_JOB_SYNC` and `EXTERNAL_JOB_SYNC_INTERVAL_HOURS`. On staging, also `APP_ENV` and `STAGING_EMAIL_ALLOWLIST` (H02). The worker doesn't listen on a port.
5. The logs should show `MongoDB Connected`, then `[worker] scheduled jobs: ...` and `E2Job worker running`.

**Order matters:** create and start the worker *before* this change reaches a web service. Once the web service deploys it, the web service stops running the jobs, and nothing runs them until a worker is up.

## Checking it on staging (2 web instances)

1. On the staging web service, set *Settings → Instances* to 2. Keep one worker.
2. Wait at least 15 minutes, so the 5- and 15-minute jobs run a few times.
3. **Web logs** (both instances): no `Closed expired listings`, `[interview sweep]`, `[job-sync]` or `Application digest` lines.
4. **Worker logs:** one run per interval. Failed runs appear as `[worker] job <name> failed`, and in Sentry with the tag `job`.
5. In MongoDB (Atlas *Collections*, or `mongosh`):

   ```js
   db.agendaJobs.find({}, { name: 1, lastRunAt: 1, lastFinishedAt: 1, nextRunAt: 1, lockedAt: 1 })
   ```

   There is exactly one document per job, `lastRunAt` moves forward once per interval, and `email-digest` has `nextRunAt` at 12:30 UTC (6 PM IST).
6. Optional: run a second worker for a while. Runs are still once per interval, with no two workers running the same job at the same time.

## Campus portal workers

The campus branch starts its AI marking queue and test expiry sweep in `server.js`:

```js
if (String(process.env.ENABLE_CAMPUS).toLowerCase() === "true") require("./campus").startWorkers();
```

When that branch merges, move this line into `server/worker.js`, where a marked comment shows the spot, and remove it from `server.js`. Also call `require("./campus").stopWorkers()` in the worker's `shutdown()`. Add `ENABLE_CAMPUS` to the worker's environment on Render.

## Running locally

From `server/`: `npm run dev` for the API and `npm run dev:worker` for the jobs, in two terminals. Without the worker, the API works, but interviews aren't auto-completed, expired listings stay "Published" in the database (they're still hidden from lists), and no digest emails are sent.
