# Launch QA tool

Run the repeatable checks from the repository root:

```bash
npm run qa:launch --prefix server
```

This runs isolated HTTP tests against an in-memory MongoDB and builds the client. It tests published job and internship discovery, application submission, duplicate prevention, Applied IDs, candidate and employer visibility, status updates, resume authorization, and existing security regressions. It **does not write to the configured Atlas database**. The runner overrides `MONGODB_URI` with an unusable local address before Jest connects to its temporary database.

After deploying the matching client and server, add read-only probes for the actual origins:

```bash
npm run qa:launch --prefix server -- --api-url https://api.example.com --web-url https://app.example.com
```

The live probes only make GET requests. They check API health, public jobs and internships, anonymous rejection by account and private resume routes, and the login HTML page. They do not log in, apply, upload files, or mutate production data. JSON and readable Markdown reports are written to the ignored `qa-reports/` directory; use `--report /your/private/path/report.json` to choose a location. The command exits nonzero when a check fails.

Do **not** use the older `server/scripts/test-e2e-mvp.js` or `server/scripts/test-student-application-e2e.js` against a shared or production database: those scripts create and delete real records.

## Manual pilot checklist

Use a dedicated test candidate and employer in staging. Record pass/fail and a screenshot or issue link for each item:

| Journey | Expected result |
| --- | --- |
| Candidate email and Google signup/login | Correct dashboard; no duplicate profile; error text is useful |
| Search a verified job and internship on a phone | Results and details are readable; draft/closed listings are absent |
| Build or upload a resume, then tailor it to one job | Preview matches the candidate's real information; download works |
| Apply once to each listing | Confirmation appears; repeat apply is blocked; buttons show Applied |
| Return to the student dashboard, then reload or sign in again | The next unapplied job and internship are shown; if none remain, an honest empty state appears |
| Candidate My Applications | Both applications and later employer status appear |
| Employer application view | Own applicants and the submitted resume open; another employer cannot view them |
| Account recovery and logout | Recovery succeeds; old session cannot access private pages after logout |

Check keyboard navigation, form labels, mobile layout, and loading/error states in the same pilot. The isolated suite cannot verify real Firebase, CAPTCHA, email delivery, Cloudinary delivery, AI content quality, browser rendering, or deployment wiring; those require the staging pilot.
