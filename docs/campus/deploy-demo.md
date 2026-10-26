# Deploy the Sandip University demo on sandip.e2job.com

This puts the university portal online as a separate demo. Live E2Job (www.e2job.com, api.e2job.com,
the production database, the main branch) is not touched.

| Part | Where | Source |
|---|---|---|
| Backend | New Render web service | Branch `feature/campus-sandip`, folder `server` |
| Frontend | New Cloudflare Pages project | Branch `feature/campus-sandip`, folder `client` |
| Database | Existing Atlas cluster, database `careerconnect_qa` | Demo data is already there |
| Domain | GoDaddy DNS for e2job.com | `sandip` CNAME to the Pages project |

Do the steps in order. Never paste secret values into chat or commit them.

## 1. Backend on Render

New > Web Service > repository `VivekCoderz/CareerConnect`.

- Branch: `feature/campus-sandip`
- Root directory: `server`
- Build command: `npm ci`
- Start command: `node server.js`
- Instance: Free is enough for the demo (see the note on sleeping at the end)

Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | The cluster connection string with the database name `careerconnect_qa` (not the production database) |
| `JWT_SECRET` | A new random string, 32 characters or more. Do not reuse the production secret |
| `SESSION_SECRET` | Another new random string, 32 characters or more |
| `CLIENT_URL` | `https://sandip.e2job.com` |
| `ENABLE_CAMPUS` | `true` |
| `CAMPUS_DEMO_LOGIN` | `true` (lets only the `@demo.portal.test` sample accounts sign in without Google) |
| `GEMINI_API_KEY` | The existing key (marks written answers) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Same as the production service (Google sign-in) |

Cloudinary variables are optional. Without them, recordings, photos and resumes are stored in the
database, which is fine for the demo.

When it is live, open `https://<service-name>.onrender.com/api/campus/tenant` once. A 404 with
"This portal was not found" is expected here, because the request does not come from sandip.e2job.com.
It confirms the campus module is running.

## 2. Frontend on Cloudflare Pages

Workers and Pages > Create > Pages > Connect to Git > same repository.

- Production branch: `feature/campus-sandip`
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Environment variables (Production):

| Name | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | `https://<service-name>.onrender.com/api` (from step 1) |
| `VITE_ENABLE_CAMPUS` | `true` |
| `VITE_CAMPUS_DEV_LOGIN` | `true` (shows the demo sign-in box) |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Same as the Vercel project |

`client/public/_headers` already sets the header Google sign-in needs. Pages serves `index.html` for every
path, so the portal's own routes work without extra settings.

The `*.pages.dev` address shows "This portal was not found". That is expected: the portal works only on
the domain saved for the university (sandip.e2job.com).

## 3. Domain

1. Pages project > Custom domains > Set up a domain > `sandip.e2job.com`. Cloudflare shows the target.
2. GoDaddy > e2job.com > DNS > Add record: type `CNAME`, name `sandip`, value `<project>.pages.dev`, TTL default.
3. Wait until Pages shows the domain as Active (usually a few minutes; the certificate is automatic).

## 4. Firebase

Firebase console > Authentication > Settings > Authorized domains > Add `sandip.e2job.com`.

## 5. Check

Open https://sandip.e2job.com.

- The Sandip University landing page appears (not E2Job).
- Demo sign-in `student45@demo.portal.test`: consent, profile, dashboard.
- Demo sign-in `manager@demo.portal.test`: university dashboard.
- Staff: "Staff" link at the bottom of the landing page, with a staff account that exists in
  `careerconnect_qa` (Ram sets his own password with `server/scripts/createAdmin.js` against that database).

## Notes

- A free Render service sleeps after 15 minutes without traffic; the first request then takes about
  50 seconds. Open the site a couple of minutes before a demo.
- The demo still shows "e2job" in the address and in the Google sign-in popup. Both go away when the
  portal moves to the university's own domain and its own Firebase settings.
- To update the demo, push to `feature/campus-sandip`. Render and Pages redeploy that branch.
- To take it down: delete the Pages project, the Render service and the GoDaddy record.
