// Scores open, fresher-eligible jobs against a fresher's dashboard preferences. Used by
// GET /api/jobs/recommended and GET /api/dashboard/summary so the banner count and the
// list always agree.

const Job = require("../models/Job");
const { openListingQuery } = require("../utils/listingExpiry");
const { formatSalary, formatStipend, companyOf, textOrNull } = require("../utils/listingDisplay");
const { normalizeSkill } = require("../utils/skills");
const { titleMatchesRole, skillKeySet } = require("../utils/fresherPreferences");

// Newest open fresher jobs considered for matching. Counts in the banner stop here.
const POOL_SIZE = 300;
// A job counts as a match at this score (e.g. the role alone, or two skills and remote).
const MATCH_THRESHOLD = 30;
const NEW_JOB_DAYS = 7;

const POINTS = { role: 40, perSkill: 10, maxSkills: 30, jobType: 15, location: 15 };

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
  Boolean(prefs.targetRole || prefs.techStack?.length || prefs.jobType || prefs.location);

const isRemote = (job) => job.workMode === "Remote" || /\bremote\b/i.test(job.location || "");

/** Score 0-100 for one job, with the job's skills the fresher already has. */
const scoreJob = (job, { prefs, skillKeys }) => {
  let score = 0;
  if (prefs.targetRole && titleMatchesRole(job.title, prefs.targetRole)) score += POINTS.role;

  const matchedSkills = [];
  const seen = new Set();
  for (const skill of job.requiredSkills || []) {
    const key = normalizeSkill(skill);
    if (key && skillKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      matchedSkills.push(skill);
    }
  }
  score += Math.min(POINTS.maxSkills, matchedSkills.length * POINTS.perSkill);

  if (prefs.jobType && job.employmentType === prefs.jobType) score += POINTS.jobType;

  const wanted = (prefs.location || "").toLowerCase();
  const where = `${job.location || ""} ${job.city || ""}`.toLowerCase();
  if (isRemote(job) || (wanted && wanted !== "remote" && where.includes(wanted))) score += POINTS.location;

  return { matchScore: Math.min(100, score), matchedSkills };
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

  const ctx = { prefs, skillKeys: skillKeySet(skills, prefs.techStack || []) };
  return jobs
    .map((job) => ({ job, ...scoreJob(job, ctx) }))
    .sort((a, b) => b.matchScore - a.matchScore || new Date(b.job.createdAt) - new Date(a.job.createdAt));
};

const isNew = (job, now = Date.now()) =>
  now - new Date(job.createdAt).getTime() <= NEW_JOB_DAYS * 24 * 60 * 60 * 1000;

/** Banner counts: matched jobs, and how many of them were posted in the last 7 days. */
const matchCounts = async ({ prefs, skills }) => {
  if (!hasPreferences(prefs)) return { matchedJobs: 0, newMatchedJobs: 0 };
  const matched = (await scoredJobs({ prefs, skills })).filter((s) => s.matchScore >= MATCH_THRESHOLD);
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
  scoreJob,
  scoredJobs,
  matchCounts,
  toCard,
};
