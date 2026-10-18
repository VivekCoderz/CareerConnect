# Campus portal runbook (Sandip University demo and go-live)

## Switches

| Where | Variable | Value | What it does |
|---|---|---|---|
| Server (Render) | `ENABLE_CAMPUS` | `true` | Mounts `/api/campus` and starts the AI marking queue and test-expiry sweep |
| Server | `GEMINI_API_KEY` | existing key | AI marking of written answers (`CAMPUS_GEMINI_MODEL` overrides `GEMINI_MODEL`) |
| Server | `CLIENT_URL` | add `https://sandip.e2job.com` (later the university address) | CORS |
| Client (Vercel) | `VITE_ENABLE_CAMPUS` | `true` | Any host that is not e2job.com, www.e2job.com or a `*.vercel.app` preview opens the campus app |
| Local / QA only | `CAMPUS_DEV_LOGIN` | `true` | Demo sign-in for sample students without Google accounts. Refused in production by the server |
| Local / QA only | `CAMPUS_FAKE_AI` | `true` | Rough demo marks when no Gemini key is set. Ignored in production |

Firebase console: add each campus domain to Authentication > Settings > Authorized domains.

## Demo data

```
cd server
MONGODB_URI=<careerconnect_qa uri> node scripts/seed-campus-demo.js --with-results
```

Creates the Sandip University tenant (slug `sandip`, domain `sandip.e2job.com`), batch MBA 2025-27, 57 sample students
(`student01@demo.e2job.test` ... `student57@`), the manager `manager@demo.e2job.test`, the 50-question assessment (open
for 7 days), three classes, and published results for 40 students. Re-running resets the demo records.
Real Google accounts: `--extra-emails a@gmail.com,b@gmail.com --manager-email m@gmail.com`.
The script refuses any database other than `careerconnect_qa` unless `--allow-production-demo` is passed.

Local: run the server with the variables above, then open `http://localhost:5173/?campus=sandip`.

## Logo

Put the university logo at `client/public/campus/sandip-logo.png` (PNG, transparent background, about 300 px wide).
Without it the header shows the name only.

## Going live on the university's address

1. University IT: CNAME `assessment.sandipuniversity.edu.in` to the Vercel project.
2. Vercel: add the domain to the project.
3. Add the domain to `Institution.domains` for `sandip`, to `CLIENT_URL` and to Firebase authorized domains.
4. Set `allowedEmailDomains` to the university email domain only (remove the demo domains).
5. Import the real student sheet from `/ops/students` (preview first), then set the assessment window in `/ops/review`.
