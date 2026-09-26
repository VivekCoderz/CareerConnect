# Job portal launch: 26 Sep – 11 Oct 2026

**Launch day:** Sunday 11 October 2026

**Scope:** jobs and internships, candidate apply flow, employer posting and applicant pipeline, human interviews and offers, resume builder and upload, notifications, admin moderation.

**Not in this launch:** courses, payments, assessments, AI interviews. They stay in the code but are switched off.

**Task list with owners and dates:** [Launch_Tracker.csv](Launch_Tracker.csv). Update its `Status` column daily.

## Branches

| Branch | Purpose |
|---|---|
| `launch/job-portal` | Created from `main` on 26 Sep. **All launch work goes here** through small PRs. Tripti reviews every PR. |
| `feature/assessments-ai-interview` | Parked work-in-progress for assessments and AI interviews. Known bugs are listed in its commit message. **Do not merge before launch.** It is 57 commits behind `main`, with 13 files that conflict. |
| `main` | Gets `launch/job-portal` merged in at code freeze (evening of 6 Oct). |
| `ram-mohan-code` | 6 commits not yet in `main`: ATS scoring, JD upload and the verified ATS PDF workflow. Merge decision is tracker task B01. |
| `Imran` | 1 commit not in `main` (messaging, job visibility, offer lifecycle). Not in launch scope; on hold (B02). |
| `sneha` | Course changes, not in launch scope. Only the auth fix gets cherry-picked (B03). |
| `develop`, `tripti`, `vivek`, `yug` | Fully merged into `main`, so nothing unique on them. They are stale; don't open PRs from them (B04). |

Rules until launch:

- Branch from `launch/job-portal`, keep PRs small, and put the tracker ID in the PR title (for example `[S03] Force pending approval on new jobs`).
- No new features after code freeze on 6 Oct. Only fixes for bugs found in QA or the beta.
- Never commit a `.env` file. Secrets live only in the Render and Vercel dashboards.

## Phases

| Phase | Dates | Goal | Exit gate |
|---|---|---|---|
| P1: Lock down and cut scope | 27–30 Sep | Security fixes, switch off out-of-scope features, real moderation | No known way to publish without approval, get a paid item without paying, or read another user's data |
| P2: Close the gaps | 1–5 Oct | Job detail pages and SEO, emails, legal pages, account deletion, scheduled job feeds, infrastructure | Every blocker in the tracker is done |
| P3: Freeze and test | 6–8 Oct | Code freeze on the evening of 6 Oct, full regression, load test, closed beta (50 students, 10 employers) | Load test meets target; no open P0 bugs |
| P4: Fix and decide | 9–10 Oct | Fix beta bugs; go/no-go meeting on the evening of 10 Oct | Go/no-go checklist below is all ✅ |
| Launch and close support | 11–25 Oct | Daily bug triage at 10:00, daily metrics review at 18:00 | — |

**Every day, everyone:** 1 hour of employer outreach, at 10 personal messages each. Job supply is our biggest launch risk.

## Go/no-go checklist (evening of 10 Oct)

- [ ] Every P0 task in the tracker is marked done.
- [ ] Credentials rotated (runbook below), and old credentials confirmed not to work.
- [ ] 200 or more real, employer-approved jobs and internships are live.
- [ ] LinkedIn and Internshala scraping is off, and no invented salaries appear.
- [ ] Load test meets its target on staging: 100 concurrent users, job list p95 under 1.5 s, error rate under 1%.
- [ ] A backup has been restored successfully into a test database at least once.
- [ ] Privacy Policy, Terms and Contact pages are live, and signup asks for consent.
- [ ] An admin moderation rota is assigned for 11–25 Oct.
- [ ] Rollback steps have been rehearsed: redeploy the previous Render and Vercel builds.

## Credential rotation runbook (Imran, do on 26–27 Sep)

**Why:** `server/.env` was committed on 23 Aug (commits `a110544` and `3214bdc`) and is still in git history. It contains the MongoDB connection string and `JWT_SECRET`. A Razorpay test key and secret are also hardcoded as fallbacks in `server/controllers/paymentController.js`. Treat all of them as leaked.

**Order matters:** create the new value, update Render, redeploy, confirm the app works, and only then revoke the old value.

1. **MongoDB Atlas.** Whoever holds the Atlas login must do this step.
   1. Go to *Database Access* and create a new database user with a strong generated password. You can instead edit the existing user's password.
   2. On Render, set `MONGODB_URI` to the new connection string and redeploy.
   3. Confirm `GET /health` returns 200 and that login works.
   4. Delete the old user, or confirm its old password no longer works.
   5. Under *Network Access*, check whether `0.0.0.0/0` is allowed. If it is, write that down: Render's free tier has no fixed IP, so we have to keep it for now.
2. **`JWT_SECRET`, `SESSION_SECRET` and `OTP_HASH_SECRET`.**
   1. Generate each value with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, using a separate value for each.
   2. Set them on Render.
   3. Rotating `JWT_SECRET` logs everyone out. That's fine before launch.
   4. Rotating `OTP_HASH_SECRET` invalidates any OTPs that are in flight.
3. **Razorpay.** Regenerate the test-mode key in the Razorpay dashboard. Payments are off for this launch, and task S02 removes the hardcoded fallbacks. The key still has to be treated as leaked.
4. **Firebase web API key and reCAPTCHA.** These values are meant to be public.
   1. In Google Cloud Console, restrict the Firebase browser API key to our domains under HTTP referrers.
   2. Make sure the reCAPTCHA site's domain list contains only our domains.
5. **Also check:** `BREVO_API_KEY`, `CLOUDINARY_API_SECRET`, `FIREBASE_PRIVATE_KEY` and `GEMINI_API_KEY`. If any of them was ever in a committed file, rotate it too. Search with `git log -p --all -S '<first 6 chars of the key>'`.
6. **Optional, after rotation:** remove the old `.env` files from git history with `git filter-repo`. This rewrites history for everyone, so coordinate first. Rotation is what actually protects us; this step only cleans up.

After rotating, log the date and the person who did it in `docs/security-hardening.md`.

## Owners

| Person | Area |
|---|---|
| Ram | Product, scope, legal copy, employer supply, launch marketing |
| Vivek | Backend: moderation, auth, emails, sockets, expiry |
| Imran | Infrastructure: secrets, Render, Cloudflare, backups, monitoring, job feeds, database indexes |
| Sneha | Candidate frontend: feature flag, job detail pages, SEO, legal pages, error boundary |
| Yug | Resume: AI limits, Cloudinary cleanup, account deletion, resume privacy |
| Tripti | QA: test checklist, security regression tests, load test, beta, go/no-go |
