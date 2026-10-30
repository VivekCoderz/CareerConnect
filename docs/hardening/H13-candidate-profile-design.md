# H13 Design: one CandidateProfile model

Status: draft 3 (30 Oct 2026), for team review on Wed 4 Nov. No code changes in this task.
Builds: H18 (server, store and migration; Yug, Ram and Imran, see section 8), H22 (Sneha, client dashboard shell).

## 1. Summary

1. Replace `StudentProfile`, `FresherProfile` and `ProfessionalProfile` with one `CandidateProfile` collection (`candidateprofiles`), keyed by a unique `userId` and a `candidateType` of `student | fresher | professional`.
2. Fields the three types share (personal details, education, skills, projects, certifications, achievements, job preferences, resume, visibility, completion) become common fields; everything only one type has moves into a `student`, `fresher` or `professional` sub-object. Old field names are kept wherever they do not clash; one rename remains (section 4).
3. Every profile query today keys on `userId` (plus one on `resume.resumeUrl`), so the new model needs 3 indexes, not the 20 the old models declare.
4. API responses keep their current shape: a small adapter turns a CandidateProfile back into the old per-type shape, so `client/src` does not need the new shape for the 23 Nov release.
5. The 23 Nov release ships the new store in `legacy` mode. Migration and `unified` mode are proven on staging only; production flips the week after release, with 7 days of dual-write to the old collections so rollback is a flag change. Campus (`server/campus/`) does not read any profile model and is unaffected as long as `User` is left alone.

## 2. Today: field-by-field comparison

S = StudentProfile, F = FresherProfile, P = ProfessionalProfile. All three: `timestamps: true`, `userId` (ObjectId, ref User, required, unique), no hooks, virtuals or statics.

### 2.1 Top-level fields

| Field | Type | In | Required / default | Notes |
|---|---|---|---|---|
| userId | ObjectId | S F P | required, unique | the only key any query uses |
| dateOfBirth | Date | S F P | - | |
| gender | String enum | S F P | S: no `""`; F P: allow `""`, default `""` | values `male, female, other, prefer-not-to-say` |
| location.{city,state,country} | String | S F P | country default "India"; F P default `""` | P has no maxlength |
| bio | String | S F P | default `""` | max S 2000, F 600, P 1000 |
| professionalHeadline | String | F P | default `""` | max F 180, P 200 |
| socialLinks.{linkedin,github,portfolio} | String | F P | default `""` | S has none (User has its own `socialLinks`) |
| careerGoal | **String** in S F, **Object** in P | S F P | F default `""` | P: `{goal, targetRole, targetIndustry, targetLevel, timeline}`. Same name, different type. |
| careerObjective | String | F | default `""` | close in meaning to P `professionalSummary` |
| professionalSummary | String | P | default `""` | |
| targetRole / targetRoles / targetIndustry | String / [String] / String | F | `""` | same meaning as P `careerGoal.targetRole/targetIndustry` |
| primarySkills | [String] | F | - | |
| activelyLooking | Boolean | F | default true | similar to P `jobSearchStatus` |
| interests | [String] | S | - | |
| education[] | sub-doc | S F P | default [] | three different shapes, see 2.2 |
| technicalSkills / softSkills | [String] | S | - | same meaning as F P `skills.technical` / `skills.softSkills` |
| skills.{programmingLanguages, frameworks, databases, tools, softSkills, technical} | [{name, proficiency}] | F P | default [] | P adds `cloud, devOps, domain, management` and `yearsOfExperience`; P proficiency adds "Expert", default "Advanced" (F: "Intermediate") |
| projects[] | sub-doc | S F P | default [] | P uses `name` where S F use `title` |
| experience[] | sub-doc | S P | default [] | **S: internships/freelance/volunteer; P: full jobs.** Same name, different meaning. |
| internships[] | sub-doc | F | default [] | same meaning as S `experience` |
| certifications[] | sub-doc | S F P | default [] | S: `issuingOrganization` optional, default "Independent"; F P: required |
| achievements[] | sub-doc | S F P | default [] | S `proofUrl` = F P `achievementUrl`; F adds `category`, P adds `impact` |
| codingProfiles[] | sub-doc | F | default [] | |
| leadership[] / professionalDevelopment[] | sub-doc | P | default [] | |
| currentEmployment.{...13 fields} | Object | P | defaults `""`, currentlyWorking true | |
| totalExperienceYears / Months, experienceLevelCategory | Number / enum | P | 0 | computed in `getProfessionalProfile` |
| currentLevel / targetLevel | enum | P | - | |
| jobPreferences.preferredRoles | [String] | S F P | - | |
| jobPreferences.preferredLocations | [String] | S F | - | P calls it `jobPreferences.locations` |
| jobPreferences.jobTypes | enum lower-case | S | - | `full-time, part-time, internship, freelance`; F P call it `employmentTypes` with Title Case values |
| jobPreferences.employmentTypes | enum | F P | - | F and P enums differ |
| jobPreferences.workMode / workModes | [enum] | F / P | - | same meaning, different name; S has `remote: Boolean` instead |
| jobPreferences.industries | [String] | P | - | |
| jobPreferences.expectedSalary.{min,max,currency} | Number | F | 0, "INR (LPA)" | P has `compensation.expectedMin/MaxSalary` |
| availability.{status, expectedJoiningDate} | enum, Date | F P | - | status enums differ completely; F adds `currentEmploymentStatus`, P adds `noticePeriod` |
| workAuthorization.{...} | Object | F | relocate/remote default true | |
| compensation / relocation / recruiterPreferences | Object | P | `allowContact` default **false** (DPDP opt-in) | |
| jobSearchStatus | enum | P | "Open to Opportunities" | |
| resume.{resumeUrl, resumeName, uploadedAt} | String, Date | S F P | `""` | F P add `isGenerated` |
| profileVisibility | enum | F P | F "public"; P "recruiter-only" | S has none. P allows `recruiter-only`, F does not. |
| verificationStatus | enum | S F P | "unverified" | only S allows `rejected` |
| profileCompletion / isProfileComplete | Number 0-100 / Boolean | S F P | 0 / false | complete threshold: S 80, F 75, P 75 |
| jobReadinessScore / careerStrengthScore | Number 0-100 | F / P | 0 | |

### 2.2 Sub-document differences that matter

- **education**: S `{institution, degree (defaults "Institution"/"Degree"), fieldOfStudy, startYear, endYear, currentlyStudying, grade, description}`; F `{qualificationType, degree*, specialization, institution*, university, graduationYear, percentageOrCgpa, academicGrade, backlogs, academicAchievements, isHighest}`; P like F without university/academicGrade/backlogs/academicAchievements/isHighest, and its `qualificationType` enum has M.Tech/MBA but not 10th/12th. Same meaning, different names: S `fieldOfStudy` = F P `specialization`; S `endYear` ~ F P `graduationYear`; S `grade` ~ F P `percentageOrCgpa`.
- **projects**: S F `title*`, P `name*`; description required in F P, optional in S. F adds `projectType, keyFeatures, challenges, achievements`; P adds `organization, responsibilities, businessImpact`.
- **experience (S) vs internships (F)**: S `{organization, role (default "Intern"), experienceType, startDate, endDate, currentlyWorking, description, skillsUsed}`; F `{companyName*, role*, internshipType, ..., location, workMode, technologiesUsed, responsibilities, achievements, certificateUrl}`.

### 2.3 Indexes today

| Model | Indexes | Used by a query? |
|---|---|---|
| S | userId (unique, declared twice: `unique` + `index`), {location.city, location.state}, careerGoal, technicalSkills, resume.resumeUrl | userId, resume.resumeUrl only |
| F | userId, targetRole, jobPreferences.preferredRoles, jobPreferences.preferredLocations, location.city, profileVisibility, resume.resumeUrl | userId, resume.resumeUrl only |
| P | userId, currentEmployment.jobTitle, currentEmployment.company, careerGoal.targetRole, profileVisibility, jobSearchStatus, location.city, resume.resumeUrl | userId, resume.resumeUrl only |

Every `find/findOne/exists` in `server/controllers`, `services` and `utils` filters on `{ userId }` or `{ userId: { $in } }`, except `services/resumeAssetCleanup.js:24-26` (`resume.resumeUrl`).

## 3. Proposed CandidateProfile schema

Collection `candidateprofiles`, `timestamps: true`. Sub-document schemas take the union of the old fields; required-ness follows the loosest old model so no existing document fails validation on migration. Old field names are kept wherever two models do not use the same name for different things, so `toLegacyShape` (section 6) is mostly a move between top level and sub-object, not a rename. Where two old names mean the same thing (for example `specialization` and `fieldOfStudy`), both stay this sprint. Merging same-meaning pairs is follow-up work after the client moves to the new shape.

```js
{
  userId:        { ObjectId, ref: "User", required, unique },
  candidateType: { enum: ["student", "fresher", "professional"], required },

  // Common: personal
  dateOfBirth, gender /* enum incl. "" */, location: { city, state, country /* "India" */ },
  bio /* max 2000 */, professionalHeadline /* max 200 */,
  socialLinks: { linkedin, github, portfolio },

  // Common: career
  education:      [educationSchema],     // union of S + F + P fields, old names kept
  skills: {                               // F P shape: [{ name, proficiency?, yearsOfExperience? }]
    programmingLanguages, frameworks, databases, tools, cloud, devOps,
    domain, management, softSkills, technical,
  },
  projects:       [projectSchema],       // `title` (P `name` renamed, see section 4)
  certifications: [certificationSchema], // issuingOrganization optional
  achievements:   [achievementSchema],   // union: proofUrl (S), achievementUrl, category, impact
  jobPreferences: {                       // union, old names kept
    preferredRoles, preferredLocations /* S F */, locations /* P */, industries,
    jobTypes /* S, lower-case enum */, employmentTypes /* F P, union enum */,
    workMode /* F */, workModes /* P */, remote /* S */,
    expectedSalary: { min, max, currency },
  },
  resume: { resumeUrl, resumeName, uploadedAt, isGenerated },

  // Common: status
  profileVisibility:  { enum: ["public", "private", "recruiter-only"] }, // default per type, see 6
  verificationStatus: { enum: ["unverified", "pending", "verified", "rejected"] },
  profileCompletion, isProfileComplete,

  // Type-specific (only the matching one is set)
  student: {
    careerGoal /* String */, interests, technicalSkills, softSkills,
    experience: [studentExperienceSchema],
  },
  fresher: {
    careerGoal /* String */, careerObjective, targetRole, targetRoles, targetIndustry,
    primarySkills, activelyLooking,
    internships: [internshipSchema], codingProfiles: [codingProfileSchema],
    availability: { status, expectedJoiningDate, currentEmploymentStatus },
    workAuthorization: { status, willingToRelocate, willingToWorkRemote, preferredCountries },
    jobReadinessScore,
  },
  professional: {
    careerGoal: { goal, targetRole, targetIndustry, targetLevel, timeline },
    professionalSummary, careerSpecialization, currentLevel, targetLevel,
    currentEmployment: { ...13 fields as today }, experience: [workExperienceSchema],
    totalExperienceYears, totalExperienceMonths, experienceLevelCategory,
    leadership: [...], professionalDevelopment: [...],
    availability: { status, expectedJoiningDate, noticePeriod },
    compensation: { ... }, relocation: { ... },
    recruiterPreferences: { allowContact /* default false */, preferredContactMethod },
    jobSearchStatus, careerStrengthScore,
  },
}
```

Why some shared names live per type: `careerGoal` is a String in S F and an Object in P, `experience` means internships in S and jobs in P, and the F and P `availability.status` enums share no values. Putting each in its type's sub-object keeps the old name and type without a clash.

**Indexes** (only what a query uses; add more when a query needs them):

| Index | Why |
|---|---|
| `{ userId: 1 }` unique | every read and write |
| `{ candidateType: 1 }` | migration count checks, admin counts |
| `{ "resume.resumeUrl": 1 }` | `resumeAssetCleanup.isResumeUrlReferenced` |

Not carried over (no query uses them): S careerGoal/technicalSkills/city+state, F targetRole/preferredRoles/preferredLocations/city/profileVisibility, P jobTitle/company/targetRole/profileVisibility/jobSearchStatus/city. See Q5.

## 4. Field mapping

Field names are unchanged unless listed under "Renames". Every old field keeps its value; nothing is dropped.

**Moves into a type sub-object (name unchanged):**

| From | To |
|---|---|
| S `careerGoal`, `interests`, `technicalSkills`, `softSkills`, `experience` | `student.*` |
| F `careerGoal`, `careerObjective`, `targetRole`, `targetRoles`, `targetIndustry`, `primarySkills`, `activelyLooking`, `internships`, `codingProfiles`, `availability`, `workAuthorization`, `jobReadinessScore` | `fresher.*` |
| P `careerGoal`, `professionalSummary`, `careerSpecialization`, `currentLevel`, `targetLevel`, `currentEmployment`, `experience`, `totalExperience*`, `experienceLevelCategory`, `leadership`, `professionalDevelopment`, `availability`, `compensation`, `relocation`, `recruiterPreferences`, `jobSearchStatus`, `careerStrengthScore` | `professional.*` |
| Source collection | `candidateType` = student / fresher / professional (checked against `User.userType`) |

**Renames (one):**

| Old | New | Reason |
|---|---|---|
| P `projects[].name` | `projects[].title` | S and F already use `title` for the same required field; one name lets project readers and the resume builder stop branching on type. A Mongoose alias `name` is added only if a P reader still needs it (H18 checks `components/professional-profile/*` and `resumeController`). |

**Value changes during migration:**

| Field | Change | Reason |
|---|---|---|
| S `education[].institution` = "Institution", `degree` = "Degree" | cleared to `""` | schema placeholders, not user data (Q7); the report counts how many were cleared |
| S `profileVisibility` (missing) | set to `public` | matches today, where students appear in search (Q1) |

## 5. Migration plan (script written in H18-1)

`server/scripts/migrate-candidate-profiles.js`, run as `node scripts/migrate-candidate-profiles.js [--dry-run] [--limit N] [--user <id>]`.

1. Reads the three old collections in batches of 500 (cursor, no full load into memory). Never writes to them.
2. For each `userId`, loads the User and builds one CandidateProfile using section 4. Pure mapping function in `server/utils/candidateProfileMapping.js` so H18 can unit test it without a database.
3. **Idempotent by userId:** upsert with `{ userId }`. Each new doc stores `migratedFrom: { collection, sourceId, sourceUpdatedAt, migratedAt }`. On a re-run, a doc whose `sourceUpdatedAt` equals the source's `updatedAt` is skipped; a doc changed in the new collection after migration (its `updatedAt` > `migratedAt`) is never overwritten, only reported.
4. **Conflicts (one user, two or three old profiles):** the profile matching `User.userType` wins. If none matches, the most recently updated wins. The losers are copied as-is into `candidateprofile_conflicts` (`{ userId, collection, doc }`) and listed in the report; nothing is merged automatically. Ram owns the conflict list (Q9).
5. **Skipped and reported:** user not found (orphan profile); user `role` is not `user` or `userType` is `employer`/`admin`; mapped doc fails schema validation (with the error).
6. **Not created:** candidate users with no old profile (for example campus students, see 10). Profiles keep being created lazily, as the controllers do today.
7. **Counts check per type**, printed at the end and returned as a non-zero exit code if it fails:
   `old S + old F + old P = migrated + conflicts + skipped`, and for each type `old count - losers - skipped = new count with that candidateType`. The report also prints the number of placeholder education values cleared.
8. `--dry-run` runs steps 1-7 with no writes and prints the same report plus 3 sample mapped docs per type with personal fields masked.
9. Run order: staging copy of production before 23 Nov; production the week after release, during the 21:30-23:00 low-traffic window, after a fresh backup (`.github/workflows/mongodb-backup.yml`).

## 6. Rollout

1. **H18-1, no behaviour change.** Add `models/CandidateProfile.js`, the mapping util, the script, and `services/candidateProfileStore.js` with `get(userId)`, `upsert(userId, type, changes)`, `existsByResumeUrl(url)`, `deleteForUser(userId)`, and `toLegacyShape(doc)`. The store reads the env flag `CANDIDATE_PROFILE_SOURCE` = `legacy` (default) or `unified`. In `legacy` it uses the three old models, so all tests pass unchanged.
2. **One PR per area** (H18-2 to H18-8, section 8) switches its files from the old models to the store. Each PR keeps the response shape via `toLegacyShape`.
3. **Staging, before 23 Nov:** run the migration, set `CANDIDATE_PROFILE_SOURCE=unified`, run the full test suite against `unified` (CI matrix job) and click through the three dashboards, resume prefill and employer candidate search. Repeat once on a fresh staging copy to prove the script is re-runnable.
4. **Release, 23 Nov:** ships the store and all switched readers with `CANDIDATE_PROFILE_SOURCE=legacy` in production. Production behaviour is the same as before the sprint; no migration runs in production yet.
5. **Production flip, the week after release (week of 30 Nov):** fresh backup, run the migration, flip to `unified`. Dual-write starts (section 7).
6. **7 days after the flip:** if no rollback was needed, turn dual-write off. From then on the old collections are read-only (no code path writes to them).
7. **Later (not this sprint):** move the client to the new shape, remove `toLegacyShape`, delete the old models, drop the old collections after a final backup.

Profile visibility default for new docs: student `public` (Q1), fresher `public`, professional `recruiter-only`. Migrated docs keep their stored value.

## 7. Rollback (dual-write)

- **Before the flip (including release day):** nothing to roll back; production is in `legacy` mode and the old collections are the source.
- **For 7 days after the flip:** in `unified` mode the store writes to `candidateprofiles` first, then writes `toLegacyShape(doc)` into the old collection for that `candidateType` (upsert by `userId`; `deleteForUser` deletes from both). The old collections therefore stay current. A failed legacy write does not fail the user's request; it is logged with the `userId` and counted, and that count must be 0 before dual-write is turned off.
- **Rollback during those 7 days:** set `CANDIDATE_PROFILE_SOURCE=legacy` and restart. No script is needed; the old collections already hold every edit made after the flip. Fix any `userId` in the failed-write log by hand first.
- **Bad migration data found before or right after the flip:** stay on (or go back to) `legacy`, `deleteMany` on `candidateprofiles`, fix the mapping, re-run.
- **After the 7 days:** dual-write is off, so rollback means restoring from backup. The window to decide is those 7 days.

## 8. Affected files, grouped into PR-sized chunks

Server: 41 files reference the old models (`grep -rl` in `server/`, excluding `eslint-suppressions.json`). All server PRs are under H18.

| PR | Owner | Files | What changes |
|---|---|---|---|
| H18-1 | Yug | new: `models/CandidateProfile.js`, `utils/candidateProfileMapping.js`, `services/candidateProfileStore.js`, `scripts/migrate-candidate-profiles.js` + tests | foundation, flag defaults to `legacy`, dual-write; the store rejects a write whose `candidateType` differs from `User.userType` (campus never calls the store) |
| H18-2 | Yug | `controllers/studentController.js` (create, dashboard, get, update), `controllers/fresherController.js` (create, completion, get, update, dashboard, recommendations, public), `controllers/professionalController.js` (same set), `routes/studentRoutes.js`, `routes/fresherRoutes.js`, `routes/professionalRoutes.js` | own-profile read/write; completion thresholds (80/75/75) unchanged (Q4) |
| H18-3 | Yug | `controllers/authController.js` (`registerUser` 572-617, `completeGoogleOnboarding` 1905-1977) | profile creation on signup |
| H18-4 | Yug | `services/accountDeletion.js`, `services/resumeAssetCleanup.js`, `scripts/backup-resume-migration.js`, `scripts/verify-resume-privacy.js`, `scripts/migrate-public-resumes.js` | deletion and resume-file reference checks (privacy-critical, small PR) |
| H18-5 | Ram | `controllers/resumeController.js` (`syncPrimaryResumeWithProfile` 159, `syncProfileFromResume` 525, `getProfileForResume` 772, upload/parse/confirm 1144/1349/1589/1723, `tailorResumeHandler` 2263, live resume 3098/3225, `deleteResume` 437, `atsCheckHandler` 2743) | biggest file (3,344 lines); 9 inline type→model picks become one store call |
| H18-6 | Imran | `controllers/candidateController.js` (`searchCandidates`, `getCandidateById`, `extractProfileSkills`), `utils/eligibility.js`, `controllers/internshipController.js` (`getUserProfileFromReq`), plus the `candidateId` populates in `applicationController.js` 553/608/1569, `interviewController.js` 330/589, `offerController.js` 264 | read through the store; the skill readers keep handling both shapes; employer views get skills, education and experience from the profile instead of empty User fields. Same owner as H34 (same file) |
| H18-7 | Yug | `controllers/courseController.js` (345, 1137), `controllers/marketInsightsController.js`, `services/recommendationEngine.js` (357), `services/ragAiService.js` (44), `controllers/adminController.js` (unused imports only) | smaller readers; `recommendationEngine` stops creating a FresherProfile for every caller |
| H18-8 | Yug | `scripts/clean-fake-student-profiles.js`, `clean-fake-fresher-professional-profiles.js`, `migrate-allowcontact-false.js`, `migrate-problem-solving-technical.js`, `test-e2e-mvp.js`, `test-internship-job-separation.js`, `test-student-application-e2e.js` | mark legacy-only with a header comment; delete after 23 Nov (Q8) |

H18-6 and H34 both edit `candidateController.js`, so Imran owns both.

**Flip gate:** the production flip happens only after H18-2 to H18-8 are all merged. Any PR not merged by Tue 17 Nov moves to the week after release.

Tests that reference the models (each PR updates the ones for its area): `accountDeletion`, `cleanupScriptsRerun`, `fresherProfessionalProfileDefaults`, `highSecurity` (148-150), `mediumSecurity`, `migrateAllowContact`, `migrateProblemSolving`, `noInventedListingText`, `noMadeUpServerData`, `reviewFollowupsT04`, `studentProfileDefaults`.

**H22, Sneha (client):** one shared dashboard shell for the three candidate dashboards, built on today's API response shapes (which `toLegacyShape` keeps unchanged), so it does not depend on the H18 flip. Client files that read profile shapes, for H22 and the later client move:
- Services: `services/studentProfileService.js`, `studentDashboardService.js`, `fresherProfileService.js`, `fresherDashboardService.js`, `professionalProfileService.js`, `professionalDashboardService.js`, `candidateService.js`, `resumeService.js`, `learningService.js:81`.
- Pages: `pages/student/StudentProfile.jsx`, `StudentDashboard.jsx`, `InternshipDetail.jsx`; `pages/fresher/FresherProfile.jsx`, `FresherDashboard.jsx`, `CareerRecommendationsPage.jsx`; `pages/professional/ProfessionalProfile.jsx`, `ProfessionalDashboard.jsx`; `pages/employer/EmployerDashboard.jsx`; `pages/resume/ResumeBuilder.jsx`, `LiveResume.jsx`; `redux/features/resumeSlice.js`.
- Components: `components/student/*`, `components/student-dashboard/*`, `components/fresher-profile/*`, `components/professional-profile/*`, `components/employer/CandidateCard.jsx`.

## 9. Things found while reading (not fixed in H13)

- `/api/student/*` uses only `requireCandidate()`, so a fresher or professional can create and edit a StudentProfile; that is how a user ends up with two profiles. The store should reject a write whose type differs from `User.userType`.
- `services/recommendationEngine.js:360-363` creates a FresherProfile for any user who calls `/api/recommendations` (only `protect`), including students and professionals.
- `applicationController.js:553,608,1569`, `interviewController.js:330,589` and `offerController.js:264` populate `candidateId` with `skills education experience bio`, which are not User fields, so employers get them empty.
- `candidateController.searchCandidates` never checks `profileVisibility` or `recruiterPreferences.allowContact`; private and recruiter-only profiles appear in employer search. **Now task H34 (Imran)**, separate from H13/H18.
- `courseController.getEmployerAllApplications` (1137) reads StudentProfile only; freshers and professionals show empty profile data.

Assigned: store type check → H18-1; `recommendationEngine` creating profiles → H18-7; empty populates → H18-6; search privacy → H34.

**Known issues, after the sprint:** `resumeController.atsCheckHandler` (2743) is exported but not mounted; `client/src/services/studentProfileService.js` calls `DELETE /student/profile`, which has no route.

## 10. Campus portal (`origin/feature/campus-sandip`, not merged)

Read with `git show origin/feature/campus-sandip:<path>` at `328410c`. The branch adds `server/campus/` (models Institution, Batch, CampusMember, CampusAssessment, CampusAttempt, CampusSession, CampusGradingJob, CampusFile), mounted at `/api/campus` only when `ENABLE_CAMPUS=true`.

**What campus reads.** No file on the branch references `StudentProfile`, `FresherProfile`, `ProfessionalProfile` or their collections. Campus keeps its own student profile in `CampusMember.profile` (dob, gender, LinkedIn, 10th/12th/diploma marks, graduation, photo and resume file ids). From the shared `User` model it uses:
- `_id`, `email`, `fullName`, `role`, `userType`, `isActive`, `authVersion` (`middleware/bearer.js`, `controllers/authController.js`, `controllers/membersController.js`, `controllers/profileController.js:91`).
- On import it creates Users with `{ fullName, email, userType: "student", role: "user", isEmailVerified: true, hasPassword: false, authProviders: ["google"] }` (`membersController.userFor`, `scripts/seed-campus-demo.js:129`), and refuses an email whose User has `role !== "user"` or `userType` other than `student`.
- Its JWT is `{ id, av: authVersion }`, verified with `JWT_SECRET` from the `Authorization` header only.

**(a) What the migration must not change, so campus keeps working:**
1. No change to the `User` schema or data in H13/H18: no rename or removal of `_id, email, fullName, role, userType, isActive, authVersion, isEmailVerified, hasPassword, authProviders`, and the `userType` enum keeps `"student"`. Moving the profile-like copies on User (`resumeUrl, city, college, socialLinks, profileCompletion`...) is out of scope for this design.
2. The migration must not bump `authVersion` or touch any User document; that would sign out every campus student.
3. The migration must not create CandidateProfiles for users who have none. Imported campus students have `userType: "student"` and usually no StudentProfile; the count check (section 5) counts profiles, not users, so they do not show up as "missing".
4. The store's type check (section 9, first point) must not block campus users, since campus never calls the profile store.

**(b) Should a campus student later link to a CandidateProfile?** Possibly, but it is a later decision, not part of this sprint. Arguments for: one student, one profile when they move from the university portal to E2Job jobs. Against: campus portals are white-label and university-controlled; `CampusMember.profile` holds marks verified for one institution and must not leak into a public E2Job profile without the student's consent. If chosen later, the link should be an explicit, student-initiated copy (for example `CampusMember.profile` → `CandidateProfile.education`), never a shared document.

## 11. Open questions for the team

Numbers are kept from draft 1 so earlier references still match. Q2 (search privacy) moved to H34.

**Proposed, to confirm on 4 Nov:**
- **Q1.** Students have no `profileVisibility` today and do appear in employer search. Migrate them as `public` or `recruiter-only`? Proposed: **`public`** (keeps today's behaviour).
- **Q3.** Merge S `experience` and F `internships` into one list now, or keep them in `student`/`fresher` sub-objects? Proposed: **keep separate**.
- **Q4.** Completion thresholds differ (S 80, F 75, P 75). Keep per type, or one value? Proposed: **keep per type**.
- **Q5.** Drop the 14 unused indexes, or keep some for planned features? Proposed: **drop**; add an index when a query needs it.
- **Q6.** Professional has both `targetLevel` and `careerGoal.targetLevel`; both are kept as they are. Which one should the UI show? Proposed: **H18 checks client usage** and reports before H18-2.
- **Q7.** Student education rows with the placeholder values "Institution" / "Degree"? Proposed: **clear them during migration** and count them in the report.
- **Q8.** Old one-off scripts? Proposed: **mark legacy (H18-8), delete after 23 Nov**.
- **Q9.** Who owns the conflict list (users with two profiles)? Proposed: **Ram**.
- **Q10.** Production flip before or after the 23 Nov release? Proposed: **after release**, week of 30 Nov (section 6).
