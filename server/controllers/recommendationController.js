const { generateFresherRecommendations } = require("../services/recommendationEngine");

/**
 * GET /api/recommendations
 * Comprehensive Career Intelligence Summary for Fresher
 */
const getRecommendationsOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Recommendation overview error:", error);
    next(error);
  }
};

/**
 * GET /api/recommendations/jobs
 * Returns filtered and sorted job recommendations
 */
const getRecommendedJobs = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { workMode, location, search } = req.query;
    const recommendations = await generateFresherRecommendations(userId);

    let jobs = recommendations.recommendedJobs || [];

    if (workMode && workMode !== "All") {
      jobs = jobs.filter((j) => (j.workMode || "").toLowerCase() === workMode.toLowerCase());
    }

    if (location && location !== "All") {
      jobs = jobs.filter((j) => (j.location || "").toLowerCase().includes(location.toLowerCase()));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      data: jobs,
      totalCount: jobs.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/internships
 */
const getRecommendedInternships = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.recommendedInternships || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/skills
 */
const getSkillGapAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.skillGapAnalysis || {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/courses
 */
const getRecommendedCourses = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.recommendedCourses || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/projects
 */
const getRecommendedProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.recommendedProjects || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/career-paths
 */
const getCareerPaths = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.careerPaths || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommendations/action-plan
 */
const getActionPlan = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const recommendations = await generateFresherRecommendations(userId);

    return res.status(200).json({
      success: true,
      data: recommendations.actionPlan || {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendationsOverview,
  getRecommendedJobs,
  getRecommendedInternships,
  getSkillGapAnalysis,
  getRecommendedCourses,
  getRecommendedProjects,
  getCareerPaths,
  getActionPlan,
};
