# H30 Design: one Listing model for jobs and internships

Status: draft 1 (27 Nov 2026), owner Ram, reviewer Imran. Design only; nothing is built in this task.
Builds: H30-1 to H30-10 (section 10), after the sprint and after the H18 CandidateProfile flip.

## 1. Decision

1. Replace `Job` (`jobs`) and `Internship` (`internships`) with one `Listing` model in a new `listings` collection, with a required field `kind: "job" | "internship"`.
2. The field is called `kind`, not `type`. The code already uses "kind" for this (`checkListingKind(fields, "job")` in `server/utils/listingSecurity.js:53`), while `type` is already a response field the client reads with other values: the internship list sends `type: "Internship"` (`internshipController.js:395`), the job list sends `type: <employmentType>` (`jobController.js:274`), and `client/src/pages/OpportunitiesPage.jsx:982` checks `type === "internship"`. A stored `type` would leak into every response that spreads a raw document (`...int`) and change client behaviour.
3. The schema is flat: one shared field list, no `job` / `internship` sub-objects (unlike H13). The code shows why: internships already live in **both** collections. Employers can post an internship through `POST /api/jobs` with `employmentType: "Internship"`, and those Job documents use the "job-only" fields (`salaryRange` in the `compensationLabel` virtual, `interviewRounds`). So no Job field is really job-only. Old field names are all kept.
4. Every document keeps its original `_id`. Applications already store the listing id in **both** `jobId` and `internshipId` for new applications (`applicationController.js:193-194, 376-377`), so with the same `_id` every existing reference stays valid. `Application` gains one `listingId`; the old fields stay readable.
5. `/api/jobs`, `/api/internships` and `/api/opportunities` keep their URLs and response shapes. The client changes later (H30-10).
6. The build is gated by `LISTING_SOURCE=legacy|listing` (default `legacy`). The migration copies, never moves. For 14 days after the production flip, a reverse sync keeps `jobs` and `internships` current, so rollback is a flag change.
7. Campus (`origin/feature/campus-sandip`) reads none of these models and is not affected (section 9).

Alternative considered and rejected: move `internships` into the existing `jobs` collection (it already holds some internships). Fewer documents to copy, but the migration would write into the live `jobs` collection, so rollback would mean finding and removing documents instead of flipping a flag.

## 2. Today, and why merge

**Two collections, three places an internship can be.** An internship is an `Internship` document (posted via `/api/internships` or the external feed), or a `Job` with `employmentType: "Internship"` (posted via `/api/jobs`, `client/src/pages/employer/JobPostingFlow.jsx`). Every reader has to know this, and several do not:

| Code | What it does today |
|---|---|
| `internshipController.getInternships` (343-370) | 4 queries per request (`Internship.find`, `Job.find` with employmentType regex, 2 counts), each fetching up to `page x limit` docs (cap 5,000), merged and paged in memory |
| `internshipController.getInternshipCategories` (539-542) | 4 queries, same split |
| `jobScraperService.js` (296-297, 663-686) | separate `Job` and `Internship` queries, up to 500 docs each, merged in memory |
| `applicationController.applyToInternship` / `applyToJob` (92-96, 275-279) | look in one collection, then fall back to the other by the same id |
| `reportController.findListing` (20-30) | three lookups; comment: "Some internships are stored as jobs" |
| `recommendationEngine.js:416`, `professionalController.js:437` | `Job.find(openListingQuery())` with no employmentType filter, so Job-stored internships are recommended as jobs |
| `offerController.createOffer` (96) | `Job.findOne` only: an internship in `internships` cannot get an offer |
| `employerController.getPublicCompanyJobs` (622) | `Job` only: the public company page misses internships from `internships` |
| `jobController.getJobById` (316) | `Job` only, no fallback |
| `adminController.js` (2432, 2481, 2565, 2626, 2729, 2785, 2829) | `type === "internship" ? Internship : Job`, seven times |
| `listingExpiry.js:70-75`, `accountDeletion.js:68-77`, `employerVerificationController.js:28-33`, `externalJobSync.js:283, 301` | the same update run twice, once per model |

**Application has two ref fields.** `Application.jobId` (ref Job) and `internshipId` (ref Internship), plus `opportunityType: "Job" | "Internship"`, two partial unique indexes (`Application.js:334-348`) and a `pre("validate")` hook that requires the field matching `opportunityType`. New applications set both fields to the same id, so `populate("jobId")` returns null whenever the listing lives in `internships`, and callers patch over it with `app.jobId?.title || app.internshipId?.title` (`interviewController.js:135`, `applicationController.js:1400-1403`).

**Scale.** Under the ~5,000-student burst the internship list is the most expensive public endpoint: 4 queries and up to 10,000 docs in memory per deep page. One collection gives 2 queries (`find` with `skip/limit`, `countDocuments`) on one index.

**Size of the change.** 29 runtime files reference the models (`grep -rlE 'models/(Job|Internship)'` in `server/`, excluding tests and scripts), plus 6 models with refs, 27 integration test files and 16 scripts.

## 3. Field map: Job vs Internship -> Listing

Both: `timestamps: true`, `employerId` (ref EmployerProfile), `createdBy` (ref User), `companyId` (ref Company).

| Field | Job | Internship | Listing |
|---|---|---|---|
| kind | - | - | **new**, `"job" or "internship"`, required (rules in section 6) |
| employerId, createdBy, companyId | same | same | same |
| title | required, max 150 | required, max 150 | same (message "Title is required") |
| companyName, category, subCategory, department, location, city, state, country | same | same | same (`department` default "General", `country` default "India", no defaults for category/city) |
| employmentType | enum `Full-time, Part-time, Contract, Internship, Freelance, Trainee`, no default | **absent** | kept, same enum; set to `"Internship"` for docs from `internships` |
| workMode | enum `On-site, Hybrid, Remote` | same | same |
| isInternational, isPaid, hasJobOffer, isFeatured | Boolean | same | same |
| salaryRange `{min, max, currency, isNegotiable}` | yes | **absent** | kept, optional |
| stipend (String), duration (String) | yes ("Internship-specific" comment) | yes | kept |
| stipendAmount `{min, max, currency}` | **absent** | yes | kept, optional |
| experience `{minYears, maxYears, level}` | yes, enum on level | **absent** | kept, optional |
| education, eligibility, description (required), responsibilities, requiredSkills, preferredSkills | same | same | same |
| bonusSkills | yes | **absent** | kept |
| openings (min 1), deadline | same | same | same |
| status | enum `Draft, Pending Approval, Published, Paused, Closed, Rejected`, default Pending Approval | same | same |
| approvedBy/At, approvalMethod, closedReason, closedAt, rejectedBy/At, rejectionReason, adminNote | same enums | same | same |
| viewsCount, applicantsCount | same | same | same |
| source (enum incl. `CareerConnect`, `GU Drives`), isExternal, externalId, applyUrl, attribution, lastSyncedAt | same | same | same |
| interviewRounds | yes, **default one "Technical Interview" round** | **absent** | kept; migration writes `[]` explicitly for internship docs so the default is not invented for them (Q4) |
| recruitmentStages | same sub-schema | same | same |
| virtual `compensationLabel`, `toJSON/toObject` virtuals | yes | **no** | kept; it already handles `employmentType: "Internship"` |
| migratedFrom | - | - | **new**, `{ collection: "jobs" or "internships", migratedAt }`, set by the migration and by creates during the transition (section 7) |

Hooks, statics, methods: none on either model besides the virtual. Unknown keys in old documents (`internshipController.js:387-400` reads `applicationDeadline`, `skillsRequired`, `isExclusive`, which neither schema declares) are copied as they are; the dry run counts them (Q6).

## 4. Indexes

Today `Job` declares 15 single-field and 11 compound indexes, `Internship` 14 and 6: 46 indexes plus two `_id`. Many single-field ones (`isPaid`, `hasJobOffer`, `isFeatured`, `country`...) back no query a profile shows. On the free Atlas tier every index costs storage (512 MB cap) and write time, so `listings` gets 7 plus `_id`, each tied to a query:

| Index | Serves |
|---|---|
| `{ kind: 1, status: 1, createdAt: -1, _id: -1 }` | public job and internship lists, newest first, stable paging (`jobController.getJobs`, `getInternships`, feeds); other filters run on the narrowed set |
| `{ status: 1, deadline: 1 }` | expiry sweep (`listingExpiry.closeExpiredListings`) and the open-deadline filter |
| `{ createdBy: 1 }` | owner clause 1 of `listingOwnerClauses` (`employerOwnership.js:74`) |
| `{ employerId: 1, status: 1 }` | owner clause 2, employer dashboards |
| `{ companyId: 1, status: 1 }` | owner clause 3, company page, company filter |
| `{ source: 1, externalId: 1 }` unique, partial `{ externalId: { $type: "string" } }` | external feed upsert (`externalJobSync.upsertListing`) |
| text `{ title: 10, requiredSkills: 5, description: 1 }`, `default_language: "none"`, name `listing_text_search` | keyword search (today only jobs use `$text`; internships use regex) |

The two old partial filters differ (`isExternal: true` on Job, `externalId: { $type: "string" }` on Internship); the Internship one is kept because it is the safer of the two. The same `(source, externalId)` can exist in both old collections today if the feed reclassified an item (`externalJobSync.js:250` picks the model per item); the migration reports those (section 6, step 5). Indexes are built by the migration script before the flip, not by `autoIndex` at boot. `{ category, status }` and `{ city, status }` are dropped; they come back only if `explain()` on staging shows a slow plan (Q5).

## 5. References

| Model | Field(s) today | Change |
|---|---|---|
| `Application` | `jobId` (ref Job), `internshipId` (ref Internship), `opportunityType` | **add `listingId`** (ref Listing, indexed). Migration backfills it: `jobId` for `opportunityType: "Job"`, else `internshipId || jobId`. New unique index `{ candidateId: 1, listingId: 1 }`, partial `{ listingId: { $type: "objectId" } }`, built after the backfill. `jobId`, `internshipId`, `opportunityType`, the two old unique indexes and the validate hook stay, and new applications keep writing both old fields, so `legacy` mode can still read them. `{ listingId: 1, status: 1 }` replaces the two per-field status indexes after cleanup (H30-9). |
| `Interview` | `jobId`, `internshipId` | names unchanged; ref resolves to Listing in `listing` mode |
| `JobOffer` | `jobId` (ref Job, required) | name unchanged (rename is not worth a data change); ref resolves to Listing, so internships can get offers |
| `Assessment`, `AssessmentSubmission` | `jobId` | ref resolves to Listing |
| `Resume` | `targetJobId`, `targetInternshipId`, `opportunityType` | refs resolve to Listing |
| `Report` | `opportunityId` with `refPath: "opportunityModel"` (`Job` / `Internship`) | `opportunityId` uses the Listing ref in `listing` mode; `opportunityModel` stays as a label |
| `Notification` | `category: "job" or "internship"`, `relatedId` (String) | no change; values are the same ids |
| `AuditLog` | `module` enum incl. `Jobs`, `Internships`, `Opportunities` | no change (campus adds `Campus` to this enum, section 9) |
| Saved jobs | not stored: `POST /api/student/save` returns 501 (`studentController.js:656`), client flag `savedJobs` off (`client/src/config/features.js:9`) | when built, store one `listingId` from the start |

"Ref resolves to Listing" is one helper, `listingRef("Job")`, used as a Mongoose `ref` function: it returns `"Listing"` when `LISTING_SOURCE=listing`, else the old model name. Behaviour change to test: with Listing, `populate("jobId")` on an internship application returns the listing instead of null. Code that treats "jobId populated" as "this is a job" (for example `applicationController.js:487, 640`, which add default recruitment stages, and `interviewController.js:375`, which reads `interviewRounds`) must use `opportunityType` or `kind` instead. H30-4 lists each place.

## 6. API compatibility and kind rules

All routes stay where they are (`server/app.js:172, 174, 191`):

| Endpoint | `listing` mode |
|---|---|
| `GET /api/jobs` | `Listing.find({ kind: "job", ... })`; `?type=internship` (today a regex on employmentType, `jobController.js:147-161`) becomes `kind: "internship"` |
| `GET /api/jobs/:id`, `GET /api/internships/:id`, `GET /api/opportunities/:id` | `Listing.findById`, any kind (fixes `getJobById` having no fallback) |
| `GET /api/internships` (+ `/live`, `/latest`, `/paid`, `/in/:city`, `/category/:category`...) | one `Listing.find({ kind: "internship", ... })` + one count, paged in the database; same item mapping |
| `GET /api/internships/categories` | one aggregate on `kind: "internship"` |
| `GET /api/opportunities` | one query, both kinds |
| `POST /api/jobs` | `kind = employmentType === "Internship" ? "internship" : "job"` |
| `POST /api/internships` | `kind: "internship"`, `employmentType: "Internship"` |
| admin `createOpportunityForEmployer` (body `type: "job" or "internship"`) | `kind` from the body `type` |
| `PUT`, `PATCH /:id/status`, `DELETE`, `POST /:id/duplicate` | `Listing` by `_id` + owner clause, same checks; a `PUT /api/jobs/:id` that changes employmentType to or from `Internship` updates `kind` |
| external sync | `upsertListing` sets `kind` in `$set`, so a reclassified feed item moves kind instead of being duplicated |
| `GET /sitemap.xml` | one query; `/jobs/:id` for `kind: "job"`, `/internships/:id` for `kind: "internship"` |

One behaviour change: a Job-stored internship moves in the sitemap from `/jobs/:id` to `/internships/:id`. Its page works at both URLs (the detail endpoints accept any kind), so old links keep working.

Responses: lists keep their hand-built items (`_id`, `id`, `jobId`, `type`, `opportunityType`...). Detail and owner endpoints that send the document drop `kind` and `migratedFrom` (added to `INTERNAL_LISTING_FIELDS` in `listingSecurity.js`). Non-lean internship documents gain the virtual `compensationLabel` and empty `salaryRange`/`experience` defaults; this is additive and `publicListingFields.test.js` must still pass. `utils/listingSecurity.enumOf("Job" | "Internship", path)` reads enums from the Listing schema.

## 7. Migration (script written in H30-1)

`server/scripts/migrate-listings.js`, run as `node scripts/migrate-listings.js [--dry-run] [--limit N] [--reverse]`.

1. Reads `jobs` then `internships` with a cursor in batches of 500 using the native driver (`.collection`), so unknown keys are copied too. Never writes to them.
2. Mapping is a pure function in `server/utils/listingMapping.js` (unit tested without a database): from `jobs`, `kind` = `"internship"` if `employmentType` matches `/^internship$/i`, else `"job"`; from `internships`, `kind: "internship"`, `employmentType: "Internship"`, `interviewRounds: []`. Sets `migratedFrom`. **`_id` is kept.**
3. **Idempotent:** `bulkWrite` of `replaceOne({ _id }, doc, { upsert: true })`. A listing whose `updatedAt` is newer than its `migratedFrom.migratedAt` (edited after the flip) is never overwritten, only reported.
4. **_id collision check:** an `_id` found in both old collections is not migrated; both are written to `listing_conflicts` and listed. Expected count 0.
5. **External duplicates:** the same `(source, externalId)` in both collections: keep the one with the newer `lastSyncedAt`, copy the other into `listing_conflicts`. The next sync fixes it either way.
6. **Applications:** backfill `listingId` with `updateMany` per batch (only where `listingId` is missing). Report applications whose id is in neither collection (orphans) and pairs with the same `(candidateId, listingId)`; the new unique index is built only when that count is 0.
7. **Indexes:** creates the 7 Listing indexes and the Application `listingId` indexes.
8. **Counts check** (non-zero exit if it fails): `jobs + internships = listings + conflicts`; per kind, `jobs (non-internship) = kind job`, `internships + jobs (employmentType Internship) = kind internship`; applications with `listingId` = applications whose id exists in `listings`. Also prints unknown keys found and collection sizes (`collStats`) so we know the copy fits under 512 MB.
9. `--dry-run` runs 1-8 with no writes and prints the report plus 3 sample mapped docs per kind.
10. `--reverse` (rollback and the transition window, section 8): for every listing, `replaceOne` into `migratedFrom.collection` (new listings: `internships` if created through `/api/internships`, else `jobs`, recorded at create time), with `kind` and `migratedFrom` removed; deletes legacy docs whose `_id` is no longer in `listings`. The collections are small enough (thousands of docs) that a full pass is simpler and safer than tracking changes, and it also catches `$inc` updates that do not touch `updatedAt`.
11. Run order: staging (refreshed copy, `staging-refresh.yml`) twice to prove re-runs; production in the 21:30-23:00 low-traffic window after a fresh backup (`mongodb-backup.yml`), never during a student burst.

## 8. Rollout and rollback

1. **H30-1, no behaviour change.** Listing model, mapping, script, `listingRef`, and `services/listingSource.js` (`LISTING_SOURCE`, default `legacy`; returns the model(s) to use). In `legacy` every path uses `Job`/`Internship` exactly as today.
2. **One PR per area** (H30-2 to H30-6) switches its files behind the flag. Each PR passes the existing tests in both modes (CI matrix job, H30-7).
3. **Staging:** migrate, set `LISTING_SOURCE=listing`, run the suite, click through: job and internship discovery, detail pages, apply to both kinds, employer post/edit/close/delete, ATS, interviews, offers on an internship, admin approve/reject, reports, sitemap, external sync run. Load-test `/api/internships` before and after.
4. **Production flip:** backup, migrate, flip to `listing`, restart. Start the transition window.
5. **Transition window, 14 days:** "dual-write" is done as a scheduled reverse sync, not by writing twice in every handler. Listing writes are spread over 29 files and include `updateMany` and `deleteMany` (expiry sweep, account deletion, employer rejection, feed prune), where per-write mirroring would be easy to miss. Instead `migrate-listings.js --reverse` runs every 30 minutes (same pattern as the feed sync timer, `externalJobSync.js:402`), and new applications keep writing `jobId`/`internshipId`. `jobs` and `internships` are therefore at most 30 minutes behind. A failed run is logged and alerts through the existing monitoring (`docs/monitoring.md`).
6. **Rollback during the window:** run `--reverse` once by hand, set `LISTING_SOURCE=legacy`, restart. Applications made after the flip already carry `jobId`/`internshipId`. `listingId` is ignored in `legacy`.
7. **Bad data found right after the flip:** go back to `legacy`, drop `listings`, fix the mapping, re-run.
8. **After 14 days with no rollback:** stop the reverse sync; from then on rollback means a backup restore. Cleanup (H30-9) follows.

## 9. Campus portal (`origin/feature/campus-sandip`, not merged)

Read at `0535e62` with `git grep -n -E "Job|Internship" origin/feature/campus-sandip -- server/` and `git diff --stat origin/hardening...origin/feature/campus-sandip`.

**What campus reads.** Nothing in `server/campus/` references `Job`, `Internship`, `Application`, `JobOffer`, `Interview`, `/api/jobs`, `/api/internships` or `/api/opportunities`. The only `Job` matches are `CampusGradingJob` (AI marking queue), comments, and "E2Job" in admin names. Campus models are `Institution`, `Batch`, `CampusMember`, `CampusAssessment`, `CampusAttempt`, `CampusSession`/`CampusAttendance`, `CampusGradingJob`, `CampusFile`; none is called `Listing`. Outside `server/campus/` the branch changes only `server/app.js` (mounts `/api/campus` when `ENABLE_CAMPUS=true`, after `/api/support-tickets`), `server/server.js` (starts campus workers right after the listing expiry timer and the feed sync schedule), and `server/models/AuditLog.js` (adds `Campus` to the `module` enum).

**What H30 must not do, so campus keeps working and merges cleanly:**
1. Do not change `AuditLog.module` values or the `User` model.
2. Do not edit the lines in `server/app.js` around the `/api/campus` mount or in `server/server.js` around the expiry timer and `startExternalJobSyncSchedule()`. The reverse-sync timer goes inside `externalJobSync.js` or a new service, started from its own line.
3. Do not register a model or collection named like a campus one, and do not add a global Mongoose plugin or `autoIndex` change that would touch campus models.
4. The migration touches only `jobs`, `internships`, `listings`, `listing_conflicts` and `applications`; it must not run `syncIndexes()` on all models.
5. Campus portals are white-label and never show E2Job listings, so no Listing data is exposed there. If campus later wants placement listings for one university, that is a new design (a `campusInstitutionId` on Listing is the likely shape), not part of H30.

## 10. Follow-up tasks

Sizes: S under 1 day, M 1-3 days, L 3-5 days. All owners TBD. **Order:** H30 build starts only after H18 (CandidateProfile) is merged and its 7-day dual-write window has ended. H18-2, H18-5, H18-6 and H18-7 edit the same controllers (`applicationController`, `internshipController`, `interviewController`, `offerController`, `recommendationEngine`, `resumeController`...), and two data migrations should not be in flight in production at the same time.

| Task | Size | Owner | Depends on | Scope |
|---|---|---|---|---|
| H30-1 Foundation | L | TBD | H18 flip window over | `models/Listing.js`, `utils/listingMapping.js` + unit tests, `services/listingSource.js`, `listingRef` on the 6 referencing models, `scripts/migrate-listings.js` (`--dry-run`, `--reverse`), Application `listingId` field; flag defaults to `legacy` |
| H30-2 Public read paths | M | TBD | H30-1 | `jobController.getJobs/getJobById`, `internshipController.getInternships/getInternshipCategories/getInternshipById`, `opportunityController`, `jobScraperService` (DB part), `sitemapController`, `listingSecurity` |
| H30-3 Write paths | L | TBD | H30-1 | create/update/status/duplicate/delete in `jobController`, `internshipController`; `adminController` (7 model picks, dashboard, opportunities, search, companies); `externalJobSync` (upsert sets `kind`, close, prune); `resumeController.js:2188` |
| H30-4 Applications and refs | L | TBD | H30-1, H18-6 | `applicationController` (apply, duplicate check, lists, export), `listingClosure`, `interviewController`, `offerController`, `assessmentController`, `candidateController`, `reportController`; every "jobId populated means job" check (section 5) |
| H30-5 Employer and lifecycle | M | TBD | H30-1 | `employerController`, `employerDashboardService`, `employerAnalyticsController`, `employerVerificationController`, `utils/employerOwnership`, `utils/listingExpiry`, `services/accountDeletion`, `services/accountNotifications` |
| H30-6 Recommendations and dashboards | M | TBD | H30-1, H18-2, H18-7 | `recommendationEngine`, `fresherJobMatch`, `ragAiService`, `studentController`, `fresherController`, `professionalController` (also fixes internships recommended as jobs) |
| H30-7 Tests and CI | M | TBD | H30-1 | CI matrix job with `LISTING_SOURCE=listing`; update the 27 integration tests that load the models; migration re-run test; mark the 16 scripts in `server/scripts/` that load the models as legacy-only |
| H30-8 Staging run and production flip | S | TBD | H30-2 to H30-7 merged | two staging runs, load test of `/api/internships`, production backup + migrate + flip, 14-day window with reverse sync |
| H30-9 Cleanup | S | TBD | H30-8 + 14 days | remove `legacy` branches, `Job`/`Internship` models and `listingRef`; final backup, drop `jobs`/`internships`; swap the two Application per-field indexes for `{ listingId, status }` |
| H30-10 Client move (later) | M | TBD | H30-9 | client reads `listingId`/`kind` instead of `jobId`/`internshipId`/`opportunityType` (35 files under `client/src` read those, tests included); then the old Application fields can go |

## 11. Things found while reading (not fixed in H30)

- `offerController.createOffer` (96) and `exportOfferPdf` (280) look only in `Job`: an internship posted through `/api/internships` cannot get an offer. Fixed by H30-4; if needed sooner, a 2-line fallback.
- `recommendationEngine.js:416` and `professionalController.js:437` recommend Job-stored internships as jobs (no employmentType filter, unlike `fresherController.js:466`).
- `employerController.getPublicCompanyJobs` (622) shows only `Job` listings on the public company page.
- `internshipController.getInternships` loads up to 5,000 docs from each collection per request for deep pages; worth a cap or cache before the next student burst, independent of H30.

## 12. Open questions, with proposed answers

- **Q1.** Field name `kind` or `type`? Proposed: **`kind`** (section 1, point 2).
- **Q2.** Sub-objects for type-specific fields, as in H13? Proposed: **no**, flat schema; Job-stored internships already use the "job-only" fields.
- **Q3.** Unify pay into one field (`salaryRange` vs `stipendAmount` vs `stipend` string)? Proposed: **not in H30**; keep all three, decide with the client move (H30-10).
- **Q4.** Keep the default "Technical Interview" round on new jobs? It is text the employer never chose, close to what `noInventedListingText.test.js` guards against. Proposed: **keep it for jobs in H30** (no behaviour change), write `[]` for internships; raise removal as its own small task.
- **Q5.** Drop the old indexes that section 4 does not carry over (most single-field ones, `{ category, status }`, `{ city, status }`, `{ requiredSkills }`...)? Proposed: **yes**; add one back only when a staging `explain()` shows a collection scan on a real query.
- **Q6.** Unknown keys found in old docs (`applicationDeadline`, `skillsRequired`, `isExclusive`)? Proposed: **copy them as they are**, count them in the dry run, decide after seeing the numbers.
- **Q7.** Who owns `listing_conflicts` (id collisions and external duplicates)? Proposed: **Ram**.
- **Q8.** Length of the transition window? Proposed: **14 days** (listings change more slowly than profiles; two weekly employer cycles), reverse sync every 30 minutes.
- **Q9.** Add `/api/listings` now? Proposed: **no**; only with the client move (H30-10), so this work stays server-only.
- **Q10.** Start date? Proposed: **after the H18 flip window ends**, not before the week of 14 Dec 2026, and not in a week with a planned student burst.
