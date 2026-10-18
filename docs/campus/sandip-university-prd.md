# PRD: Sandip University Assessment and Training Portal

| | |
|---|---|
| Owner | Ram Mohan Dixit (E2Job) |
| Status | Draft v2, 18 Oct 2026 (camera required, AI only for written answers) |
| Customer | Sandip University, MBA batch (60 students) |
| Built on | E2Job platform (same codebase and database) |
| Key dates | Internal demo to Amit sir: 20 Oct. Presentation to the university: 22 or 23 Oct |
| Related | [Plan for Amit sir (PDF)](../../output/pdf/Sandip_University_Assessment_Portal_Plan.pdf) |

## 1. Problem statement

Sandip University wants to assess its MBA batch of 60 students online and run training for them, on a portal that students see as the university's own. Today the university has no online assessment with fair-test controls, no way to group students by CGPA for training, and no single place to track results and attendance. Without this, the tender is lost, and E2Job also misses 60 verified MBA students who could later use E2Job for jobs and internships.

## 2. Goals

| # | Goal | Measure | Target |
|---|---|---|---|
| G1 | Students can start without manual setup | Share of the university's students whose account is created from the sheet with no manual edits | 100% of valid rows |
| G2 | Students actually take the test | Share of imported students who submit the assessment in its window | 90% or more |
| G3 | No student loses the attempt to a technical fault | Attempts lost to crashes, refreshes or network drops (not recoverable) | 0 |
| G4 | Results reach students fast | Time from the window closing to results published | Within 24 hours |
| G5 | The university serves itself | Report requests the university sends to E2Job by email or WhatsApp | 0; all reports downloaded from the dashboard |

Business goal: win the Sandip University tender and reuse the same module for more universities without new code per university.

## 3. Non-goals (v1)

| Non-goal | Why not now |
|---|---|
| Separate questions per MBA specialization (Marketing, Finance, HR...) | The university has not asked for it; one common assessment for the batch. The data model keeps room for it (P2). |
| Self-serve sign-up of new universities | One customer. E2Job sets up each university. |
| Live human proctoring or video interviews / group discussion | Too heavy for the timeline; automated checks plus camera snapshots are enough for v1. |
| Showing correct answers to students | Keeps the question bank reusable. |
| Course content, video lessons, quizzes inside training | Training is live on Google Meet; the portal only shows the next class and records attendance. The existing E2Job course feature stays off. |
| Sending email from the university's own domain | Needs the university's IT for email records; sender name will say "Sandip University Assessment Portal". |
| Payments | Not part of the tender. |

## 4. Personas and user stories

**Student (Sandip University MBA)**
- As a student, I want to sign in with my university Google account so that I do not create or remember a new password.
- As a student, I want my details already filled in when I first sign in so that I only correct what is wrong.
- As a student, I want to know which details are still being verified so that I know my CGPA has been checked.
- As a student, I want to see when the assessment opens and how long it is so that I can plan.
- As a student, I want my answers to be saved as I go so that a network drop or refresh does not cost me the test.
- As a student, I want to record my spoken answer and listen to it before I move on so that I know it worked.
- As a student, I want a simple result with my score per section and what to improve so that I know where I stand.
- As a student, I want to see my next training class and join it in one click so that I do not search for links.
- Edge: as a student whose email is not in the university's sheet, I want a clear message on who to contact so that I am not stuck.
- Edge: as a student who denies camera or microphone access, I want to be told clearly that the test needs both and how to allow them, so that I can fix it and start.

**University portal manager**
- As the portal manager, I want to see all my students with their CGPA band so that I can follow each group.
- As the portal manager, I want to download results and attendance as Excel or PDF so that I can share them inside the university without asking E2Job.
- As the portal manager, I want to see which tests were flagged by the fair-test checks so that I can act on them.
- As the portal manager, I want to see only my university's students so that no other institution's data is visible to me.

**E2Job operations (importer, verifier, reviewer)**
- As an E2Job admin, I want to upload the university's sheet and see every row's problem before accounts are created so that bad data does not get in.
- As a verifier, I want to mark a student's CGPA and details as verified so that the university can trust them.
- As a reviewer, I want to see AI marks with the AI's reason, flagged answers first, and change any mark so that wrong marks never reach a student.
- As a reviewer, I want to publish all results at once so that every student sees the result at the same time.
- As an E2Job admin, I want to add a full training schedule from a sheet so that I do not enter 20 classes one by one.

**Trainer (hired by E2Job)**
- As a trainer, I want my classes listed with the Meet link and the batch or band so that I join the right class.

## 5. Requirements

### P0: must have for the 22/23 Oct presentation

**R1. University portal and branding**
- The portal opens on a university address (demo: an E2Job sub-address for Sandip University; later the university's own sub-domain such as `assessment.sandipuniversity.edu.in`) and shows Sandip University's name and logo.
- The same code serves any future university; a new university is a configuration entry, not new code.
- Footer shows "Powered by E2Job".
- Acceptance:
  - [ ] Given the Sandip University address, when a visitor opens it, then the landing page shows Sandip University's name and logo and no E2Job job-portal navigation.
  - [ ] Given the main E2Job address, when a visitor opens it, then the normal E2Job site shows and no university data is reachable.

**R2. Landing page**
- Program name, what the assessment and training are, key dates, "Sign in with Google" button, help contact.
- Acceptance: [ ] Page works on a phone (390 px wide) and a laptop without sideways scrolling.

**R3. Import students from the university's sheet**
- E2Job admin uploads an Excel sheet in a fixed template: name, university email, roll number, CGPA, phone, batch.
- Every row is checked before anything is created: valid email on the university's email domain, CGPA between 0 and 10, no duplicate email or roll number. Problems are shown per row; valid rows can be imported while invalid rows are fixed.
- Re-uploading the same sheet updates existing students instead of creating duplicates.
- Acceptance:
  - [ ] Given a sheet of 60 valid rows, when imported, then 60 student accounts exist, each linked to Sandip University and the batch, with details filled in.
  - [ ] Given a row with CGPA 11 or a missing email, when previewed, then that row is rejected with the reason and no account is created for it.
  - [ ] Given the same sheet uploaded twice, then the student count stays 60.

**R4. Sign-in**
- Students sign in with Google using their university account. Only emails that were imported for the university can sign in to that university's portal.
- Acceptance:
  - [ ] Given an imported student, when they sign in with the university Google account, then they reach their dashboard.
  - [ ] Given a Google account that is not in the sheet (including personal Gmail), when it signs in, then access is refused with "Your email is not registered for this program. Contact <help contact>".

**R5. Consent (DPDP)**
- On first sign-in the student sees a short notice: the portal is run by E2Job for Sandip University, E2Job keeps the data, what it is used for, that written answers are checked by an AI service, and that the camera is used during the test. The student must agree to continue. The time of agreement is stored.
- Acceptance: [ ] A student who has not agreed cannot open the assessment or the dashboard.

**R6. Profile and verification**
- After consent the student sees their imported details and can correct them.
- CGPA and identity details carry a status: Pending or Verified. An E2Job verifier sets Verified. If a student changes a verified field, it returns to Pending.
- Acceptance:
  - [ ] Given a verified CGPA, when the student edits it, then it shows Pending and the verifier sees it in the pending list.

**R7. CGPA bands**
- Band 1: below 6.0. Band 2: 6.0 to 7.99 (6.0 is Band 2). Band 3: 8.0 and above.
- Set by the system from the CGPA, never chosen by hand; recalculated when the CGPA changes.
- Acceptance: [ ] CGPA 5.99 → Band 1; 6.0 → Band 2; 7.99 → Band 2; 8.0 → Band 3.

**R8. Question bank and assessment setup (E2Job prepares the questions)**
- One assessment: 50 questions, 60 minutes, 1 attempt.

| Section | Type | Questions |
|---|---|---|
| Quantitative aptitude | Multiple choice | 8 |
| Logical reasoning | Multiple choice | 7 |
| Data interpretation | Multiple choice | 5 |
| Verbal ability | Multiple choice | 5 |
| Business fundamentals | Multiple choice | 12 |
| Situational judgement | Multiple choice | 6 |
| Business awareness | Multiple choice | 3 |
| Business scenarios | Written, 80 to 150 words | 3 |
| Speaking | Recorded, 60 to 90 seconds | 1 |

- E2Job writes the full set plus a backup set, each multiple-choice question with its answer and a short explanation (explanation is never shown to students). Written and speaking questions each have a marking scheme.
- An assessment has an opening and closing time (India time) for the batch.
- Acceptance: [ ] The assessment cannot be opened before its start time or after its close time.

**R9. Taking the test**
- Timer runs on the server. Refreshing, closing the browser or switching device continues the same attempt with the remaining time; it never restarts the clock or gives a second attempt.
- Answers save automatically after every answer.
- At the end of the time the attempt submits itself.
- Speaking question: record in the browser, play it back, re-record within the time limit, then submit.
- Acceptance:
  - [ ] Given a student 30 minutes into the test, when the page is refreshed, then the same questions, saved answers and about 30 remaining minutes appear.
  - [ ] Given a submitted attempt, when the student opens the test again, then they see "Already submitted" and no questions.
  - [ ] Given the timer reaches zero, then the attempt is submitted with whatever was saved.

**R10. Fair-test checks (proctoring)**
- Full screen required; leaving full screen or switching tab or window is recorded with time. Warning on each event; after the 3rd event the attempt submits automatically.
- Copy, paste and right-click disabled inside the test.
- Question order and option order shuffled per student.
- Camera and microphone are required. Before the test starts the portal checks both; if either permission is denied, the test does not start and the student sees how to allow it and try again. If the camera stops during the test, it counts as a fair-test event and the test is paused until the camera is back (the timer keeps running).
- Camera snapshot every few minutes. Snapshots are private.
- Acceptance:
  - [ ] Given a student who denies camera access, when they click Start, then the test does not start and the clock does not begin.
  - [ ] Given 3 tab switches, then the attempt is submitted and marked "Auto-submitted: tab switching".
  - [ ] Two students see the same questions in a different order.
  - [ ] The reviewer and portal manager see each attempt's event count and snapshots; students never see other students' data.

**R11. Checking and results**
- Multiple choice: matched directly against the answer key, immediately. No AI is used for multiple choice.
- Written answers: only these go to the AI (Google Gemini), marked against the marking scheme, with a short reason per answer. Only the question, the marking scheme and the answer text are sent; no name, email or other personal details.
- Speaking: the E2Job team listens to each recording and marks it for clarity, fluency and content using the marking scheme (default; see Q4).
- Same instructions and settings for every student. Written answers are compared across the batch; very similar answers are flagged as possible copying.
- AI checking runs in a queue that survives a server restart and retries on failure; no answer is left unmarked.
- Results are hidden from students until an E2Job reviewer clicks Publish. Before that, the reviewer sees all marks, flagged ones first, and can change any mark with a note.
- Acceptance:
  - [ ] Given 60 attempts submitted at the same time, then all written-answer marks from the AI are ready within about 30 minutes.
  - [ ] Multiple-choice answers are never sent to the AI.
  - [ ] Given an AI mark changed by a reviewer, then the student sees the reviewer's mark and the change is logged with who and when.
  - [ ] Given results not yet published, then the student sees "Result coming soon".

**R12. Student result view**
- Total score, score per section, 2 to 3 strengths and 2 to 3 things to improve. No correct answers, no other students' scores.

**R13. Training sessions and attendance**
- A session has title, date and time, Google Meet link, trainer, and audience (whole batch or one band). A schedule can be added from a sheet.
- Student dashboard shows the next session at the top; the Join button becomes active 15 minutes before start and opens the Meet link. Clicking Join records attendance. Past sessions are listed.
- Acceptance:
  - [ ] A Band 1 session is visible only to Band 1 students.
  - [ ] Join is disabled until 15 minutes before start and records attendance once per student per session.

**R14. University dashboard and reports**
- Student list with filters for band, verification status, test status (not started, submitted, auto-submitted, flagged) and attendance.
- Results summary: average per section and per band, top performers.
- Downloads: results sheet (Excel), batch summary (PDF), student scorecards (PDF), attendance (Excel).
- Acceptance: [ ] Every number in the downloaded Excel matches the dashboard for the same filters.

**R15. Access and privacy**
- University portal manager sees only their university. E2Job admins see all. Students see only themselves.
- Camera snapshots and recordings are not publicly reachable.
- The whole module can be switched off without affecting the E2Job job portal.

**R16. Reliability**
- 60 students taking the test at the same time without slowdown (the platform handled 100 simultaneous users in the 6 Oct load test).
- Existing E2Job features keep working; all existing automated tests still pass.

### P1: nice to have (fast follow)
- Webcam snapshot review screen with a gallery per student (if not in P0 for the demo).
- Re-open a single student's attempt by an admin, with a reason, for a proven technical fault.
- Extra time for a named student (accessibility).
- Reminder emails: assessment opens tomorrow, class starts in 1 hour.
- Attendance confirmation by duration instead of a Join click.
- Students can download their own scorecard PDF.

### P2: future considerations (design for, do not build)
- Several assessments per batch (baseline, mid, final) and progress between them.
- Section sets per specialization.
- Several universities and batches running at the same time.
- Moving the university portal to its own separately deployed frontend (the code is kept in one folder to allow this).
- Sign-in with Microsoft accounts for universities on Microsoft 365.
- Email sent from the university's own domain.
- Students moving on to the E2Job job portal with their verified profile.

## 6. Success metrics

**Leading (first assessment window)**
- Students who sign in at least once before the assessment opens: target 90%, stretch 100%.
- Students who complete the attempt without a support request: target 90%.
- Attempts recovered after a refresh or drop: 100%; lost attempts: 0.
- Reviewer changes to AI marks: target under 15% of written and speaking answers (quality of AI marking).
- Results published within 24 hours of the window closing: yes.

**Lagging (first month)**
- Training attendance per session: target 75% of the invited band.
- Reports downloaded by the university at least once per week.
- Tender outcome: tender won; second batch or second university added without new code per university.

## 7. Open questions

| # | Question | Who answers | Blocking? |
|---|---|---|---|
| Q2 | Assessment window: date, time, and how long it stays open | University | Before the real test |
| Q3 | How long is student data kept after the program ends? | Ram | Before the real test |
| Q4 | Speaking answers: marked by the E2Job team by listening (current default), or also by AI? | Ram | Before the real test |
| Q5 | Speaking test language: English only? | University | Before the question bank is final |
| Q6 | Results published within 24 hours, or on a date the university chooses? | University | No |
| Q7 | Google Workspace account for training classes over 60 minutes | Ram | Before training starts |
| Q8 | Who at the university is the portal manager, and do they need more than one login? | University | Before handover |
| Q9 | Does the university's IT team create the sub-domain, and by when? | University IT | Before going live on their address |

## 8. Timeline and dependencies

| Date | Milestone | Depends on |
|---|---|---|
| 18 to 19 Oct | Build P0 on a feature branch; question bank v1 | Sandip University logo in the repo (Ram) |
| 19 Oct evening | Demo online on an E2Job sub-address with 60 sample students | DNS record (Imran), merge and deploy (Vivek), AI key and file storage on the server |
| 20 Oct | Internal demo to Amit sir | |
| 21 Oct | Changes from feedback | |
| 22 or 23 Oct | Presentation to Sandip University | |
| After approval | Real student sheet, university sub-domain, final question bank, first assessment, training schedule | Open questions Q2 to Q9 |

Phasing if time runs short before the demo: R1 to R9, R10 including the camera check, R11 (multiple choice and written), R12 and R14 first; then the speaking review screen and training sessions.
