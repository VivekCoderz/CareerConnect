// Fresher dashboard banner (GET /api/dashboard/summary) and "Jobs for you"
// (GET /api/jobs/recommended). Every value comes from the signed-in fresher's profile.

const FresherProfile = require("../models/FresherProfile");
const Application = require("../models/Application");
const {
  JOB_TYPES,
  ROLE_SKILLS,
  backfillPreferencesUpdate,
  targetRolesOf,
  targetRolesUpdate,
  profileSkills,
  skillKeySet,
  resumeUrlOf,
  graduationYearOf,
  profileStrength,
  skillScoreFor,
} = require("../utils/fresherPreferences");
const { hasPreferences, scoredJobs, matchCounts, toCard, isMatch } = require("../services/fresherJobMatch");

const MAX_LIMIT = 50;

const preferencesOf = (profile) => {
  const prefs = profile.preferences || {};
  const targetRoles = targetRolesOf(prefs);
  return {
    targetRole: targetRoles[0] || "",
    targetRoles,
    techStack: [...(prefs.techStack || [])],
    jobType: prefs.jobType || "",
    location: prefs.location || "",
  };
};

/**
 * The fresher's profile (an empty one on first visit). A profile saved before
 * `preferences` existed is filled once from its old fields and the signup interests.
 */
const loadProfile = async (user) => {
  const profile = await FresherProfile.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!profile.preferencesSyncedAt) {
    const { set } = backfillPreferencesUpdate(profile, user);
    await FresherProfile.updateOne(
      { _id: profile._id, preferencesSyncedAt: { $exists: false } },
      { $set: set },
      { timestamps: false }
    );
  }
  const rolesSet = targetRolesUpdate(profile, user);
  if (rolesSet) await FresherProfile.updateOne({ _id: profile._id }, { $set: rolesSet }, { timestamps: false });
  return profile;
};

const firstNameOf = (user) =>
  (user.firstName || "").trim() || (user.fullName || "").trim().split(/\s+/)[0] || "";

module.exports.getDashboardSummary = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await loadProfile(user);
    const preferences = preferencesOf(profile);
    const skills = profileSkills(profile);

    const strength = profileStrength({
      preferences,
      skills,
      graduationYear: graduationYearOf(profile),
      resumeUrl: resumeUrlOf(profile, user),
    });
    const skillScore = skillScoreFor(preferences.targetRole, skillKeySet(skills, preferences.techStack));

    const [counts, applications] = await Promise.all([
      matchCounts({ prefs: preferences, skills }),
      Application.countDocuments({ candidateId: user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        firstName: firstNameOf(user),
        preferences,
        profileCompletion: strength.percent,
        nextStep: strength.nextStep,
        nextStepHint: strength.hint,
        matchedJobs: counts.matchedJobs,
        newMatchedJobs: counts.newMatchedJobs,
        applications,
        skillScore: skillScore.score,
        skillScoreStatus: skillScore.status,
        profileViews: profile.profileViews || 0,
        // Choices for the edit preferences form.
        options: { roles: Object.keys(ROLE_SKILLS), jobTypes: JOB_TYPES },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getRecommendedJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const type = typeof req.query.type === "string" ? req.query.type.toLowerCase() : "";

    const profile = await loadProfile(req.user);
    const prefs = preferencesOf(profile);
    const noPreferences = !hasPreferences(prefs);

    // Without preferences there is nothing to match on: show the newest fresher jobs.
    const scored = await scoredJobs({ prefs, skills: profileSkills(profile), type });
    const list = noPreferences
      ? scored.sort((a, b) => new Date(b.job.createdAt) - new Date(a.job.createdAt))
      : scored.filter(isMatch);

    const total = list.length;
    const pageItems = list.slice((page - 1) * limit, page * limit);
    const jobs = pageItems.map((item) => toCard(item, { withScore: !noPreferences }));

    const appliedIds = new Set(
      (await Application.find({ candidateId: req.user._id, jobId: { $in: jobs.map((j) => j._id) } }).distinct("jobId"))
        .map(String)
    );
    jobs.forEach((job) => { job.hasApplied = appliedIds.has(job.id); });

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
        noPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};
