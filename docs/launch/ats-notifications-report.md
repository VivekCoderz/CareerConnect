# Applicant handling and candidate notifications: what changed

**Date:** 2 October 2026 · **Branch:** `launch/job-portal` · **Owner:** Ram

**Why:** with assisted posting, one job can get 300+ applicants. Employers had to shortlist or reject them one click at a time, candidates were never told about most decisions, and sending one email per rejection would use up the free email quota (Brevo: 300 a day) that signup OTPs depend on.

## Summary

| # | Change | Who sees it |
|---|---|---|
| 1 | **Bulk actions**: select many applicants, then Shortlist / Under review / Move to interview / Reject | Employers (Applicant Tracking → list view) |
| 2 | **Every status change notifies the candidate** in-app (bell icon) | Candidates |
| 3 | **Email rules**: good news emailed right away; rejections and closed positions in **one daily summary email** (6 PM IST); a daily email budget that **always leaves room for signup OTPs** | Candidates, all signups |
| 4 | **"Position filled" notice** when a job or internship closes, to everyone still waiting | Candidates |
| 5 | **Super Admin can post a job or internship for an approved employer** | Super Admin, employers |

## 1. Bulk actions (employers)

- In **Applicant Tracking → list view**, each applicant card has a checkbox, plus **Select all shown**.
- Actions: **Shortlist**, **Under review**, **Move to interview**, **Reject**. Reject asks for a second click.
- Offers and hiring stay **one candidate at a time** on purpose.
- Withdrawn and hired applications are skipped automatically; the toast shows how many were skipped.
- Large selections are sent in batches of 300, so "select all" works for any number of applicants.
- API: `PATCH /api/applications/bulk-status` with `{ applicationIds, status }`. Employers can only touch their own applicants.

## 2. In-app notifications for candidates

- **Every status change** creates a notification in the candidate's bell, from any of these paths: single status change, ATS stage change, move to next stage, select, reject, and bulk actions.
- **Bug fixed:** the move-next / select / reject notifications used types the database doesn't accept, so they **always failed silently**. Candidates never received them. They now work.
- Notifications link to `/applications`.

## 3. Email rules (protects signup OTPs)

| Update | Email |
|---|---|
| Shortlisted, Interview, Selected, Offer, Hired | **Right away** |
| Rejected, Position filled | **One daily summary email** per candidate at 6 PM IST (up to 20 updates per email) |
| Signup / password OTPs | Always sent; counted but never blocked |

- **Daily budget:** non-OTP emails are limited to **150 a day** by default (`NOTIFICATION_EMAIL_DAILY_BUDGET` on Render), so about 150 of Brevo's 300 stay for OTPs.
- When the budget runs out, good-news emails move into the next daily summary. The in-app notification has already reached the candidate.
- Counts are stored in MongoDB (`EmailUsage`), so they survive restarts.
- Every email says CareerConnect never asks candidates for money.

## 4. "Position filled"

- When an employer or admin **closes** a job or internship, or an employer deletes their account, every candidate still waiting (not hired, rejected or withdrawn) gets one "position closed" notification. It's included in their daily summary email.
- Application statuses are **not** changed, because an employer can re-open a listing.
- **Vivek (G04 job expiry):** when the auto-close job closes an expired listing, call `notifyListingClosedInBackground("job" | "internship", id)` from `server/services/listingClosure.js`.

## 5. Super Admin: post for an employer (assisted posting)

- **Opportunities → + Post for an employer** (Super Admin only).
- Choose an **approved** employer, fill in the title, location, description, skills, deadline and an optional apply link, then **Post and publish**.
- The listing belongs to the **employer's own account**: it appears in their dashboard and **they manage the applicants**. It's published right away, marked as approved by the admin, and recorded in the audit log.
- The employer gets an in-app notification: "We posted … for you".
- API: `POST /api/admin/opportunities`. Unapproved employers get 400; anyone other than a Super Admin gets 403.

## For the team

- **Vivek (G03):** application-status emails are done here. For **interview and offer emails**, use `notifyApplicationUpdates()` or the budget in `services/emailBudget.js` (`reserveNotificationEmail()`), so all non-OTP email shares the same daily budget.
- **Imran:** two new Application indexes, `{ jobId, status }` and `{ internshipId, status }`, plus one Notification index for the daily summary. They're built automatically on deploy.
- **Tripti (QA):** test bulk select → reject / shortlist with 20+ applicants; check that candidates see the notification; close a job and check the "position filled" notice; post on behalf of an employer as Super Admin.
- **Ram:** for assisted posting (J03), use **Post for an employer** after the employer is approved.

## Tests

`server/__tests__/integration/atsBulkNotifications.test.js` (9 cases): bulk reject with skips and ownership, the email budget, the oversized-batch and disallowed-status rules, single-change notifications, "position filled", one daily summary per candidate, OTPs never blocked, and admin posting on behalf.
