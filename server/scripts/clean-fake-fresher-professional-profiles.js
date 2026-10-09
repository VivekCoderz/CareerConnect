/**
 * Clear sample data that fresherController / professionalController used to put into
 * auto-created profiles (T04, sibling of clean-fake-student-profiles.js).
 *
 * Before this fix, opening the fresher or professional dashboard or profile without a
 * profile created one filled with sample data: an invented B.Tech with 8.2 CGPA, skills
 * and salary expectations for freshers; an invented employer, job history, ~25 skills,
 * a 24 LPA salary and a 30-day notice period for professionals. The schemas also stored
 * invented defaults (e.g. "Senior", "30 Days", "Immediately Available").
 *
 * A profile is cleared only when it still holds exactly one of those sample sets and
 * nothing else: every other field is empty, the schema default, or one of the old
 * invented defaults. Judged from content, not timestamps. Near-matches are listed as
 * skipped. Clearing resets those fields to today's (empty) defaults; resume, scores,
 * visibility status and timestamps are not touched.
 *
 * It also clears the placeholders signup used to save for a professional who left their
 * employment blank: company "Industry", job title "Working Professional" and industry
 * "Information Technology". Each is cleared only where the stored value is exactly that
 * text; nothing else on the profile changes. "Information Technology" is a real industry
 * people choose, so it is only cleared on a profile that also still has the placeholder
 * company or job title.
 *
 * Safe to re-run. Every decision is made from one read before anything is written, and
 * each profile the script decides about gets a marker (see lib/cleanupMarkers.js):
 * sampleDataCleanedAt where it cleared something, sampleDataLeftAloneAt where it found
 * sample data with other edits. Profiles with either marker are never looked at again,
 * so a value the script itself cleared can't later make a profile look like sample data.
 * A profile whose allowContact was switched by migrate-allowcontact-false is left alone
 * too: that value came from a script, not from the sample data or the user.
 *
 * Usage (from server/):
 *   node scripts/clean-fake-fresher-professional-profiles.js           # dry run: lists matches
 *   node scripts/clean-fake-fresher-professional-profiles.js --apply   # clear the sample fields
 */
require("dotenv").config();
const mongoose = require("mongoose");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");
const {
  SAMPLE_DATA_CLEANED,
  ALLOW_CONTACT_MIGRATED,
  NOT_YET_DECIDED,
  markLeftAlone,
} = require("./lib/cleanupMarkers");

// The sample data used `new Date(y, m, d)`, so the stored instant depends on the server's
// time zone. Accept that calendar date in UTC or IST.
const localDate = (year, month, day) => ({ $localDate: [year, month, day] });
const dateMatches = (actual, [year, month, day]) => {
  if (!(actual instanceof Date)) return false;
  return [0, 330].some((offsetMinutes) => {
    const d = new Date(actual.getTime() + offsetMinutes * 60000);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day;
  });
};

const skill = (name, proficiency, yearsOfExperience) =>
  yearsOfExperience === undefined ? { name, proficiency } : { name, proficiency, yearsOfExperience };

const FRESHER_SAMPLE_SETS = [
  {
    source: "fresher profile",
    fields: {
      professionalHeadline: "Software Engineering Graduate | Seeking Entry-Level Opportunities",
      targetRole: "Full Stack Developer",
      targetIndustry: "Information Technology",
      careerObjective:
        "Passionate graduate seeking an entry-level software engineering role where I can apply my problem-solving abilities and full-stack development skills.",
      education: [{
        qualificationType: "B.Tech",
        degree: "B.Tech Computer Science & Engineering",
        institution: "University / Institute of Technology",
        university: "State Technical University",
        graduationYear: 2024,
        percentageOrCgpa: "8.2 CGPA",
        isHighest: true,
      }],
      "skills.programmingLanguages": [skill("JavaScript", "Intermediate"), skill("Python", "Intermediate")],
      "skills.frameworks": [skill("React", "Intermediate"), skill("Node.js", "Intermediate"), skill("Express", "Intermediate")],
      "skills.databases": [skill("MongoDB", "Intermediate")],
      "skills.tools": [skill("Git", "Intermediate"), skill("Postman", "Beginner")],
      "skills.softSkills": [skill("Problem Solving", "Advanced"), skill("Teamwork", "Advanced"), skill("Communication", "Intermediate")],
      "jobPreferences.preferredRoles": ["Full Stack Developer", "Frontend Developer", "Junior Software Engineer"],
      "jobPreferences.employmentTypes": ["Full-time", "Internship", "Graduate Trainee"],
      "jobPreferences.preferredLocations": ["Bangalore", "Hyderabad", "Pune", "Remote"],
      "jobPreferences.workMode": ["Hybrid", "Remote", "On-site"],
      "jobPreferences.expectedSalary.min": 4.5,
      "jobPreferences.expectedSalary.max": 8.5,
      "availability.status": "Immediately Available",
      "availability.currentEmploymentStatus": "Looking for Job",
    },
  },
  {
    source: "fresher dashboard",
    fields: {
      professionalHeadline: "Software Engineering Graduate",
      targetRole: "Full Stack Developer",
      education: [{
        qualificationType: "B.Tech",
        degree: "B.Tech Computer Science",
        institution: "University / College",
        graduationYear: 2024,
        isHighest: true,
      }],
      "skills.programmingLanguages": [skill("JavaScript", "Intermediate")],
      "skills.frameworks": [skill("React", "Intermediate")],
      "skills.databases": [skill("MongoDB", "Intermediate")],
      "skills.tools": [skill("Git", "Intermediate")],
      "skills.softSkills": [skill("Problem Solving", "Intermediate")],
    },
  },
];

const PROFESSIONAL_SAMPLE_SETS = [
  {
    source: "professional profile",
    fields: {
      professionalHeadline: "Senior Full Stack Developer | Distributed Cloud & Web Architecture",
      professionalSummary:
        "Experienced Software Engineer with 4+ years of expertise designing and delivering high-concurrency microservices, scalable frontend systems, and resilient cloud architectures.",
      careerSpecialization: "Full Stack & Distributed Systems",
      currentLevel: "Senior",
      targetLevel: "Lead / Staff",
      "currentEmployment.company": "Enterprise Cloud Systems",
      "currentEmployment.jobTitle": "Senior Software Engineer",
      "currentEmployment.department": "Platform Engineering",
      "currentEmployment.employmentType": "Full-time",
      "currentEmployment.industry": "Information Technology",
      "currentEmployment.location": "Bangalore",
      "currentEmployment.workMode": "Hybrid",
      "currentEmployment.joiningDate": localDate(2022, 5, 1),
      "currentEmployment.currentlyWorking": true,
      "currentEmployment.description": "Architecting customer-facing APIs and leading microservices migration.",
      "currentEmployment.responsibilities":
        "Leading backend sprint planning, system architecture reviews, and mentoring junior engineers.",
      experience: [
        {
          companyName: "Enterprise Cloud Systems",
          jobTitle: "Senior Software Engineer",
          department: "Platform Engineering",
          employmentType: "Full-time",
          location: "Bangalore",
          workMode: "Hybrid",
          startDate: localDate(2022, 5, 1),
          currentlyWorking: true,
          description: "Led development of core billing and authentication microservices.",
          responsibilities: "Designed REST/GraphQL APIs, reduced server response latency by 35%.",
          achievements: "Spearheaded AWS ECS migration saving $20K monthly cloud costs.",
          technologiesUsed: ["Node.js", "React", "MongoDB", "AWS", "Docker", "Redis"],
          teamSize: 6,
          managerialRole: true,
        },
        {
          companyName: "InnovateX Solutions",
          jobTitle: "Software Engineer",
          department: "Engineering",
          employmentType: "Full-time",
          location: "Pune",
          workMode: "On-site",
          startDate: localDate(2020, 6, 1),
          endDate: localDate(2022, 4, 30),
          currentlyWorking: false,
          description: "Built scalable web interfaces and backend services for e-commerce clients.",
          technologiesUsed: ["React", "Express", "PostgreSQL", "Tailwind CSS"],
          teamSize: 4,
        },
      ],
      totalExperienceYears: 4,
      totalExperienceMonths: 2,
      experienceLevelCategory: "3-5 years",
      "skills.programmingLanguages": [
        skill("JavaScript", "Expert", 5), skill("TypeScript", "Expert", 4), skill("Python", "Intermediate", 3),
      ],
      "skills.frameworks": [
        skill("React", "Expert", 5), skill("Node.js", "Expert", 5), skill("Express", "Advanced", 4), skill("Next.js", "Advanced", 3),
      ],
      "skills.databases": [skill("MongoDB", "Expert", 5), skill("PostgreSQL", "Advanced", 4), skill("Redis", "Advanced", 3)],
      "skills.cloud": [skill("AWS (S3, EC2, ECS, Lambda)", "Advanced", 3), skill("Docker", "Advanced", 4)],
      "skills.devOps": [skill("CI/CD (GitHub Actions)", "Advanced", 3), skill("Kubernetes Basics", "Intermediate", 2)],
      "skills.tools": [skill("Git", "Expert", 5), skill("Postman", "Expert", 5)],
      "skills.domain": [skill("FinTech & Payments", "Advanced", 3), skill("SaaS Platforms", "Expert", 4)],
      "skills.management": [
        skill("System Architecture", "Advanced", 3), skill("Technical Mentorship", "Advanced", 2),
        skill("Agile / Scrum Sprint Leadership", "Advanced", 3),
      ],
      "skills.softSkills": [skill("Stakeholder Management", "Advanced", 4), skill("Cross-functional Leadership", "Advanced", 4)],
      "careerGoal.goal": "Transition to Engineering Lead / Staff Architect role overseeing high-throughput cloud platforms.",
      "careerGoal.targetRole": "Engineering Lead / Staff Engineer",
      "careerGoal.targetIndustry": "Information Technology & SaaS",
      "careerGoal.targetLevel": "Lead / Staff",
      "careerGoal.timeline": "Next 6 Months",
      "jobPreferences.preferredRoles": ["Engineering Lead", "Staff Software Engineer", "Senior Backend Architect"],
      "jobPreferences.industries": ["Fintech & Banking", "SaaS & Enterprise Tech", "AI Platforms"],
      "jobPreferences.locations": ["Bangalore", "Hyderabad", "Remote (India)"],
      "jobPreferences.workModes": ["Hybrid", "Remote"],
      "jobPreferences.employmentTypes": ["Full-time"],
      "availability.status": "Employed (Passive / Open)",
      "availability.noticePeriod": "30 Days",
      "compensation.currentSalary": 24,
      "compensation.expectedMinSalary": 32,
      "compensation.expectedMaxSalary": 45,
    },
  },
  {
    source: "professional dashboard",
    fields: {
      professionalHeadline: "Senior Software Engineer",
      "currentEmployment.company": "Enterprise Cloud Systems",
      "currentEmployment.jobTitle": "Senior Software Engineer",
      "currentEmployment.location": "Bangalore",
      "currentEmployment.workMode": "Hybrid",
    },
  },
];

// Defaults the schemas used to store before this fix. A profile that still holds them
// was never edited there, so they don't count as the user's own data.
const OLD_DEFAULTS = {
  fresher: {
    careerGoal: "Get my first job",
    targetIndustry: "Information Technology",
    "availability.status": "Immediately Available",
    "availability.currentEmploymentStatus": "Looking for Job",
    "workAuthorization.status": "Authorized to work in India",
  },
  professional: {
    careerSpecialization: "Full Stack & Cloud Architecture",
    currentLevel: "Senior",
    targetLevel: "Lead / Staff",
    "currentEmployment.department": "Engineering",
    "currentEmployment.industry": "Information Technology",
    experienceLevelCategory: "3-5 years",
    "careerGoal.targetRole": "Engineering Lead / Staff Engineer",
    "careerGoal.targetIndustry": "Information Technology & Services",
    "careerGoal.targetLevel": "Lead / Staff",
    "careerGoal.timeline": "Next 6 Months",
    "availability.status": "Employed (Passive / Open)",
    "availability.noticePeriod": "30 Days",
    "relocation.willingToRelocate": "Depends on Opportunity",
  },
};

// System-managed fields: not user content, never compared or cleared.
const IGNORED_PATHS = new Set([
  "_id", "__v", "userId", "createdAt", "updatedAt", "profileCompletion", "isProfileComplete",
  "jobReadinessScore", "careerStrengthScore", "verificationStatus",
]);
const isIgnored = (path) => IGNORED_PATHS.has(path) || path.startsWith("resume.");

const TARGETS = [
  {
    kind: "fresher",
    Model: FresherProfile,
    sets: FRESHER_SAMPLE_SETS,
    // Narrow in the database, then compare exactly in code.
    query: {
      targetRole: "Full Stack Developer",
      "skills.programmingLanguages.name": "JavaScript",
      "education.qualificationType": "B.Tech",
    },
  },
  {
    kind: "professional",
    Model: ProfessionalProfile,
    sets: PROFESSIONAL_SAMPLE_SETS,
    query: { "currentEmployment.company": "Enterprise Cloud Systems" },
  },
];

const getPath = (obj, path) => path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), obj);
const isEmpty = (value) => value === undefined || value === null || value === "" ||
  (Array.isArray(value) && value.length === 0);
const schemaDefault = (schemaType) => {
  const value = schemaType?.defaultValue;
  return typeof value === "function" ? value() : value;
};
const sameValue = (a, b) => {
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  return a === b;
};

// Empty, the current schema default, or an old invented default.
const untouched = (value, schemaType, oldDefault) =>
  isEmpty(value) || sameValue(value, schemaDefault(schemaType)) ||
  (oldDefault !== undefined && sameValue(value, oldDefault));

// A stored array element matches a sample element when the sample's keys are equal and
// every other key is empty or its default.
const elementMatches = (actual, sample, subSchema) => {
  if (sample === null || typeof sample !== "object") return actual === sample;
  if (!actual || typeof actual !== "object") return false;
  const sampleKeysMatch = Object.entries(sample).every(([key, value]) => valueMatches(actual[key], value));
  const otherKeysUntouched = Object.keys(actual)
    .filter((key) => key !== "_id" && !(key in sample))
    .every((key) => untouched(actual[key], subSchema?.path(key)));
  return sampleKeysMatch && otherKeysUntouched;
};

function valueMatches(actual, sample, subSchema) {
  if (sample && sample.$localDate) return dateMatches(actual, sample.$localDate);
  if (Array.isArray(sample)) {
    return Array.isArray(actual) && actual.length === sample.length &&
      sample.every((item, i) => elementMatches(actual[i], item, subSchema));
  }
  return actual === sample;
}

const leafPaths = (Model) => {
  const paths = [];
  Model.schema.eachPath((path, schemaType) => {
    if (!isIgnored(path)) paths.push({ path, schemaType });
  });
  return paths;
};

// Returns { set, edited } when the profile holds a sample set, otherwise null.
function classifyProfile(profile, { kind, Model, sets }) {
  const set = sets.find((sample) => Object.entries(sample.fields).every(([path, value]) =>
    valueMatches(getPath(profile, path), value, Model.schema.path(path)?.schema)));
  if (!set) return null;

  // allowContact set by migrate-allowcontact-false now equals today's default, but the
  // sample data never had that value: count it as a change, as before the migration.
  const edited = Boolean(profile[ALLOW_CONTACT_MIGRATED]) || leafPaths(Model).some(({ path, schemaType }) =>
    !(path in set.fields) && !untouched(getPath(profile, path), schemaType, OLD_DEFAULTS[kind][path]));
  return { set, edited };
}

// Resets every user-content field that isn't already at today's default.
function clearUpdate(profile, Model) {
  const update = { $set: {}, $unset: {} };
  for (const { path, schemaType } of leafPaths(Model)) {
    const value = getPath(profile, path);
    const target = schemaDefault(schemaType);
    if (target === undefined) {
      if (value !== undefined) update.$unset[path] = "";
    } else if (!sameValue(value, target)) {
      update.$set[path] = target;
    }
  }
  if (Object.keys(update.$set).length === 0) delete update.$set;
  if (Object.keys(update.$unset).length === 0) delete update.$unset;
  return update;
}

const withCleanedMarker = (update, now) => ({ ...update, $set: { ...(update.$set || {}), [SAMPLE_DATA_CLEANED]: now } });

// Reads and classifies; writes nothing. Profiles an earlier run decided about are not read.
async function planSampleCleanup(log) {
  const plans = [];
  for (const target of TARGETS) {
    const candidates = await target.Model.find({ ...target.query, ...NOT_YET_DECIDED }).lean();
    const matches = [];
    const skipped = [];
    for (const profile of candidates) {
      const result = classifyProfile(profile, target);
      if (!result) continue;
      (result.edited ? skipped : matches).push({ profile, set: result.set });
    }

    log(`${matches.length} ${target.kind} profile(s) still holding only the old sample data:`);
    matches.forEach(({ profile, set }) => log(`  - ${profile._id} (user ${profile.userId}, from ${set.source})`));
    if (skipped.length > 0) {
      log(`${skipped.length} ${target.kind} profile(s) with sample data but other edits (left alone):`);
      skipped.forEach(({ profile }) => log(`  - ${profile._id} (user ${profile.userId})`));
    }
    plans.push({ target, matches, skipped });
  }
  return plans;
}

async function applySampleCleanup(plans, { apply, log, now }) {
  const summary = { matched: 0, skipped: 0, cleared: 0, markedLeftAlone: 0, ids: [] };
  for (const { target, matches, skipped } of plans) {
    summary.matched += matches.length;
    summary.skipped += skipped.length;
    summary.ids.push(...matches.map((m) => String(m.profile._id)));
    if (!apply) continue;

    for (const { profile } of matches) {
      // Only clear if the profile hasn't changed since it was read.
      const result = await target.Model.updateOne(
        { _id: profile._id, updatedAt: profile.updatedAt, ...NOT_YET_DECIDED },
        withCleanedMarker(clearUpdate(profile, target.Model), now),
        { strict: false }
      );
      summary.cleared += result.modifiedCount;
    }
    summary.markedLeftAlone += await markLeftAlone(target.Model, skipped.map((s) => s.profile._id), now);
  }

  log("");
  if (apply) {
    log(`Cleared sample data from ${summary.cleared} profile(s); marked ${summary.markedLeftAlone} as left alone.`);
  } else {
    log("Dry run: nothing changed. Re-run with --apply to clear the sample fields.");
  }
  return summary;
}

async function cleanFakeFresherProfessionalProfiles({ apply = false, log = console.log, now = new Date() } = {}) {
  const plans = await planSampleCleanup(log);
  return applySampleCleanup(plans, { apply, log, now });
}

// Signup (before T04) saved these when a professional left the fields blank.
const SIGNUP_PLACEHOLDERS = [
  { path: "currentEmployment.company", placeholder: "Industry" },
  { path: "currentEmployment.jobTitle", placeholder: "Working Professional" },
  // A real industry too: only the default when the same profile still has a placeholder
  // company or job title.
  { path: "currentEmployment.industry", placeholder: "Information Technology", needsPlaceholderBeside: true },
];

// The placeholders a profile still holds, judged from one read of that profile.
const placeholdersIn = (profile) => {
  const holds = ({ path, placeholder }) => getPath(profile, path) === placeholder;
  const besidePlaceholder = SIGNUP_PLACEHOLDERS.some((p) => !p.needsPlaceholderBeside && holds(p));
  return SIGNUP_PLACEHOLDERS.filter((p) => holds(p) && (!p.needsPlaceholderBeside || besidePlaceholder));
};

// Reads and decides; writes nothing. `excludeIds`: profiles the sample-data pass decided about.
async function planSignupPlaceholders(log, excludeIds = new Set()) {
  const candidates = await ProfessionalProfile.find({
    $or: SIGNUP_PLACEHOLDERS.filter((p) => !p.needsPlaceholderBeside).map(({ path, placeholder }) => ({ [path]: placeholder })),
    ...NOT_YET_DECIDED,
  }).select(SIGNUP_PLACEHOLDERS.map((p) => p.path).join(" ")).lean();

  const plan = candidates
    .filter((profile) => !excludeIds.has(String(profile._id)))
    .map((profile) => ({ id: profile._id, placeholders: placeholdersIn(profile) }))
    .filter(({ placeholders }) => placeholders.length > 0);

  for (const { path, placeholder, needsPlaceholderBeside } of SIGNUP_PLACEHOLDERS) {
    const ids = plan.filter((p) => p.placeholders.some((ph) => ph.path === path)).map((p) => p.id);
    log(`${ids.length} professional profile(s) with ${path} = "${placeholder}"${needsPlaceholderBeside ? " and a placeholder company or title" : ""}:`);
    ids.forEach((id) => log(`  - ${id}`));
  }
  return plan;
}

async function applySignupPlaceholders(plan, { apply, log, now }) {
  const summary = Object.fromEntries(SIGNUP_PLACEHOLDERS.map(({ path }) => {
    const ids = plan.filter((p) => p.placeholders.some((ph) => ph.path === path)).map((p) => String(p.id));
    return [path, { matched: ids.length, cleared: 0, ids }];
  }));

  if (apply) {
    for (const { id, placeholders } of plan) {
      // Exact values in the filter: a profile edited since it was read is left alone.
      const result = await ProfessionalProfile.updateOne(
        { _id: id, ...NOT_YET_DECIDED, ...Object.fromEntries(placeholders.map((p) => [p.path, p.placeholder])) },
        { $set: { ...Object.fromEntries(placeholders.map((p) => [p.path, ""])), [SAMPLE_DATA_CLEANED]: now } },
        { strict: false }
      );
      if (result.modifiedCount) placeholders.forEach(({ path }) => { summary[path].cleared += 1; });
    }
  }
  log("");
  log(apply ? "Cleared the signup placeholders." : "Dry run: placeholders not changed. Re-run with --apply to clear them.");
  return summary;
}

async function cleanSignupPlaceholders({ apply = false, log = console.log, now = new Date() } = {}) {
  const plan = await planSignupPlaceholders(log);
  return applySignupPlaceholders(plan, { apply, log, now });
}

// Both passes, decided from one read before anything is written. A profile the sample-data
// pass decided about (cleared or left alone) is not also handled by the placeholder pass.
async function cleanFresherProfessionalSampleData({ apply = false, log = console.log, now = new Date() } = {}) {
  const samplePlans = await planSampleCleanup(log);
  log("");
  const decided = new Set(samplePlans.flatMap(({ matches, skipped }) =>
    [...matches, ...skipped].map(({ profile }) => String(profile._id))));
  const placeholderPlan = await planSignupPlaceholders(log, decided);

  log("");
  const samples = await applySampleCleanup(samplePlans, { apply, log, now });
  const placeholders = await applySignupPlaceholders(placeholderPlan, { apply, log, now });
  return { samples, placeholders };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Set MONGODB_URI (or MONGO_URI) to the target database");

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log("");
  try {
    await cleanFresherProfessionalSampleData({ apply });
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
}

module.exports = {
  cleanFresherProfessionalSampleData,
  cleanFakeFresherProfessionalProfiles,
  cleanSignupPlaceholders,
  FRESHER_SAMPLE_SETS,
  PROFESSIONAL_SAMPLE_SETS,
  OLD_DEFAULTS,
};
