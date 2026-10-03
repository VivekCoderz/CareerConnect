const express = require("express");
const router = express.Router();
const opportunityController = require("../controllers/opportunityController");
const publicReadLimit = require("../middleware/publicReadLimit");
const publicCache = require("../middleware/publicCache");

// Public live opportunities feed & metadata
router.get("/", publicReadLimit("opportunity-feed", 60, 1000), publicCache, opportunityController.getOpportunities);
router.get("/meta", opportunityController.getOpportunityMetadata);
router.get("/health", opportunityController.healthCheck);
router.get("/:id", opportunityController.getOpportunityById);

module.exports = router;
