# Load test on staging (Q03 rerun)

**Done when:** 100 users, job list p95 under 1.5 s, errors under 1%, and each scheduled job
ran exactly once while two web instances and the worker were up.

Script: `scripts/load/k6-staging.js`. The first Q03 run (6 Oct, one instance, before the
worker) gave 100 users, p50 0.63 s, p95 0.96 s, 0 errors.

## Before the run

1. **Staging setup** (Vivek, Render):
   - the web service runs **2 instances** (H14);
   - the **worker service** runs `npm run worker` with the same environment as the web
     service (H16, `docs/worker.md`). The Agenda worker (#261) must be merged and deployed.
2. **Raise the global rate limit on staging** for the run: set `RATE_LIMIT_GLOBAL_MAX=100000`
   on the web service. All virtual users come from one machine's IP, and the default (300
   requests per 15 minutes per IP) would make most requests fail with 429. Put it back
   (remove the variable) after the run.
3. Check `GET https://<staging-api>/health` returns 200.
4. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/ (Windows:
   `winget install k6 --source winget`).

## Run

```
k6 run -e BASE_URL=https://<staging-api> -e TEST_PASSWORD=<STAGING_TEST_PASSWORD> scripts/load/k6-staging.js
```

It takes about 7 minutes: 1 minute ramping to 100 users, 5 minutes at 100, 30 s down. The
password is `STAGING_TEST_PASSWORD` from the team password manager. Don't paste it in chat.

Read these lines in the summary:

| Line | Pass |
|---|---|
| `http_req_duration{name:job list}` p(95) | under 1.5 s (✓ next to the threshold) |
| `http_req_failed` | under 1% |
| `vus_max` | 100 |

k6 exits with an error if a threshold fails.

## Scheduled jobs ran once

Note the start and end time of the run. Then, in the **staging** database:

```js
db.agendaJobs.find({}, { name: 1, lastRunAt: 1, lastFinishedAt: 1, failCount: 1, lockedAt: 1 })
```

Pass:
- one document per job (`interview-sweep`, `listing-expiry`, `email-digest`, plus
  `external-job-sync` if enabled), no duplicates;
- `lastRunAt` moves on once per interval: `interview-sweep` every 5 minutes,
  `listing-expiry` every 15;
- `failCount` is 0, and no job is left locked (`lockedAt` empty) after it finished;
- in the Render logs, each run shows once, from the **worker** only. The web instances log no
  job runs.

Run time on the default staging cron: let the worker run at least 20 minutes around the test so
each 5- and 15-minute job runs a few times. The 6 PM digest only runs at 18:00 IST; check its
`lastRunAt` the next day, or skip it if the run isn't around 6 PM.

## Record the result

Add to the tracker: date, p50 and p95 for the job list, error rate, peak users, and the
scheduled-job check. Save the k6 summary (`k6 run ... --summary-export=k6-summary.json`) with
the result.
