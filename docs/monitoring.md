# Monitoring: Sentry and Umami (I08)

CareerConnect reports errors to **Sentry** (free Developer plan) from both the backend and the
frontend, and counts page views with **Umami Cloud** (free Hobby plan, cookieless).

Everything is off until its environment variable is set, so local development and tests send
nothing. No DSN, website ID or key is stored in the code.

## Environment variables

### Backend (Render, `server/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `SENTRY_DSN` | yes, to turn Sentry on | `https://abc123@o123.ingest.de.sentry.io/456` | DSN of the **backend** Sentry project |
| `SENTRY_ENVIRONMENT` | no | `production` / `staging` | Environment shown in Sentry (default: `NODE_ENV`) |
| `SENTRY_RELEASE` | no | `careerconnect-api@1.4.0` | Release name (default on Render: `RENDER_GIT_COMMIT`) |
| `SENTRY_TRACES_SAMPLE_RATE` | no | `0.1` | Performance tracing sample rate (default `0` = off) |

### Frontend (Vercel, `client/.env`)

Vite reads these **at build time**, so redeploy after changing them.

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_SENTRY_DSN` | yes, to turn Sentry on | `https://def456@o123.ingest.de.sentry.io/789` | DSN of the **frontend** Sentry project |
| `VITE_SENTRY_ENVIRONMENT` | no | `production` | Environment shown in Sentry (default: Vite mode) |
| `VITE_SENTRY_RELEASE` | no | `careerconnect-web@1.4.0` | Release name |
| `VITE_UMAMI_WEBSITE_ID` | yes, to turn analytics on | `5f1c...-...` (UUID) | Website ID from Umami |
| `VITE_UMAMI_DOMAINS` | recommended | `www.e2job.com,e2job.com` | Count only these hostnames (comma-separated), so preview deploys and localhost are not counted |
| `VITE_UMAMI_SCRIPT_URL` | no | `https://cloud.umami.is/script.js` | Tracker script (default shown; change only for self-hosted Umami) |
| `VITE_UMAMI_HOST_URL` | no | `https://umami.example.com` | Collector URL for self-hosted Umami |

A frontend Sentry DSN is public by design (it can only send events), but it is still kept out
of the code so each environment can use its own project.

## One-time setup

### Sentry

1. Create a free account at <https://sentry.io/signup/> (Developer plan).
2. Create two projects:
   - platform **Node.js → Express**, name `careerconnect-api`
   - platform **React**, name `careerconnect-web`
3. In each project open **Settings → Client Keys (DSN)** and copy the DSN.
4. Render → backend service → **Environment**: add `SENTRY_DSN` (backend DSN) and
   `SENTRY_ENVIRONMENT=production`. Save; Render redeploys.
5. Vercel → frontend project → **Settings → Environment Variables**: add `VITE_SENTRY_DSN`
   (frontend DSN) and `VITE_SENTRY_ENVIRONMENT=production`, then redeploy.
6. Optional: in each project, **Alerts → Create Alert → Issues** to email the team on new issues.

### Umami

1. Create a free account at <https://cloud.umami.is/signup>.
2. **Settings → Websites → Add website**: name `CareerConnect`, domain = the production domain.
3. Open the website's settings and copy the **Website ID**.
4. Vercel: add `VITE_UMAMI_WEBSITE_ID` and `VITE_UMAMI_DOMAINS` (production hostname), then redeploy.

## What is captured

**Backend** (`server/instrument.js`, loaded first in `server/server.js`):
- uncaught exceptions and unhandled promise rejections
- every error the global error handler in `server/app.js` answers with **5xx**, tagged with
  `status_code` and `route`. Errors answered with 4xx (validation, bad IDs, duplicates) and
  rejected CORS origins are not reported. Clients get the same responses as before.

**Frontend** (`client/src/monitoring/sentry.js`, imported first in `client/src/main.jsx`):
- React render errors (`ErrorBoundary`), uncaught exceptions, unhandled promise rejections
- API calls that fail with 5xx or get no response (`client/src/api/api.jsx`), grouped as one
  issue per method + endpoint

**Page views** (`client/src/monitoring/analytics.js`): every route, including in-app
navigation (the Umami tracker follows `history.pushState`).

## Privacy

- Sentry: `sendDefaultPii: false` (no IP addresses). Cookies, `Authorization` headers and
  request bodies are removed; fields named like password, token, secret, OTP, API key or
  session are replaced with `[Filtered]`; token-like URL query values are filtered; only a
  user id is kept if one is ever set. Console breadcrumbs are dropped in the browser. Session
  replay and performance tracing are off.
- Umami: no cookies and no personal data. Query strings and hashes are stripped (so links such
  as `/set-password?token=...` are recorded as `/set-password`), and browsers with Do Not Track
  turned on are not counted.

## Checking it works after a deploy

### Sentry

1. Log in to the admin portal as a **SUPER_ADMIN** and open `/admin/sentry-test`.
2. Click **Trigger backend test error**. The page should say the server returned 500.
   In Sentry → `careerconnect-api` → Issues, look for `Sentry test error (backend)`.
3. Click **Throw frontend test error**. The "Something went wrong" screen appears (reload to
   go back). In Sentry → `careerconnect-web` → Issues, look for `Sentry test error (frontend)`.
   The backend click also creates `API POST /admin/debug/sentry-test failed: HTTP 500` there.

The backend test is also available directly as `POST /api/admin/debug/sentry-test`
(SUPER_ADMIN only; anyone else gets 401/403 and nothing is sent).

### Umami

1. Open the production site in a normal browser window (Do Not Track off) and visit `/`,
   `/login`, `/register/student`, `/jobs`, and a dashboard after logging in.
2. In Umami → CareerConnect → **Realtime**, the visits appear within seconds; the
   **Pages** report shows each path.
3. Ad blockers often block `cloud.umami.is`; test with them off.

## Tests

- `server/__tests__/integration/sentry.test.js`: 5xx errors are reported and 4xx are not,
  error responses keep their format, the test route is SUPER_ADMIN-only, and the scrubber
  removes credentials and personal data.
