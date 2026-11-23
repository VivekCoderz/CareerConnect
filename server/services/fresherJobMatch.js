// Scores open, fresher-eligible jobs against a fresher's dashboard preferences. Used by
// GET /api/jobs/recommended and GET /api/dashboard/summary so the banner count and the
// list always agree.

const Job = require("../models/Job");
const { openListingQuery } = require("../utils/listingExpiry");
const { formatSalary, formatStipend, companyOf, textOrNull } = require("../utils/listingDisplay");
const { normalizeSkill } = require("../utils/skills");
const { titleMatchesRole, skillKeySet, roleSkillKeys, targetRolesOf } = require("../utils/fresherPreferences");

// Newest open fresher jobs considered for matching. Counts in the banner stop here.
const POOL_SIZE = 300;
// A job counts as a match at this score, and only when it is relevant (see isRelevant).
const MATCH_THRESHOLD = 30;
// A job whose title isn't for the fresher's role is relevant with this many role skills.
const MIN_ROLE_SKILLS = 3;
const NEW_JOB_DAYS = 7;

const POINTS = { role: 40, perSkill: 10, maxSkills: 30, jobType: 15, location: 15 };

// Titles no fresher should be shown, whatever experience level the listing gives.
const SENIOR_TITLE = /\b(senior|sr|lead|principal|staff|head|manager|director|architect|vp)\b/i;

// Fresher-eligible: marked Fresher / Entry-Level, or no level and no minimum experience.
const FRESHER_ELIGIBLE = {
  $or: [
    { "experience.level": "Fresher / Entry-Level" },
    {
      "experience.level": null,
      $or: [{ "experience.minYears": null }, { "experience.minYears": { $lte: 0 } }],
    },
  ],
};

// Filter chips on the dashboard: All, Internship, Full-time, Remote.
const TYPE_FILTERS = {
  internship: { employmentType: "Internship" },
  "full-time": { employmentType: "Full-time" },
  remote: { workMode: "Remote" },
};

const hasPreferences = (prefs = {}) =>
  Boolean(targetRolesOf(prefs).length || prefs.techStack?.length || prefs.jobType || prefs.location);

const isRemote = (job) => job.workMode === "Remote" || /\bremote\b/i.test(job.location || "");

/** True when the fresher's location preference fits the job. "Panipat, Haryana" matches on Panipat. */
const locationMatches = (job, location) => {
  const wanted = (location || "").split(",")[0].trim().toLowerCase();
  if (!wanted || wanted === "remote") return isRemote(job);
  return `${job.location || ""} ${job.city || ""}`.toLowerCase().includes(wanted);
};

/**
 * Score 0-100 for one job, with the job's skills the fresher already has. `relevant` says
 * whether the job is for one of the fresher's roles at all: its title is, or it asks for
 * MIN_ROLE_SKILLS of those roles' skills. Job type and location alone never make a match.
 */
const scoreJob = (job, { prefs, roles, skillKeys, roleKeys }) => {
  let score = 0;
  const roleMatch = roles.some((role) => titleMatchesRole(job.title, role));
  if (roleMatch) score += POINTS.role;

  const matchedSkills = [];
  const seen = new Set();
  let roleSkillCount = 0;
  for (const skill of job.requiredSkills || []) {
    const key = normalizeSkill(skill);
    if (key && skillKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      matchedSkills.push(skill);
      if (roleKeys.has(key)) roleSkillCount += 1;
    }
  }
  score += Math.min(POINTS.maxSkills, matchedSkills.length * POINTS.perSkill);

  if (prefs.jobType && job.employmentType === prefs.jobType) score += POINTS.jobType;
  if (locationMatches(job, prefs.location)) score += POINTS.location;

  // No role or stack to judge by: any MIN_ROLE_SKILLS of the fresher's skills will do.
  const skillsForRelevance = roleKeys.size ? roleSkillCount : matchedSkills.length;
  const relevant = roleMatch || skillsForRelevance >= MIN_ROLE_SKILLS;

  return { matchScore: Math.min(100, score), matchedSkills, relevant };
};

const isMatch = (s) => s.relevant && s.matchScore >= MATCH_THRESHOLD;

const isSeniorTitle = (title) => SENIOR_TITLE.test(title || "");

/** What scoreJob needs to know about the fresher, built once per request. */
const matchContext = ({ prefs = {}, skills = [] } = {}) => {
  const roles = targetRolesOf(prefs);
  return {
    prefs,
    roles,
    skillKeys: skillKeySet(skills, prefs.techStack || []),
    roleKeys: roleSkillKeys(roles, prefs.techStack || []),
  };
};

/**
 * The fresher's scored job pool, best match first, then newest.
 * `type` is one of TYPE_FILTERS' keys (anything else means all jobs).
 */
const scoredJobs = async ({ prefs = {}, skills = [], type } = {}) => {
  const query = openListingQuery({ $and: [FRESHER_ELIGIBLE] });
  Object.assign(query, TYPE_FILTERS[type] || {});

  const jobs = await Job.find(query)
    .select("title companyName employerId location city workMode employmentType salaryRange stipend stipendAmount requiredSkills createdAt isExternal applyUrl")
    .populate("employerId", "companyName logo")
    .sort({ createdAt: -1, _id: -1 })
    .limit(POOL_SIZE)
    .lean();

  const ctx = matchContext({ prefs, skills });
  return jobs
    .filter((job) => !isSeniorTitle(job.title))
    .map((job) => ({ job, ...scoreJob(job, ctx) }))
    .sort((a, b) => b.matchScore - a.matchScore || new Date(b.job.createdAt) - new Date(a.job.createdAt));
};

const isNew = (job, now = Date.now()) =>
  now - new Date(job.createdAt).getTime() <= NEW_JOB_DAYS * 24 * 60 * 60 * 1000;

/** Banner counts: matched jobs, and how many of them were posted in the last 7 days. */
const matchCounts = async ({ prefs, skills }) => {
  if (!hasPreferences(prefs)) return { matchedJobs: 0, newMatchedJobs: 0 };
  const matched = (await scoredJobs({ prefs, skills })).filter(isMatch);
  const now = Date.now();
  return { matchedJobs: matched.length, newMatchedJobs: matched.filter((s) => isNew(s.job, now)).length };
};

/** What a job card shows. Missing values are null so the card hides them. */
const toCard = ({ job, matchScore, matchedSkills }, { withScore = true } = {}) => ({
  _id: job._id,
  id: String(job._id),
  title: job.title,
  company: companyOf(job),
  logo: job.employerId?.logo || null,
  location: textOrNull(job.location),
  workMode: textOrNull(job.workMode),
  jobType: textOrNull(job.employmentType),
  pay: job.employmentType === "Internship" ? formatStipend(job) : formatSalary(job.salaryRange),
  skills: job.requiredSkills || [],
  matchedSkills,
  matchScore: withScore ? matchScore : null,
  postedAt: job.createdAt,
  isExternal: Boolean(job.isExternal),
  applyUrl: job.isExternal ? textOrNull(job.applyUrl) : null,
});

module.exports = {
  MATCH_THRESHOLD,
  POOL_SIZE,
  TYPE_FILTERS,
  hasPreferences,
  isMatch,
  isSeniorTitle,
  matchContext,
  scoreJob,
  scoredJobs,
  matchCounts,
  toCard,
};
