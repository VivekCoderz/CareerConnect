# CareerConnect 🚀

[![CareerConnect CI](https://github.com/VivekCoderz/CareerConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/VivekCoderz/CareerConnect/actions/workflows/ci.yml)

**CareerConnect** is a job and internship platform for students, freshers and working professionals, with a hiring workspace for employers. It combines opportunity discovery, an AI resume builder and ATS checker, personalised job recommendations, and an applications → interviews → offers pipeline.

This README lists what is **built and wired up today**. Features that exist in code but are switched off by default are listed separately, as is what is not built yet.

---

## ✅ What works today

### Visitors (not logged in)

* Browse jobs and internships, with filters by city, category, work-from-home, latest, paid, international and with-job-offer (`/jobs`, `/internships`)
* View job and internship detail pages and public company profiles
* Combined opportunity feed (`/opportunities`)
* Request organization access for a company (`/organizations/request-access`)

### Job seekers (student, fresher, professional)

Each seeker type has its own profile and dashboard (`/student/*`, `/fresher/*`, `/professional/*`).

* **Accounts** — email + password sign-up with email OTP verification, Google sign-in (Firebase), forgot/reset password via OTP, CAPTCHA on sign-up and login, JWT in an httpOnly cookie, OTP-verified email change, account deletion
* **Profile** — skills, education, experience, career goal; fresher profiles have a setup wizard and a public profile page
* **Fresher dashboard** — profile strength, counts and "Jobs for you" scored against the fresher's preferences
* **Apply** — apply to jobs/internships, track application status (`/applications`), respond to offers
* **Resume tools** (`/resume-builder`)
  * Build a resume from profile data, or upload a PDF and have it parsed into the profile
  * AI resume generation and ATS-format generation
  * ATS score against a job description, plus PDF check-and-optimize
  * Tailor a resume to a specific job or internship
  * Keep several resumes, set a primary one, download it
  * Shareable live resume link (`/live-resume/:id`)
* **Skills** — skill catalogue and trending skills (`/api/skills`, `/api/skills/trending`)
* **Market insights** for professionals — market analytics and company details
* **Notifications** — in-app (live via Socket.IO / server-sent events) and email, with read tracking and email digests
* **Support** — raise support tickets, report a job or internship listing

### Employers

* Employer sign-up, Google onboarding, company profile with draft → publish, company approval request
* Post and edit jobs and internships; listings close automatically
* Review applications, search candidates and view candidate profiles
* Schedule, reschedule, cancel and complete interviews; scorecards and results
* Create offers, export offers as PDF, track candidate responses
* Hiring analytics dashboard
* Organization workspace — employees, departments, team roles, training assignments and team skill-gap view

### Admins

* Separate admin login with invite-based activation (no public admin sign-up)
* Manage users, employers, companies and company admins
* Moderate opportunities, applications and reported listings
* Support ticket queue, platform-wide notifications, platform settings (including maintenance mode)

### Platform

* External job sync from Remotive and Arbeitnow (with source attribution)
* Rate limiting, input sanitising, CORS allow-list, audit log
* Sitemap generation for job and internship pages
* CI on every push, plus scheduled MongoDB backup and restore-test workflows

---

## 🚧 Built but off by default

These are behind feature flags and are **disabled unless the flag is set to `true`** on both server and client:

| Feature | Server flag | Client flag |
|---|---|---|
| Courses (catalogue, enrolment, lessons, progress, employer course authoring) | `ENABLE_COURSES` | `VITE_ENABLE_COURSES` |
| Paid courses via Razorpay | `ENABLE_PAYMENTS` | `VITE_ENABLE_PAYMENTS` |
| Employer skill assessments | `ENABLE_ASSESSMENTS` | `VITE_ENABLE_ASSESSMENTS` |
| Career recommendations page (`/fresher/career-recommendations`) — skill-gap analysis, recommended courses and projects, career paths, action plan | — (API always on) | `VITE_ENABLE_CAREER_ADVICE` |

With the server flags off, the related API routes return 404; with the client flags off, the pages and menu items are hidden.

Also not reachable from the UI yet:

* **Saved jobs** — the save buttons are hidden behind `VITE_ENABLE_SAVED_JOBS` because `POST /api/student/save` returns 501 (not stored yet).
* **AI assistant** — `POST /api/ai/chat` (Gemini with retrieval over platform data) is live, but the chat widget is not mounted in the app.

---

## 🔭 Not built yet

* Mock interviews, coding practice and aptitude tests for seekers
* Student leaderboard

---

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB with Mongoose |
| Auth | JWT in httpOnly cookies, Firebase (Google sign-in), email OTP |
| AI | Google Gemini |
| Media | Cloudinary |
| Email | Brevo |
| Payments | Razorpay (flagged off) |

## 📁 Project structure

```text
CareerConnect/
├── client/            React + Vite app
│   └── src/
│       ├── pages/       admin, auth, courses, employer, fresher, internships,
│       │                jobs, professional, resume, student, ...
│       ├── components/
│       ├── services/    API clients
│       └── config/      feature flags
├── server/            Express API
│   ├── controllers/
│   ├── models/
│   ├── routes/          mounted in server/app.js
│   ├── middleware/
│   ├── services/        recommendation engine, AI resume, ATS, job sync, notifications
│   └── __tests__/
└── docs/
```

---

## Hosting & Service Plans

CareerConnect uses the following services for production hosting, database,
media storage, and email communication.

| Service | Plan | Production Details |
|---|---|---|
| **Render** | Free | Backend hosting with sleep/cold-start behavior |
| **MongoDB Atlas** | Free | Free database cluster |
| **Cloudinary** | Free | Media and file storage |
| **Brevo** | Free | Email service with a limit of 300 emails/day |

### Production Backend Deployment

- **Platform:** Render
- **Backend Service:** CareerConnect
- **Runtime:** Node.js
- **Deployed Branch:** `main`
- **Auto Deploy:** Enabled
- **Sleep / Cold Start:** Enabled
- **Production Environment:** Render Production

### Database

- **Service:** MongoDB Atlas
- **Plan:** Free
- **Usage:** Production database for CareerConnect

### Media Storage

- **Service:** Cloudinary
- **Plan:** Free
- **Usage:** Image/media storage and management

### Email Service

- **Service:** Brevo
- **Plan:** Free
- **Email Limit:** 300 emails per day

> **Note:** Service limits and quotas are subject to change according to
> the respective provider's current free-tier policies.