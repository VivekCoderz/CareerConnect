# Domain switch: codeformode.in to e2job.com

**Decided:** 4 Oct 2026 · **Must be done by:** Mon 5 Oct night, so the 6 Oct deploy and smoke test use the final domain.

| | Address |
|---|---|
| Website | **https://www.e2job.com** (e2job.com redirects to www) |
| API | **https://api.e2job.com** (Render custom domain) |
| Support inboxes | support@, report@, employers@, grievance@, partnerships@ **e2job.com** |
| Sending address (backup OTP provider) | no-reply@e2job.com |
| Old domain | www.codeformode.in and codeformode.in redirect (301) to www.e2job.com, path kept, until at least 31 Dec |

## Order of work

Do the steps in this order. Each step lists its owner. Tick each one in the team group when done.

### 1. DNS (Ram + Imran, 5 Oct morning)
1. **Imran:** Cloudflare → Add site → `e2job.com` (Free plan). Note the two Cloudflare nameservers it gives.
2. **Ram (GoDaddy, only Ram has access):** e2job.com → DNS → turn DNSSEC off if on → Nameservers → "I'll use my own" → enter the two Cloudflare nameservers → Save.
3. **Imran:** wait until Cloudflare shows the site as Active (usually under an hour). Then add:

   | Type | Name | Target | Proxy |
   |---|---|---|---|
   | CNAME | www | value Vercel shows when the domain is added (step 2.1) | Proxied |
   | A / CNAME | @ (e2job.com) | value Vercel shows for the apex | Proxied |
   | CNAME | api | careerconnect-l1fm.onrender.com | **DNS only** (grey cloud; Render issues the certificate) |

   SSL/TLS mode: **Full (strict)**.

### 2. Hosting (Vivek, 5 Oct, after step 1)
1. **Vercel:** Project → Domains → add `www.e2job.com` (primary) and `e2job.com` (redirect to www). Keep `www.codeformode.in` and `careerconnect-v1.vercel.app` for now.
2. **Render:** Settings → Custom Domains → add `api.e2job.com`, wait for "Verified" and the certificate.
3. **Render env:** `CLIENT_URL=https://www.e2job.com,https://e2job.com,https://www.codeformode.in,https://careerconnect-v1.vercel.app` (www.e2job.com **first**: email links use the first entry).
4. **Vercel env:** `VITE_API_URL=https://api.e2job.com` (production). Redeploy. Check login, Google login, apply and the employer dashboard on www.e2job.com. If anything breaks, set `VITE_API_URL` back to the onrender.com address and redeploy.
5. Update the domain row in `docs/launch/rollback-plan.md` and run the D01 smoke test on www.e2job.com.

### 3. Sign-in, monitoring and email (Imran, 5 Oct, after step 1)
1. **Firebase** → Authentication → Settings → Authorized domains: add `e2job.com`, `www.e2job.com`. Without this, Google sign-in fails on the new domain.
2. **reCAPTCHA** admin: add both domains.
3. **Google Cloud** → Credentials → Firebase browser API key → HTTP referrers: add `https://e2job.com/*` and `https://www.e2job.com/*` (if referrer restriction is on).
4. **Cloudflare Email Routing** on e2job.com: create the 5 inboxes above, all forwarding to the team Gmail. Send a test mail to each one.
5. **Backup OTP provider (Mailjet or Resend):** verify `e2job.com` (add their SPF/DKIM records in Cloudflare), sender `no-reply@e2job.com`, send the API key to Vivek privately. Vivek sets `FALLBACK_EMAIL_FROM=no-reply@e2job.com`.
6. **Brevo** (optional, recommended): Senders & Domains → authenticate `e2job.com` (DKIM/SPF records in Cloudflare). OTP emails are then less likely to land in spam.
7. **UptimeRobot:** monitor `https://api.e2job.com/health` (keep the onrender.com monitor too).
8. **Umami:** add `www.e2job.com`; set `VITE_UMAMI_DOMAINS=www.e2job.com,e2job.com` on Vercel. **Sentry:** add the new domain to allowed domains if set.
9. **Old domain:** Cloudflare → codeformode.in → Rules → Redirect Rules → all requests to `https://www.e2job.com` + same path, 301. Do this **only after** www.e2job.com works end to end.

### 4. Code (Ram, done 4 Oct on launch/job-portal)
- Contact, Privacy and Terms pages: the 5 inboxes are now @e2job.com (`client/src/config/legal.js`).
- Notification email fallback link: https://www.e2job.com.
- Launch posts, support playbook, rollback plan and monitoring docs updated.

### 5. SEO (Sneha, in G02)
- Canonical URLs, Open Graph `og:url`, sitemap entries and `robots.txt` use **https://www.e2job.com**.
- `client/vercel.json` rewrite: `/sitemap.xml` to `https://api.e2job.com/sitemap.xml`.

### 6. Test (Tripti, after steps 1 to 3)
On www.e2job.com: open the home page, a job page and /privacy; Google sign-in; email sign-up (one OTP only); apply as a candidate; employer dashboard; admin login. Check that a notification email link opens www.e2job.com, that codeformode.in redirects (after step 3.9), and that each support inbox receives mail.

### 7. Outside the code (Ram)
- Launch posts, WhatsApp/Telegram channel descriptions, LinkedIn page website field: www.e2job.com.
- Brand name: the site still says **CareerConnect**. If the brand changes to E2Job, decide before the 6 Oct freeze; it touches page titles, emails, legal pages and the logo.
