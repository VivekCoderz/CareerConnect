# Staging environment (H02)

Staging is a full copy of the app that deploys from the `hardening` branch. It has its own API on Render, its own frontend on Cloudflare, and its own Atlas database, filled from a recent production backup with personal data scrubbed.

| | Address |
|---|---|
| Frontend | https://staging.e2job.com |
| API | https://api-staging.e2job.com (Render service `careerconnect-api-staging`) |

Always test on `staging.e2job.com`. The login cookie is `SameSite=Lax` (H08), so it only works when the site and the API share `e2job.com`; logging in from `e2job-staging.vivekgarg-code.workers.dev` or any other host fails.

**Done when:** the staging URL works end to end for all four roles (candidate, employer, company admin, super admin) and never touches the production database.

## What keeps staging away from production

| Safeguard | Where |
|---|---|
| With `APP_ENV=staging`, the API refuses to start unless the database name in `MONGODB_URI` contains `staging`. Production refuses to start on a `staging` database. | `server/config/environment.js`, `server/server.js` |
| Staging only sends email to addresses in `STAGING_EMAIL_ALLOWLIST`. Everything else, including every scrubbed `@staging.invalid` address, is skipped and logged. | `server/utils/sendEmail.js` |
| The refresh workflow restores and scrubs the backup inside a throwaway MongoDB on the GitHub runner. It uploads to staging only if the scrub check passes. It refuses to run if the staging URI points at the production cluster. | `.github/workflows/staging-refresh.yml` |
| Staging has its own `JWT_SECRET` and `OTP_HASH_SECRET`, so a production login token does not work on staging, and a staging token does not work on production. | Render settings, below |

## What the scrub does

`server/scripts/scrub-staging-data.js` runs on every refresh:

- Every email address in every collection becomes `user-<hash>@staging.invalid`. The same address always maps to the same fake one, so an application still matches its candidate.
- Every 10-digit Indian mobile number becomes `600xxxxxxx`.
- Names in user, profile, application, resume and support-ticket records become `Test User <hash>`. Real users' names inside free text, such as cover letters and ticket messages, become `Test`.
- Passwords, Firebase UIDs, dates of birth, OTP and reset tokens are removed. Photos, resume links, LinkedIn and GitHub links, addresses and IP addresses are blanked.
- Sessions, pending OTPs, OTP rate limits, email usage and resume asset records are emptied.
- The run then scans every string in the database again. If any real email, phone number or user name is left, it fails and nothing is uploaded.

Because passwords and Firebase UIDs are removed, no real user can sign in to staging. Testers use the test accounts below.

Known limit: a one-word value holding only a name, such as a nested `"Rahul"`, is not replaced. That rule stops the scrub from touching values like `"active"` or `"student"`.

## One-time setup

### 1. Atlas (whoever holds the Atlas login)

1. Create a **separate project and free M0 cluster** for staging. Don't use the production cluster; the workflow refuses to run against it.
2. Create a database user for staging only.
3. Under *Network Access*, allow `0.0.0.0/0`. Render Free and GitHub runners have no fixed IP.
4. Connection string: `mongodb+srv://<user>:<password>@<staging-cluster>/careerconnect_staging?retryWrites=true&w=majority`. The database name must contain `staging`.

### 2. GitHub secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
|---|---|
| `STAGING_MONGODB_URI` | The staging connection string from step 1 |
| `STAGING_TEST_PASSWORD` | Password for the test accounts, at least 10 characters. Share it in the team password manager, not in chat. |

The workflow also reuses the existing backup secrets: `B2_RESTORE_KEY_ID`, `B2_RESTORE_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_ENDPOINT`, `BACKUP_PASSPHRASE`, and `MONGODB_URI` (only to check that staging is a different cluster).

### 3. Fill the database

GitHub only shows the *Run workflow* button once `staging-refresh.yml` is on `main`, the default branch. Until then, it can't be started from the Actions page.

Go to *Actions → Staging Refresh → Run workflow*. Leave `backup_key` empty to use the latest nightly backup. It takes about 5–10 minutes. Re-run it whenever staging needs fresh data; it replaces the whole staging database.

### 4. Render (Vivek)

Create a **new Web Service** from the same repository with the same build and start settings as production, with these changes:

- **Branch:** `hardening`, with auto-deploy on.
- **Name:** for example `careerconnect-api-staging`.

Environment variables: copy production's, then change these:

| Variable | Staging value |
|---|---|
| `APP_ENV` | `staging` |
| `MONGODB_URI` | The staging connection string |
| `JWT_SECRET`, `OTP_HASH_SECRET` | New values. Generate each with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. (`SESSION_SECRET` is no longer read since H09 and can be removed.) |
| `CLIENT_URL` | `https://staging.e2job.com` |
| `PUBLIC_SITE_URL` | `https://staging.e2job.com` |
| `SENTRY_ENVIRONMENT` | `staging` |
| `STAGING_EMAIL_ALLOWLIST` | Testers' own addresses or domains, comma-separated, for example `@e2job.com`. Leave empty to send no email at all. |
| `ENABLE_EXTERNAL_JOB_SYNC` | `false` |
| `ENABLE_PAYMENTS` | `false`, or Razorpay **test** keys only |
| `CLOUDINARY_*` | A separate free Cloudinary account, so staging uploads don't land in production's media |

Custom domain: in the service's *Settings → Custom Domains*, add `api-staging.e2job.com`. In Cloudflare DNS (the `e2job.com` zone), add a `CNAME api-staging → careerconnect-api-staging.onrender.com`, **DNS only** (grey cloud), so Render can issue the certificate.

Check that `GET https://api-staging.e2job.com/health` returns 200, and that the logs show `MongoDB Connected` with no "Refusing to start" line.

Never point staging at `api.e2job.com`: that is the production API and database.

### 5. Frontend on Cloudflare (Vivek)

The staging frontend is a Cloudflare Worker (Workers Builds) connected to this repository:

1. Cloudflare → *Workers & Pages* → the staging worker (`e2job-staging`) → *Settings → Build*.
2. **Branch control:** production branch `hardening`. **Root directory:** `client`. Build and deploy commands as in `client/wrangler.jsonc`.
3. **Build variables:**

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://api-staging.e2job.com/api` |
   | `VITE_SENTRY_ENVIRONMENT` | `staging` |
   | `VITE_RECAPTCHA_SITE_KEY`, `VITE_FIREBASE_*` | The **production** values (copy them from the production frontend, not from `client/.env`) |

4. **Domain:** `staging.e2job.com`. The `e2job.com` zone is in a different Cloudflare account from the worker, so a small proxy worker (`staging-proxy`) in the zone's account serves `staging.e2job.com` and forwards to the staging worker's `workers.dev` address. Before production moves to Cloudflare, put the zone and the workers in one account and drop the proxy.

Every push to `hardening` rebuilds it. Cloudflare doesn't build when only the branch setting changes: to deploy another branch for a test window, change *Branch control* and push a commit to that branch (or roll back to an earlier version under *Deployments*).

### 6. Google sign-in and reCAPTCHA

Login and signup check reCAPTCHA on staging, as on production. Add `staging.e2job.com` to:

- the reCAPTCHA site key's domain list (Google reCAPTCHA admin console);
- Firebase → Authentication → Settings → **Authorized domains**, so Google sign-in works.

## Test accounts

Created by the refresh workflow (`server/scripts/seed-staging-accounts.js`). Each re-run resets their password to `STAGING_TEST_PASSWORD`. The script can also run on its own, without a data refresh: from `server/`, with `MONGODB_URI` and `STAGING_TEST_PASSWORD` set, run `node scripts/seed-staging-accounts.js`.

| Role | Email | Sign in at |
|---|---|---|
| Candidate: student | `student@staging.invalid` | normal login |
| Candidate: fresher | `fresher@staging.invalid` | normal login |
| Candidate: professional | `professional@staging.invalid` | normal login |
| Employer | `employer@staging.invalid` | normal login; goes through employer onboarding |
| Company team member | `teammember@staging.invalid` | normal login; employer linked to "Staging Test Company" |
| Company admin | `companyadmin@staging.invalid` | admin login; belongs to "Staging Test Company" |
| Super admin | `superadmin@staging.invalid` | admin login |
| Legacy admin (`role: "admin"`) | `admin@staging.invalid` | admin login |

These addresses can't receive email. Anything that needs an inbox, such as signup OTP or forgot password, has to be tested with a new account on an address in `STAGING_EMAIL_ALLOWLIST`.

## Sign-off checklist

- [ ] `/health` on the staging API returns 200, and its logs show the staging cluster host.
- [ ] Candidate: log in, finish the profile, apply to a job, see the application.
- [ ] Employer: log in, finish onboarding, post a job, see it waiting for approval.
- [ ] Super admin: approve that job; the candidate can now see it.
- [ ] Company admin: log in and see Staging Test Company's dashboard.
- [ ] An action on staging, such as posting a job, does **not** appear on production.
- [ ] Sending an email to a non-allowlisted address shows `Staging: not sending` in the Render logs.
- [ ] Login works in Safari with cross-site tracking prevention on (H08).
- [ ] Logging out in one tab signs the other tab out on its next request (H09).
- [ ] When the employer shortlists a candidate, the candidate's bell updates without a reload (H17).
