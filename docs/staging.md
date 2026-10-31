# Staging environment (H02)

Staging is a full copy of the app that deploys from the `hardening` branch. It has its own API on Render, its own frontend preview on Vercel, and its own Atlas database, filled from a recent production backup with personal data scrubbed.

**Done when:** the staging URL works end to end for all four roles (candidate, employer, company admin, super admin) and never touches the production database.

## What keeps staging away from production

| Safeguard | Where |
|---|---|
| With `APP_ENV=staging`, the API refuses to start unless the database name in `MONGODB_URI` contains `staging`. Production refuses to start on a `staging` database. | `server/config/environment.js`, `server/server.js` |
| Staging only sends email to addresses in `STAGING_EMAIL_ALLOWLIST`. Everything else, including every scrubbed `@staging.invalid` address, is skipped and logged. | `server/utils/sendEmail.js` |
| The refresh workflow restores and scrubs the backup inside a throwaway MongoDB on the GitHub runner. It uploads to staging only if the scrub check passes. It refuses to run if the staging URI points at the production cluster. | `.github/workflows/staging-refresh.yml` |
| Staging has its own `JWT_SECRET`, `SESSION_SECRET` and `OTP_HASH_SECRET`, so a production login token does not work on staging, and a staging token does not work on production. | Render settings, below |

## What the scrub does

`server/scripts/scrub-staging-data.js` runs on every refresh:

- Every email address in every collection becomes `user-<hash>@staging.invalid`. The same address always maps to the same fake one, so an application still matches its candidate.
- Every 10-digit Indian mobile number becomes `600xxxxxxx`.
- Names in user, profile, application, resume and support-ticket records become `Test User <hash>`. Real users' names inside free text, such as cover letters and ticket messages, become `Test`.
- Passwords, Firebase UIDs, dates of birth, OTP and reset tokens are removed. Photos, resume links, LinkedIn and GitHub links, addresses and IP addresses are blanked.
- Sessions, pending OTPs, OTP rate limits, email usage and resume asset records are emptied.
- The run then scans every string in the database again. If any real email, phone number or user name is left, it fails and nothing is uploaded.

Because passwords and Firebase UIDs are removed, no real user can sign in to staging. Testers use the four accounts below.

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
| `STAGING_TEST_PASSWORD` | Password for the four test accounts, at least 10 characters. Share it in the team password manager, not in chat. |

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
| `JWT_SECRET`, `SESSION_SECRET`, `OTP_HASH_SECRET` | New values. Generate each with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `CLIENT_URL` | The staging frontend URL (step 5) |
| `PUBLIC_SITE_URL` | The staging frontend URL |
| `SENTRY_ENVIRONMENT` | `staging` |
| `STAGING_EMAIL_ALLOWLIST` | Testers' own addresses or domains, comma-separated, for example `@e2job.com`. Leave empty to send no email at all. |
| `ENABLE_EXTERNAL_JOB_SYNC` | `false` |
| `ENABLE_PAYMENTS` | `false`, or Razorpay **test** keys only |
| `CLOUDINARY_*` | A separate free Cloudinary account, so staging uploads don't land in production's media |

Check that `GET https://<staging-api>/health` returns 200, and that the logs show `MongoDB Connected` with no "Refusing to start" line.

### 5. Frontend preview on Vercel (Vivek)

In the Vercel project, open *Settings → Environment Variables*, and add these for the **Preview** environment, limited to the branch `hardening`:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<staging-api>/api` |
| `VITE_SENTRY_ENVIRONMENT` | `staging` |

Every push to `hardening` then builds a preview. Its stable address is the branch alias, `<project>-git-hardening-<team>.vercel.app`. Use that address for `CLIENT_URL` on Render.

**Custom domains come with H08.** Until then, the login cookie is cross-site between `vercel.app` and `onrender.com`, so Safari, and browsers that block third-party cookies, will drop it. Test staging in Chrome or Firefox until H08 is done. Staging needs its own API subdomain, such as `api-staging.e2job.com`. Pointing staging at `api.e2job.com` would send it to the production API and database.

### 6. Google sign-in and reCAPTCHA

Login and signup check reCAPTCHA on staging, as on production. Add the staging frontend domain to:

- the reCAPTCHA site key's domain list (Google reCAPTCHA admin console);
- Firebase → Authentication → Settings → **Authorized domains**, so Google sign-in works.

## Test accounts

Created by the refresh workflow (`server/scripts/seed-staging-accounts.js`). Each re-run resets their password to `STAGING_TEST_PASSWORD`.

| Role | Email | Sign in at |
|---|---|---|
| Candidate | `candidate@staging.invalid` | normal login |
| Employer | `employer@staging.invalid` | normal login; goes through employer onboarding |
| Company admin | `companyadmin@staging.invalid` | admin login; belongs to "Staging Test Company" |
| Super admin | `superadmin@staging.invalid` | admin login |

These addresses can't receive email. Anything that needs an inbox, such as signup OTP or forgot password, has to be tested with a new account on an address in `STAGING_EMAIL_ALLOWLIST`.

## Sign-off checklist

- [ ] `/health` on the staging API returns 200, and its logs show the staging cluster host.
- [ ] Candidate: log in, finish the profile, apply to a job, see the application.
- [ ] Employer: log in, finish onboarding, post a job, see it waiting for approval.
- [ ] Super admin: approve that job; the candidate can now see it.
- [ ] Company admin: log in and see Staging Test Company's dashboard.
- [ ] An action on staging, such as posting a job, does **not** appear on production.
- [ ] Sending an email to a non-allowlisted address shows `Staging: not sending` in the Render logs.
