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
