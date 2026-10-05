// server/routes/internshipRoutes.js
const express = require("express");
const router = express.Router();
const internshipController = require("../controllers/internshipController");
const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const { requireEmployer: employerOnly, requireSuperAdmin } = require("../middleware/roleMiddleware");
const { requireVerifiedEmployer, requireVerifiedEmployerToPublish } = require("../middleware/employerVerification");
const { getAggregatedOpportunities } = require("../services/jobScraperService");
const { internshipsLiveLimiter } = require("../middleware/rateLimitMiddleware");
const publicCache = require("../middleware/publicCache");

// Live external and campus aggregated internships feed
router.get("/live", internshipsLiveLimiter, publicCache, async (req, res, next) => {
  try {
    const results = await getAggregatedOpportunities({
      ...req.query,
      opportunityType: req.query.opportunityType || "internship",
    });
    return res.status(200).json({
      success: true,
      count: results.count,
      data: results.data,
      internships: results.data,
      source: results.source,
    });
  } catch (error) {
    next(error);
  }
});

// Category metadata & aggregated counts
router.get("/categories", publicCache, internshipController.getInternshipCategories);

// Category shortcut routes
router.get("/work-from-home", publicCache, (req, res, next) => {
  req.query.workMode = "Remote";
  return internshipController.getInternships(req, res, next);
});

router.get("/international", publicCache, (req, res, next) => {
  req.query.isInternational = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/latest", publicCache, (req, res, next) => {
  req.query.sort = "latest";
  return internshipController.getInternships(req, res, next);
});

router.get("/paid", publicCache, (req, res, next) => {
  req.query.isPaid = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/with-job-offer", publicCache, (req, res, next) => {
  req.query.hasJobOffer = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/in/:city", publicCache, (req, res, next) => {
  req.query.city = req.params.city;
  return internshipController.getInternships(req, res, next);
});

router.get("/category/:category", publicCache, (req, res, next) => {
  req.query.category = req.params.category;
  return internshipController.getInternships(req, res, next);
});

// Sync external API jobs (platform admins only: synced listings are published without moderation)
router.post("/sync/external", protect, requireSuperAdmin, internshipController.syncFromExternalAPIs);

// Employer create internship
router.post("/", protect, employerOnly, requireVerifiedEmployer, internshipController.createInternship);

// General filterable catalog / myPosts
router.get("/", (req, res, next) => {
  if (req.query.myPosts === "true" || req.query.myPosts === true || req.query.myPosts === "1") {
    return protect(req, res, () => internshipController.getInternships(req, res, next));
  }
  return publicCache(req, res, () => internshipController.getInternships(req, res, next));
});

// Single internship details
router.get("/:id", optionalAuth, internshipController.getInternshipById);

// Employer update/delete operations
router.put("/:id", protect, employerOnly, internshipController.updateInternship);
router.patch("/:id/status", protect, employerOnly, requireVerifiedEmployerToPublish, internshipController.updateInternshipStatus);
router.delete("/:id", protect, employerOnly, internshipController.deleteInternship);

module.exports = router;
