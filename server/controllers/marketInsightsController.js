const ProfessionalProfile = require("../models/ProfessionalProfile");
const marketAnalyticsService = require("../services/marketAnalyticsService");

// ==========================================
// GET MARKET INSIGHTS
// ==========================================
exports.getMarketInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { role, location, period, experience } = req.query;

    const profile = await ProfessionalProfile.findOne({ userId });

    const targetRole = role || profile?.careerGoal?.targetRole || "Engineering Lead / Staff Engineer";
    const loc = location || "India / Remote";
    const timePeriod = period || "30D";
    const exp = experience || "5+ Years";

    const insights = await marketAnalyticsService.getMarketInsightsData({
      role: targetRole,
      location: loc,
      period: timePeriod,
      experience: exp,
      userProfile: profile,
    });

    return res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET COMPANY DETAILS
// ==========================================
exports.getCompanyDetails = async (req, res, next) => {
  try {
    const { companySlug } = req.params;
    const details = await marketAnalyticsService.getCompanyDetails(companySlug);

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
};
