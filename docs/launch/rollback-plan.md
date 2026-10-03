# Deploy and Rollback Plan (D01)

**Owner:** Vivek (only Vivek merges to `main` and deploys) · **Backup:** Imran · **Checked:** 3 Oct 2026

## 1. Current setup

| | Render (API) | Vercel (frontend) |
|---|---|---|
| Service | CareerConnect web service (Free) | careerconnect project (Hobby) |
| Domain | api.codeformode.in | www.codeformode.in, careerconnect-v1.vercel.app |
| Branch | `main` | `main` |
| Root / commands | `server/` · build `npm install` · start `npm start` | default |
| Auto-deploy | **After CI checks pass** | **Every push to `main`, does not wait for CI** |
| Deploy time | ~9 min after CI (~2 min) | ~1 min |
| Rollback | Events → **Rollback** on an older deploy | Deployments → ... → **Instant Rollback** (Hobby: previous production deploy) or **Promote** |

## 2. Last known good (before the 6 Oct deploy)

| | Commit | Deploy |
|---|---|---|
| Render | `3f7ebf4` Hotfix: stop public profile and interview feedback leaks | Live since 3 Oct 2026, 3:51 PM |
| Vercel | `3f7ebf4` (same commit) | Deployment `Him96G8Bm` (27 Sep). Previous: `HkK5MkhGS` = `2c84c10` |

Update this table right before the 6 Oct merge.

## 3. Known risk: frontend goes live first

Vercel deploys ~10 min before Render. During that window the new frontend talks to the old API.
Mitigation on deploy day:
- Deploy at low traffic (late evening).
- Turn on **maintenance mode** (Admin → Settings, S04) just before the merge and off after the smoke test. Writes return 503; reads keep working.

## 4. Deploy day (Q04, 6 Oct)

Before:
1. CI green on `launch/job-portal`. Tripti's Q01 checklist done.
2. A fresh MongoDB backup exists (I02) and its time is noted.
3. Note the current Render and Vercel deploys in section 2.
4. Render env has everything new: `FALLBACK_EMAIL_*` (if ready), `TZ` (if decided), `NOTIFICATION_EMAIL_DAILY_BUDGET`, `BREVO_DAILY_LIMIT`.

Deploy:
5. Maintenance mode ON.
6. PR `launch/job-portal` → `main`, CI green, merge.
7. Watch Vercel (~1 min) and Render Events until **Deploy live** (~10-12 min). Check Render Logs for errors.

Smoke test (both domains):
8. `/health` OK · email login · Google login · signup page · job list and a job detail page · apply as candidate · employer dashboard · admin login.
9. Maintenance mode OFF.

After (dry run first, share lists with Ram, then `--apply`):
10. `node scripts/approve-existing-employers.js --before=<deploy date>` (also backfills listing approval dates).
11. `node scripts/clean-fake-student-profiles.js`.

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
1. Vercel: Instant Rollback to the previous production deploy, check the site loads, then **Promote** `Him96G8Bm` back.
2. Render: Rollback to the 28 Sep 8:56 PM deploy (same commit `3f7ebf4`), check `/health` and login (if login fails, redeploy the latest right away), then redeploy the latest.
3. Note the time each step took.

## 7. Open decisions for Ram

- Render build command `npm install` → `npm ci`, so production installs exactly what CI tested.
- `TZ=Asia/Kolkata` on Render (interview times are read in server time, currently UTC).
- Fallback email provider account (Resend or Mailjet) for C01.
- Vercel Hobby is non-commercial only; move to Cloudflare Pages before charging money.
- Confirm UptimeRobot (I01) pings `/health`, since the Render free instance sleeps after 15 min.
