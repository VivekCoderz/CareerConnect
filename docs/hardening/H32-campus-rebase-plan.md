# H32 - Campus portal: merge plan after release

Done when: this plan is written, and campus is merged into main in the week after release.
Until then `feature/campus-sandip` gets bug fixes only, for the Sandip University demo.

We integrate with a **merge**, not a rebase (20 commits, and a merge is how the team integrates).
"Rebase" in the task title means "bring up to date".

## 1. Current state (checked 27 Nov 2026, after `git fetch`)

| Branch | Head | Relation |
|---|---|---|
| `origin/feature/campus-sandip` | `0535e62` | Branched from `1a54e9b`. 20 commits ahead of main, 38 behind. 115 files, +12,357 / -42 lines. |
| `origin/hardening` | `7c120b0` | 72 commits ahead of `1a54e9b`. 41 ahead of main, 7 behind main. Not released. |
| `origin/main` | `6f93800` | Production. |
| `origin/Imraan/agenda-worker` (H14) | `4258fee` | Not in hardening yet. Adds `server/worker.js` and Agenda. |

Release task H26 has no date yet. After H26, hardening merges into main. So the real target is
**main after hardening has merged into it**. This plan uses `origin/hardening` as the stand-in.

Outside its own folders (`server/campus/`, `client/src/campus/`, `docs/campus/`, tests, seed),
campus touches only: `server/app.js` (mounts `/api/campus` behind `ENABLE_CAMPUS`),
`server/server.js` (starts the campus workers), `server/models/AuditLog.js` (adds `"Campus"` to
the `module` enum), `server/package.json` (`exceljs` plus an `overrides` block),
`client/src/main.jsx` (picks the campus app on a university host), `client/package.json`
(`motion`) and both lockfiles.

## 2. Trial merge result (27 Nov, throwaway local branch, not pushed)

`origin/feature/campus-sandip` merged into `origin/hardening` (`7c120b0`):

- **One conflict: `server/package-lock.json`**, one hunk around the `typed-array-*` entries.
  Hardening's mongoose upgrade removed those packages; campus needs them as `exceljs`
  dependencies. Not a code conflict.
- Auto-merged cleanly: `server/app.js`, `server/server.js`, `server/package.json`,
  `server/models/AuditLog.js`, `client/src/main.jsx`, `client/package.json`,
  `client/package-lock.json`.
- Resolved the lockfile by taking hardening's copy and running
  `npm install --package-lock-only` in `server/`. `npm audit --omit=dev` then shows the same
  9 issues (1 low, 8 moderate, none high) as hardening alone, so the CI gate
  (`--audit-level=high`) still passes.
- Tests on the trial merge (local, mongodb-memory-server 8.2.6): the 5 campus suites passed
  (30 tests); the full server suite passed (99 suites, 749 tests, no flakes this run).
  `VITE_ENABLE_CAMPUS=true vite build` in `client/` succeeded and `eslint src/campus src/main.jsx`
  reported nothing. Not run: the client build without the flag, client tests, any browser test.

A second trial (`git merge-tree`) of campus into `origin/Imraan/agenda-worker` (H14) also gave
only the lockfile conflict. **Important:** in that case git keeps the campus `startWorkers` line
in `server.js` without any conflict. Nothing warns you; the move in step 4 must be done by hand.

Non-conflict checks on the trial merge:

| Area | Finding |
|---|---|
| H27 auth split | Campus does not import `server/controllers/authController.js`. It has its own `server/campus/controllers/authController.js`. Hardening keeps `controllers/authController.js` as a re-export of `controllers/auth/`. No change needed. |
| Shared auth (H07) | Hardening's `protect` is cookie-only. Campus uses its own header-only `server/campus/middleware/bearer.js`, so campus keeps working. The comment in `server/campus/controllers/authController.js` ("so the shared `protect` middleware accepts it") is now out of date: a campus token no longer works on the main API. That is the safer behaviour; fix the comment only. |
| Token format | Campus signs `{ id, av }` with `JWT_SECRET`, the same as `generateToken` in `server/controllers/auth/shared.js`. `av` is checked against `User.authVersion`. |
| User model | Campus reads and writes `email`, `fullName`, `userType: "student"`, `role: "user"`, `isEmailVerified`, `hasPassword`, `authProviders`, `authVersion`, `isActive`. All exist in hardening's `server/models/User.js` (hardening only fixed a typo there). |
| Other shared imports | `models/AuditLog`, `models/User`, `config/cloudinary`, `config/firebaseAdmin`, `middleware/validationMiddleware` (server) and `config/firebase` (client) all still exist with the same exports. |
| Error handler order | `/api/campus` is mounted before the 404 handler and the global error handler in `server/app.js`. Correct. The campus router ends with its own upload-error handler that passes everything else on with `next(err)`. No commit in hardening is tagged H10; the handler is still inline in `app.js`. |
| Timers | Hardening `server.js` still starts its own timers (no H14 yet). The campus line lands after `startExternalJobSyncSchedule()`. |
| Env vars | Hardening dropped `SESSION_SECRET`; campus never used it. Hardening adds the `APP_ENV` staging guard (`server/config/environment.js`); `server/scripts/seed-campus-demo.js` does not call it. |

Campus env vars. Server: `ENABLE_CAMPUS`, `CAMPUS_DEMO_LOGIN`, `CAMPUS_DEV_LOGIN`,
`CAMPUS_FAKE_AI`, `CAMPUS_GEMINI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLOUDINARY_*`,
`JWT_SECRET`, `MONGODB_URI`. Client: `VITE_ENABLE_CAMPUS`, `VITE_CAMPUS_DEV_LOGIN`,
`VITE_API_URL`, `VITE_FIREBASE_*`.

## 3. When

- **Start:** the week after H26 (release). Hardening must be merged into main first.
- **H14 dependency:** if H14 is in main by then, do step 4. If not, merge campus anyway with
  the line in `server.js` (one web instance, the queue is lease-based), and do step 4 inside
  the H14 PR instead. Do not hold campus for H14.
- **H26 dependency:** do not merge campus into `hardening` before release. That would put a
  12k-line feature into the release under test.
- **Freeze on the campus branch** from the day we start until the merge PR is in: no pushes to
  `feature/campus-sandip`, so the Sandip demo deploy and the merge see the same code.

## 4. Steps, in order

1. **Branch.** From the newest main:
   `git fetch origin && git switch -c ram/h32-campus-merge origin/main`
2. **Merge.** `git merge --no-ff origin/feature/campus-sandip`
3. **Resolve conflicts.**
   - `server/package-lock.json`: take main's copy (`git checkout --ours server/package-lock.json`),
     then run `npm install` in `server/` so `exceljs` and its dependencies are added. Never hand-edit.
   - `client/package-lock.json` (if it conflicts once main has moved further): same rule, run
     `npm install` in `client/` to add `motion`.
   - Any other file that conflicts: stop and check with the owner. Based on the trial, none should.
4. **Move `startWorkers` into the worker (only if H14 is in main).**
   - Delete the campus line from `server/server.js`.
   - In `server/worker.js`, at the marked "Campus portal workers" comment, add
     `if (String(process.env.ENABLE_CAMPUS).toLowerCase() === "true") require("./campus").startWorkers();`
   - In the worker's `shutdown()`, call `require("./campus").stopWorkers()` before
     `mongoose.disconnect()`.
   - On the Render worker service add `ENABLE_CAMPUS`, `GEMINI_API_KEY`, `GEMINI_MODEL` /
     `CAMPUS_GEMINI_MODEL`. Create the worker before the web service deploys this change
     (docs/worker.md, "Order matters").
   - Campus timers stay as `setInterval` in the worker. Jobs are claimed with a lease in MongoDB
     (`server/campus/services/gradingWorker.js`), so two workers are safe. Moving them onto Agenda
     is not part of H32.
5. **Error middleware order (H10).** In `server/app.js`, the order must stay:
   all routes, including `/api/campus` -> 404 handler -> global error handler. If H10 has moved
   the handlers into a separate file by then, keep the campus mount above `app.use(<404>)`.
6. **Small fixes allowed in this PR** (bug fixes only):
   - Update the out-of-date comment in `server/campus/controllers/authController.js`.
   - White-label fix: `server/middleware/maintenanceMode.js` answers
     "E2Job is undergoing maintenance" to every `/api` write, which includes campus. Use a neutral
     message (e.g. "The service is undergoing maintenance") or skip `/api/campus`. Needs a decision
     (open question 2).
7. **Checks before opening the PR** (from `server/`, with `CI=true NODE_ENV=test`, test-only
   `JWT_SECRET`/`SESSION_SECRET`, `CLIENT_URL=http://localhost:5173`, `MONGOMS_VERSION=8.2.6`):
   - `npx jest __tests__/integration/campus` (5 suites)
   - `npm test` (full suite; ignore known load flakes in rateLimit, moderation, notificationEmails
     and re-run them alone)
   - `npm audit --omit=dev --audit-level=high` in `server/` and `client/`
   - `npm run build` in `client/` once with `VITE_ENABLE_CAMPUS=true` and once without
   - `npm run lint` in `client/` (lint gate)
   - `npm run test:scheduler` if H14 is in
   - `grep -rni e2job client/src/campus server/campus` shows only code names and comments,
     nothing a user sees
8. **PR** `ram/h32-campus-merge` -> `main`, title "[H32] Merge campus portal into main". Suggested
   reviewers: Vivek (server), Imran (worker), Tripti (QA). Merge only after the staging demo checklist passes.
9. **After merge:** `feature/campus-sandip` is frozen. Point the Sandip demo deploy at `main`
   (with `ENABLE_CAMPUS=true`) and delete the branch two weeks later.

## 5. Test and demo checklist (staging, then the Sandip demo deploy)

On staging with `ENABLE_CAMPUS=true`, `VITE_ENABLE_CAMPUS=true`, the Sandip seed
(`node scripts/seed-campus-demo.js`) and the Sandip host:

- [ ] **Sign-in:** Google sign-in for a registered email; an unregistered email gets
      "not registered" with the university help contact; demo sign-in works only for the
      `@demo.portal.test` sample accounts and only when `CAMPUS_DEMO_LOGIN=true`.
- [ ] **Consent:** first sign-in shows the data notice; nothing else opens until accepted.
- [ ] **Separation:** signed in to E2Job as admin in the same browser, the campus portal still
      asks for its own sign-in.
- [ ] **Dashboard:** university admin dashboard opens; Overview and Test analysis links work.
- [ ] **Tests:** student starts a test, answers, bookmarks, camera works, submits; AI marking
      finishes (check the worker logs if H14 is in, else the web logs); a test past its end time
      is closed by the expiry sweep; results appear only after publish.
- [ ] **Students:** import from Excel (preview, then commit), filter by status, open a full
      student profile, verify a student.
- [ ] **Audit log:** import, add/remove a university admin, change a mark and publish each write
      one `AuditLog` row with `module: "Campus"`. There is no campus screen for it; check in Atlas
      or on the E2Job admin dashboard "recent activity".
- [ ] **White-label:** on every campus page (landing, sign-in, dashboard, test, result, profile,
      privacy) no "E2Job" in visible text, page title, favicon, share tags, PDF/Excel reports,
      error messages and toasts. Also check a 429 and a 500 response as the student sees them.
- [ ] **E2Job side:** e2job.com, www.e2job.com and the staging/preview hosts still open the job
      portal, not the campus app.
- [ ] **Load (light):** 30 students in one room on one network, autosaving. See risk 2.

## 6. Rollback

- **Fast switch-off:** set `ENABLE_CAMPUS=false` (server, and worker if H14) and
  `VITE_ENABLE_CAMPUS=false` (client), redeploy. The `/api/campus` routes and timers stop, and
  every host opens the job portal. Campus data stays in its own collections.
- **Full revert:** `git revert -m 1 <merge commit>` on main, then regenerate both lockfiles.
  The `"Campus"` value in the `AuditLog` enum goes too; existing campus audit rows stay readable
  (enum checks only run on write).
- The Sandip demo can return to its last deploy of `feature/campus-sandip` (`0535e62`) while
  the revert is sorted out.

## 7. Risks

1. **Workers silently stay in the web server.** Git merges the `startWorkers` line into
   `server.js` without a conflict even when H14 is in. If missed, every web instance runs the
   marking queue and expiry sweep. Safe (leases) but wasteful, and it breaks H14's "web runs no
   timers" rule. Mitigation: step 4, and a reviewer checks `server/server.js` has no timer.
2. **Global rate limit during a test.** `globalLimiter` in
   `server/middleware/rateLimitMiddleware.js` allows 300 requests per IP per 15 minutes on all
   of `/api`, and campus autosaves on every answer. A class on one campus network shares one
   IP and could get 429s mid-test. This exists on the campus branch today; the merge does not
   cause it. Not tested. Mitigation: open question 3.
3. **Campus app opening on the wrong host.** `client/src/campus/host.js` treats every host
   except `e2job.com`, `www.e2job.com`, `localhost` and `*.vercel.app` as a university portal when
   `VITE_ENABLE_CAMPUS=true`. Hardening adds a Cloudflare setup (`client/wrangler.jsonc`) and a
   staging frontend; any new E2Job host (custom staging domain, `*.workers.dev`) would show the
   campus app. Mitigation: test every E2Job host in the checklist, extend the list if needed.
4. **White-label leaks from shared code.** The maintenance message (step 6), the demo host
   `sandip.e2job.com` in the address bar and the seed, and the Google sign-in popup (which shows
   the Firebase project's name and auth domain; not checked). Any shared middleware message added
   later reaches campus users too.
5. **Worker cost.** H14's worker needs a paid Render Background Worker (Starter). With the zero
   budget, H14 may not ship; then the campus line stays in `server.js` (step 3 rule).
6. **Shared sign-out.** Campus tokens carry `av`. Signing out of E2Job (or a password reset) on
   the same user account moves `authVersion` on and signs the student out of campus too. Rare,
   since campus students are usually not E2Job users. Accept for now.

## 8. Later work (not in this merge)

- **Campus token in its own httpOnly cookie.** Today the token is in `localStorage`
  (`campus_token`, `client/src/campus/api.js`) on purpose, so the E2Job cookie never signs anyone
  into campus. Before real students use it: a cookie with its own name (e.g. `campus_token`),
  `httpOnly`, `Secure`, `SameSite=Lax`, path `/api/campus`, set by `/api/campus/auth/*`, read only
  by `server/campus/middleware/bearer.js`, plus a campus sign-out endpoint and CSRF protection for
  writes. Needs the API on the same site as each university host (as H08 did for e2job.com), or
  the browser will drop it. Own task and PR.
- Move campus timers onto Agenda jobs in `server/jobs/scheduledJobs.js`.
- Add `assertDatabaseMatchesEnvironment` to `server/scripts/seed-campus-demo.js`.

## 9. Open questions

1. When is H26? This plan starts the week after it.
2. Maintenance message: neutral text for everyone, or skip `/api/campus` (students mid-test keep
   saving)? Who decides: Ram.
3. Rate limit for campus: exempt `/api/campus` from `globalLimiter` (it has its own per-user
   limits), or raise `RATE_LIMIT_GLOBAL_MAX`? Need to know if Sandip students take tests from
   one lab network.
4. Will H14's paid worker be approved? If not, the campus workers stay in the web server.
5. Final Sandip address: still `sandip.e2job.com`, or the university's own domain? The current
   one shows "e2job" in the address bar.
6. Does the Google sign-in popup show "E2Job"? Check on the demo deploy.
