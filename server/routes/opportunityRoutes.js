const express = require("express");
const router = express.Router();
const opportunityController = require("../controllers/opportunityController");

// Public live opportunities feed & metadata
router.get("/", opportunityController.getOpportunities);
router.get("/meta", opportunityController.getOpportunityMetadata);
router.get("/health", opportunityController.healthCheck);
router.get("/:id", opportunityController.getOpportunityById);

module.exports = router;
