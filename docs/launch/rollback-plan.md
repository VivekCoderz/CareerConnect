# Deploy and Rollback Plan (D01)

**Owner:** Vivek (only Vivek merges to `main` and deploys) · **Backup:** Imran · **Checked:** 3 Oct 2026 · **Updated:** 4 Oct 2026

## 1. Current setup

|                 | Render (API)                                                                                                                        | Vercel (frontend)                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Service         | CareerConnect web service (Free)                                                                                                    | careerconnect project (Hobby)                                                               |
| Domain          | api.e2job.com (old: api.codeformode.in)                                                                                                                  | www.e2job.com (old: www.codeformode.in, careerconnect-v1.vercel.app)                                             |
| Branch          | `main`                                                                                                                              | `main`                                                                                      |
| Root / commands | `server/` · build `npm ci` (since 4 Oct) · start `npm start`                                                                        | default                                                                                     |
| Auto-deploy     | Set to **After CI checks pass**, but on 4 Oct it did **not** trigger after CI passed. **Use Manual Deploy → Deploy latest commit.** | **Every push to `main`, does not wait for CI**                                              |
| Deploy time     | ~1-2 min with `npm ci` (4 Oct), plus CI ~2 min                                                                                      | ~1 min                                                                                      |
| Rollback        | Events → **Rollback** on an older deploy                                                                                            | Deployments → ... → **Instant Rollback** (Hobby: previous production deploy) or **Promote** |

## 2. Last known good (before the 6 Oct deploy)

|        | Commit                                                                                                              | Deploy                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Render | `a398c4c` Hotfix: never link an employer to a company by matching name or email (PR #172, includes npm audit fixes) | Live since 4 Oct 2026, 1:28 PM (manual deploy)                                                                           |
| Vercel | `a398c4c` (auto-deployed from `main`)                                                                               | Check the deployment ID on the Deployments page (filter Production) and write it here. Previous: `Him96G8Bm` = `3f7ebf4` |

Update this table right before the 6 Oct merge.

## 3. Known risk: frontend goes live first

Vercel deploys as soon as `main` changes; Render deploys only after CI and a manual deploy (a few minutes). During that window the new frontend talks to the old API.
Mitigation on deploy day:

- Deploy at low traffic (late evening).
- Turn on **maintenance mode** (Admin → Settings, S04) just before the merge and off after the smoke test. Writes return 503; reads keep working.

## 4. Deploy day (Q04, 6 Oct)

Before:

1. CI green on `launch/job-portal`. Tripti's Q01 checklist done.
2. A fresh MongoDB backup exists (I02) and its time is noted.
3. Note the current Render and Vercel deploys in section 2.
4. Render env check (values never shared in chat or the repo):
   - Already set: `TZ=Asia/Kolkata`; `CLIENT_URL` = `https://www.codeformode.in,https://careerconnect-v1.vercel.app` (first entry is used in email links).
   - New, set if ready: `FALLBACK_EMAIL_PROVIDER`, `FALLBACK_EMAIL_API_KEY`, `FALLBACK_EMAIL_FROM` (all three or none; the server logs a warning at startup if half set), optional `BREVO_DAILY_LIMIT` (default 300), `NOTIFICATION_EMAIL_DAILY_BUDGET` (default 150), `BREVO_RATE_LIMIT_RETRY_MS` (default 1500).
   - From I08: Sentry and analytics variables (ask Imran for the exact names).

Deploy: 5. Maintenance mode ON. 6. PR `launch/job-portal` → `main`, CI green, merge. 7. Wait for CI on `main` to pass, then Render → **Manual Deploy → Deploy latest commit**. Watch Vercel (~1 min) and Render Events until **Deploy live**. Check Render Logs for errors and the startup warnings.

Smoke test (both domains): 8. With maintenance ON (reads only): `/health` OK · job list and a job detail page · email login (exempt) · admin login. 9. Maintenance mode **OFF**. Maintenance mode blocks Google login and apply (they are writes), so test these after turning it off: Google login · signup page (Google + email OTP) · apply as candidate · employer dashboard and create a job (location required) · shortlist one applicant.

After (dry run first, share lists with Ram, then `--apply`): 10. `node scripts/approve-existing-employers.js --before=<deploy date>` (also backfills listing approval dates). 11. `node scripts/clean-fake-student-profiles.js`. 12. `node scripts/clean-fake-fresher-professional-profiles.js` (also clears old "Industry" / "Working Professional" values). 13. `node scripts/migrate-allowcontact-false.js` (recruiter contact becomes opt-in: dry run, share the count with Ram, then `--apply`). 14. Admin → Settings: set the site name to "E2Job" if it still says CareerConnect.

## 5. Rollback

Roll back if login, signup, job list or apply is broken and can't be fixed in ~15 min.

1. **Render:** Events → find the last good deploy (section 2) → **Rollback**. Wait for "Deploy live".
2. **Vercel:** Deployments → filter Environment: Production → last good deploy → ... → **Instant Rollback** (or **Promote**).
3. Roll back **both**, so frontend and API match.
4. Check login and job list again. Tell the team.
5. Fix forward on `launch/job-portal`, then deploy again.

Data notes:

- New fields and indexes are additive; old code ignores them.
- The post-deploy scripts' `--apply` changes data and is not undone by a rollback. Run `--apply` only once the deploy is confirmed stable.

## 6. Rollback rehearsal (before 6 Oct)

At a quiet time:

1. Vercel: Instant Rollback to the previous production deploy (`Him96G8Bm` = `3f7ebf4`), check the site loads, then **Promote** the `a398c4c` deploy back.
2. Render: Rollback to the 4 Oct 12:58 PM deploy (`3f7ebf4`), check `/health` and login (if login fails, redeploy the latest right away), then roll forward to `a398c4c` (Manual Deploy → Deploy latest commit).
3. Note the time each step took.
4. Planned: 4 Oct after 11 PM (Ram to confirm).

## 7. Open decisions for Ram

- Done 4 Oct: Render build command is `npm ci`; `TZ=Asia/Kolkata` set; `CLIENT_URL` starts with www.codeformode.in.
- Fallback email provider account (Mailjet or Resend) for C01: Imran creates it and sends the key to Vivek privately.
- Render auto-deploy did not fire after CI on 4 Oct: check the Render GitHub integration after launch; until then deploy manually.
- Vercel Hobby is non-commercial only; move to Cloudflare Pages before charging money.
- UptimeRobot (I01) is set up by Imran; confirm it pings `https://api.codeformode.in/health` every 5 min.
