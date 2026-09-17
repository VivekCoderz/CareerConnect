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

## Required production settings

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and a separate strong `OTP_HASH_SECRET`.
   Set `TRUST_PROXY_HOPS` to the actual number of trusted reverse proxies; leave it at `0` for a directly exposed server.
2. Configure `VITE_RECAPTCHA_SITE_KEY` in the client and its matching `RECAPTCHA_SECRET_KEY` in the server. Set `CLIENT_URL` to every production frontend origin so the server can check the returned hostname. The API rejects protected form submissions if verification is unavailable.
3. Configure a working transactional email service with `EMAIL_USER`/`EMAIL_PASS` or SMTP settings. The API rejects OTP sends if mail is only simulated in production.
4. Use a MongoDB replica set, including Atlas, for cross-instance notification streaming. Confirm indexes are created for `PendingOTP`, `OtpRateLimit`, `NotificationUserState`, and `NotificationReadCursor` before traffic ramps up.
5. Run multiple API instances behind a load balancer with enough connection capacity for expected SSE concurrency. Configure the reverse proxy to avoid buffering `/api/notifications/stream` and allow long-lived connections.
6. Load test registration, login, notification listing, and concurrent SSE connections with realistic data and target traffic before claiming capacity for 100,000–200,000 users. Size MongoDB, SMTP throughput, API memory, and the load balancer from measured peak concurrency.

Existing Cloudinary resume files may still have predictable public IDs. New uploads use random IDs, but older files need a storage migration and access policy review if resumes must be private. File signatures reject obvious mismatches; add malware scanning before serving user uploads as trusted documents.

Existing pending OTPs are invalid after the schema change; users must request a fresh code. Previously shared notification read flags become per-user state, so a user may see an old announcement as unread once.
