# Security hardening and production setup

## Changes in this pass

- Firebase sign-in requires a verified email. Google sign-in also requires the Google provider, and an existing account's Firebase UID cannot be replaced by a different UID. Password setup requires a matching fresh Firebase identity.
- Email verification and password reset codes use cryptographically secure randomness and are stored as HMAC hashes. Verification returns a short-lived, one-use proof; five failed guesses exhaust a code. Shared MongoDB counters limit send and verification requests across API instances. Password reset increments the account authentication version, invalidating earlier JWTs and sessions.
- Notification routes require authentication. Private notifications are scoped to their recipient. Shared announcements retain separate read and delete state per user. SSE sends private events only to the intended user's connections. On MongoDB replica sets, one change stream per API process forwards inserts created on other processes.
- Production reCAPTCHA v3 checks the token with Google and requires the expected action, score, and frontend hostname. Missing, forged, or unverifiable tokens are rejected.
- Recruitment tests hide answer keys from candidates, limit attempts, and restrict employer results. Offers require a matching application to an employer-owned job. Uploads check file content and course files stream from temporary disk instead of occupying 100 MB of Node memory.
- Browser writes using authentication cookies require an allowed frontend origin. Production CORS uses only configured `CLIENT_URL` origins, and login limits are shared in MongoDB.
- Job and internship updates accept only listing fields, and unpublished details are visible only to their owner. Public search escapes regex characters, returns only published listings, and bounds the job query to the requested result window. Search requests beyond 5,000 results must narrow their filters.
- Profile updates cannot overwrite ownership, verification, calculated completion, or employer publication state. Production course, resume, and employer errors no longer expose underlying exception messages.
- Public opportunity detail excludes draft jobs and internships. Employee changes now accept editable fields only; training assignments require an employee from the same employer and an available course. Employee deletion removes only that employer's assignments.
- AI chat limits query and history size and uses a shared per-user request counter (30 chats/hour; 5 recommendation sends/day). Recruitment and organization searches escape user-supplied regex characters. Aggregated opportunity reads, internship listings, and employer course catalogs have bounded database windows.
- Candidate detail responses omit internal authentication fields. Candidate interview views omit internal notes and feedback. ATS stage aliases map to valid application statuses, and offer creation stores the valid `Offered` status.
- Public fresher and professional profiles return portfolio fields without private contact, compensation, date-of-birth, or resume data. Recruiter-only professional profiles require a signed-in employer or admin account; direct enrollment in draft courses is blocked.
- Student and fresher dashboards read at most 20 recent records per opportunity source, avoiding a full published-listing scan on every dashboard request.
- Invalid job IDs return a normal not-found response without a database cast error. Public-page optional authentication now recognizes valid login sessions as well as JWTs.
- Google sign-in can recover an unfinished signup after Firebase confirms its previous UID was deleted. Cancellation deletes the browser's Firebase identity only after the server confirms an atomic removal of that unfinished account.

## Required production settings

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and a separate strong `OTP_HASH_SECRET`.
   Set `TRUST_PROXY_HOPS` to the actual number of trusted reverse proxies; leave it at `0` for a directly exposed server.
2. Configure `VITE_RECAPTCHA_SITE_KEY` in the client and its matching `RECAPTCHA_SECRET_KEY` in the server. Set `CLIENT_URL` to every production frontend origin so the server can check the returned hostname. The API rejects protected form submissions if verification is unavailable.
3. Configure a working transactional email service with `EMAIL_USER`/`EMAIL_PASS` or SMTP settings. The API rejects OTP sends if mail is only simulated in production.
4. Use a MongoDB replica set, including Atlas, for cross-instance notification streaming. Confirm indexes are created for `PendingOTP`, `OtpRateLimit`, `NotificationUserState`, and `NotificationReadCursor` before traffic ramps up.
5. Run multiple API instances behind a load balancer with enough connection capacity for expected SSE concurrency. Configure the reverse proxy to avoid buffering `/api/notifications/stream` and allow long-lived connections.
6. Load test registration, login, notification listing, and concurrent SSE connections with realistic data and target traffic before claiming capacity for 100,000–200,000 users. Size MongoDB, SMTP throughput, API memory, and the load balancer from measured peak concurrency.

New Cloudinary resume uploads use authenticated delivery and an immutable asset ownership record. A signed, one-minute download is issued only to the owner or the employer for an application that used that exact resume.

### Resume privacy rollout (18 September 2026)

- A private backup of the affected MongoDB documents was verified before migration: 6 collections and 60 documents. It is stored outside the repository in the operator's private temporary directory. Move it to approved encrypted backup storage before that directory is cleared.
- The migration changed 27 referenced public resumes to authenticated delivery, with no ownership conflicts or failed items. Another 23 unreferenced public resume assets were restricted. `node scripts/verify-resume-privacy.js` then found 0 legacy database references, 27 authenticated recorded assets, 0 missing assets, and 0 remaining public resume assets in the Cloudinary folder. A sampled old public URL returned HTTP 404, and a signed private download returned HTTP 200.
- Deploy the matching server and client changes together, then verify candidate preview and employer application download using real accounts. The database migration alone does not provide the new `/api/resume/download` route to a server still running old code. Re-run `node scripts/verify-resume-privacy.js` after deployment to catch any new public uploads from old instances. Cloudinary CDN invalidation may take several minutes; previously copied public URLs can remain cached briefly. Add malware scanning before treating uploaded files as trusted documents.

### MongoDB credential rotation (still required)

The current MongoDB database-user password has been disclosed and must be rotated by an Atlas Project Owner or Database Access administrator. The Atlas login is held by another developer, so this step cannot be completed from this workspace yet. The account owner should:

1. Generate a strong, unique replacement password in a password manager. In Atlas **Database Access**, edit the affected database user and replace its password. Do not paste either the old or new connection string into chat, an issue, or the repository.
2. Update `MONGODB_URI` in every backend deployment secret store and in each developer's local `server/.env` through a secure channel. Restart all API instances and verify database connectivity, sign-in, and a resume download. If zero downtime matters, create a new scoped database user first, switch all deployments, then delete the old user.
3. Remove the old credential, review Atlas database access logs and user privileges for unexpected activity, and confirm the old connection string no longer authenticates. Rotate any other secrets that were stored or shared alongside it.

The public opportunity feed now has shared MongoDB request limits, a maximum of 24 concurrent distinct feed fetches per API process, same-query request coalescing, and a bounded 50-entry cache. Load-test these settings at expected peak traffic; put a rate limit at the reverse proxy or CDN as the first line of defense for a large audience.

Existing pending OTPs are invalid after the schema change; users must request a fresh code. Previously shared notification read flags become per-user state, so a user may see an old announcement as unread once.

### Credential rotation completed (Z03) - 28 Sep 2026, Vivek

- MongoDB: new database user created and `MONGODB_URI` updated on Render. The old user's password was changed, so the disclosed connection string no longer works.
- `JWT_SECRET`, `SESSION_SECRET`: regenerated (48 random bytes each) and set on Render.
- `OTP_HASH_SECRET`: added on Render. Removed the unused `OTP_SECRET` variable (the code reads `OTP_HASH_SECRET`).
- Razorpay test key: regenerated, old key deactivated immediately. This is Vivek's personal test account; replace it with the company account before payments are enabled.
- `BREVO_API_KEY`, `CLOUDINARY_API_SECRET`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`: git history checked, only placeholder values were ever committed. Not rotated.
- Firebase web key restricted to our domains, Firebase Auth authorized domains cleaned up, reCAPTCHA domains restricted.
- CORS: confirmed `CLIENT_URL` on Render = `https://careerconnect-v1.vercel.app` (Google login was blocked until this was fixed).
- Verified after deploy: `/health` OK, email login OK, Google login OK, OTP email OK.
- Team: anyone using the production database locally needs the new `MONGODB_URI` in their `server/.env`, shared privately.

## Database network access: decision (25 Nov 2026, Imran)

**Today:** Atlas *Network Access* allows `0.0.0.0/0`, so anyone who has the connection string can connect from anywhere. The password is the only barrier, and the string has leaked once already (Z03 above).

**What connects to Atlas:**

| Client | Runs on | Database |
|---|---|---|
| API (web) | Render Starter, Hobby workspace | production (Atlas Free, M0) |
| Worker (#261) | Render | production |
| Staging API and worker | Render Free | staging (separate Atlas project, M0) |
| Nightly backup (`mongodb-backup.yml`) | GitHub Actions runner | production |
| Staging refresh (`staging-refresh.yml`) | GitHub Actions runner | staging |

### Options priced (per month; ₹96 per US$1)

| Option | Cost | Result | Problem |
|---|---|---|---|
| A. Keep `0.0.0.0/0` | $0 | nothing changes | A leaked string works from anywhere. |
| **B. Render's outbound IP ranges in the Atlas access list** | **$0** | Only Render services in our region (plus short-lived CI entries) can connect. | The ranges are shared with every Render customer in that region. Workspaces created before 23 Jan 2022 have no fixed ranges in Oregon. |
| C. Render dedicated IPs | **$125 (≈ ₹12,000)**: Pro workspace $25 + $100 per set of 3 IPs, one region | IPs only we use | More than the rest of the hosting bill. |
| D. Static-IP proxy (QuotaGuard Static, SOCKS5) | $19–49 (≈ ₹1,800–4,700) | 2 fixed IPs | All database traffic goes through a third party, with bandwidth caps (10 GB/month on the cheapest plan), extra latency and one more point of failure. |
| E. Private networking (Atlas private endpoint or VPC peering) | M10 ≈ $57–60 (≈ ₹5,500–5,800) **plus** moving the API to AWS/GCP/Azure | Database not reachable from the internet at all | Needs a dedicated M10+ cluster (Free and Flex support only IP access lists) and a VPC to peer with. Render can't connect to an Atlas private endpoint. |

Sources: [Render outbound IPs](https://render.com/docs/outbound-ip-addresses), [Render dedicated IPs](https://render.com/blog/dedicated-ips-for-your-services-on-render), [Render plans](https://render.com/pricing), [Atlas private endpoints](https://www.mongodb.com/docs/atlas/security-private-endpoint/), [Atlas peering](https://www.mongodb.com/docs/atlas/security-vpc-peering/), [Atlas pricing](https://www.mongodb.com/pricing), [QuotaGuard pricing](https://www.quotaguard.com/pricing). Prices checked 25 Nov 2026.

### Decision

**Option B now; option E when we move to M10 and AWS** (the layout in `production-cost-report-india.md`). C and D cost more than they protect at our size. B removes "anyone on the internet" for free, and the database user password stays the second barrier.

### Steps (Imran prepares, the Atlas owner applies)

1. In Render, open each service (API, worker, staging API, staging worker) → **Connect → Outbound** and copy the outbound IP ranges. Note the region. If the workspace predates 23 Jan 2022 and is in Oregon, stop: there are no fixed ranges, and B isn't possible without moving region.
2. In Atlas (production project), **Network Access**: add each Render range with a comment such as `Render <region> outbound`. Do the same in the staging project for the staging services.
3. GitHub Actions: create an Atlas API key per project with *Project Network Access Manager* only, saved as repository secrets. At the start of `mongodb-backup.yml` and `staging-refresh.yml`, add the runner's IP for one hour: `atlas accessLists create --currentIp --deleteAfter <now + 1 h> --comment "GitHub Actions <run id>"`. Delete it again at the end of the job (`if: always()`).
4. Developers who need the production database add their own IP temporarily the same way, with `--deleteAfter`, never `0.0.0.0/0`.
5. Then remove `0.0.0.0/0`. Check right away: `/health` on production and staging, a login, the worker's logs, and a manual run of both workflows.
6. Rollback: add `0.0.0.0/0` back (one click). Nothing else changes.

**Revisit** when moving to M10/AWS (then use a private endpoint and drop the public access list), if Render changes how its outbound ranges work, or if the database starts holding data that needs more than a password and a shared IP range.
