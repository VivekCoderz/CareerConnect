# Candidate profile migration

Student, fresher and professional profiles move from three collections
(`studentprofiles`, `fresherprofiles`, `professionalprofiles`) into one, `candidateprofiles`,
with one document per user. Design: H13 (`docs/hardening/H13-candidate-profile-design.md` on
`ram/h13-profile-design`).

## What changed in the code

- `server/models/CandidateProfile.js` is the new model: `userId` (unique), `candidateType`
  (`student | fresher | professional`), `migratedFrom`, timestamps. Indexes: `userId`,
  `candidateType`, `resume.resumeUrl` (the 20 old per-type indexes had no query using them).
- `StudentProfile`, `FresherProfile` and `ProfessionalProfile` are now Mongoose discriminators
  of `CandidateProfile`. Each keeps its own schema, so fields whose type differs by
  candidate type (`careerGoal`, `experience`, `availability`, ...) keep their names and shapes,
  and every controller reads and writes `candidateprofiles` through the same calls as before.
  API responses keep their shape and gain one field, `candidateType`.
- One profile per user is enforced by the unique `userId` index. Two paths used to create a
  second profile of another type, and no longer do:
  - `/api/student/profile`, `/me` and `/dashboard` now require `userType: student`, like the
    fresher and professional routes already did. The `/api/student/courses` routes stay open
    to every candidate.
  - `/api/recommendations` creates a FresherProfile only for freshers; others are scored
    against an unsaved one, as the H13 design asked.
- When a user's `userType` changes (`/select-role`, Google onboarding) and a profile of the
  new type is created, their old-type profile is moved to `candidateprofile_archive`
  (`reason: "type-changed"`). Before, it stayed in its old collection, unread.
- `scripts/backup-resume-migration.js`, `migrate-public-resumes.js` and
  `verify-resume-privacy.js` read `candidateprofiles` instead of the three old collections.

## The script

```
cd server
node scripts/migrate-candidate-profiles.js --dry-run     # report only, writes nothing
node scripts/migrate-candidate-profiles.js               # copy, then check the counts
node scripts/migrate-candidate-profiles.js --limit 100   # first 100 users only
node scripts/migrate-candidate-profiles.js --user <id>   # one user (repeatable)
```

It uses `MONGO_URI` (or `MONGODB_URI`) from `server/.env` and prints the database name first.

- **Reads the old collections only.** It never writes, updates or deletes in them.
- Copies each profile unchanged (same `_id`, fields and timestamps) and adds `candidateType`
  and `migratedFrom { collection, sourceId, sourceUpdatedAt, migratedAt }`.
- **User with profiles in more than one old collection:** the one matching `User.userType` is
  copied (else the most recently updated); the others are copied to
  `candidateprofile_archive` with `reason: "migration-conflict"` and listed.
- **Skipped and listed:** profiles whose user doesn't exist, and profiles of users who aren't
  candidates (`role` not `user`, or `userType` employer/admin).
- **Listed, still copied:** profiles whose type differs from `User.userType`, and profiles
  that fail today's schema validation (the app reads them today without validating, so
  skipping them would hide the profile).
- **Re-runnable.** A profile already copied from the same source version is skipped. A
  profile changed in `candidateprofiles` after it was copied is never overwritten (counted as
  "newer in new collection"). An old profile changed since the last run is copied again.
- **Counts check** (exit code 1 if it fails):
  - every old profile is counted exactly once:
    `old = copied + already copied + newer + conflicts + skipped`;
  - per type: `old - conflicts - skipped = expected`;
  - after a real run, `candidateprofiles` holds a document of that type for every expected user.
- Users with no old profile (for example campus students) get none; profiles are still
  created on first use, as before. The script doesn't touch `User` documents.

## Staging (before release)

1. Refresh staging from a scrubbed production copy (H02).
2. `node scripts/migrate-candidate-profiles.js --dry-run`. Check: "Counts check: OK", every
   old profile counted once, and read the conflict / skipped / type-mismatch / validation lists.
3. Run it for real, then run it again: the second run must show everything as "already copied".
4. Deploy this branch to staging and run the candidate flows: sign-up for each type, the three
   profile pages and dashboards, resume upload and prefill, apply, employer candidate search
   and candidate detail, admin users.

## Production

The new code reads only `candidateprofiles`, so the copy has to be there when it starts:

1. Take a fresh backup (`.github/workflows/mongodb-backup.yml`).
2. Run `--dry-run`, then the real run, in the low-traffic window.
3. Deploy.
4. Run the script once more right after the deploy. It copies any profile edited in the old
   collections between step 2 and the deploy, and leaves anything already edited in the new
   collection alone.

## Old collections: read-only until after release

After the deploy no code path reads or writes `studentprofiles`, `fresherprofiles` or
`professionalprofiles`. Keep them as they are until after release, as the rollback copy. Drop
them only after a final backup, in a separate change.

## Rollback

Redeploy the previous version: it reads the old collections, which the migration never
changed. Edits candidates made after the deploy are in `candidateprofiles` only and would
need copying back by hand (by `userId`), so decide early.
