const express = require("express");
const router = express.Router();
const opportunityController = require("../controllers/opportunityController");
const publicReadLimit = require("../middleware/publicReadLimit");
const publicCache = require("../middleware/publicCache");

// Public live opportunities feed & metadata
// Per-IP limits. Students on a college network share one public IP, so these are set for a
// whole campus, not one person (60/min and 1,000/day blocked a campus within minutes).
const envInt = (name, fallback) => {
  const value = parseInt(process.env[name], 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const feedLimit = publicReadLimit(
  "opportunity-feed",
  envInt("OPPORTUNITY_FEED_MINUTE_MAX", 600),
  envInt("OPPORTUNITY_FEED_DAY_MAX", 50000)
);

// Public live opportunities feed & metadata
router.get("/", feedLimit, publicCache, opportunityController.getOpportunities);
router.get("/meta", opportunityController.getOpportunityMetadata);
router.get("/health", opportunityController.healthCheck);
router.get("/:id", opportunityController.getOpportunityById);

module.exports = router;
