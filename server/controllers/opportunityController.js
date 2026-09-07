const {
  getAggregatedOpportunities,
  getFilterMetadata,
  CAMPUS_DRIVES
} = require("../services/jobScraperService");

/**
 * GET /api/opportunities
 * Fetches multi-source aggregated opportunities (LinkedIn, Internshala, Remotive, Arbeitnow, GU Campus Drives)
 */
exports.getOpportunities = async (req, res, next) => {
  try {
    const results = await getAggregatedOpportunities(req.query);
    return res.status(200).json({
      success: true,
      count: results.count,
      data: results.data,
      source: results.source
    });
  } catch (error) {
    console.error("Opportunity aggregator execution error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process multi-source feed",
      data: CAMPUS_DRIVES
    });
  }
};

/**
 * GET /api/opportunities/meta
 * Returns metadata list of programs, specializations, regions, sources for UI filters
 */
exports.getOpportunityMetadata = async (req, res, next) => {
  try {
    const meta = getFilterMetadata();
    return res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /health (or /api/opportunities/health)
 */
exports.healthCheck = (req, res) => {
  return res.status(200).json({
    status: "active",
    node: "GU Gateway Matrix Engine"
  });
};
