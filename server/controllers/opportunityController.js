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
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * pageSize;

    const results = await getAggregatedOpportunities(req.query);
    const allList = [...(results.data || [])];

    const getTimestamp = (item) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (item.postedDate) {
        const t = new Date(item.postedDate).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    allList.sort((a, b) => getTimestamp(b) - getTimestamp(a));

    const total = allList.length;
    const paginatedList = allList.slice(skip, skip + pageSize);

    return res.status(200).json({
      success: true,
      count: paginatedList.length,
      data: paginatedList,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
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
