const express = require("express");
const router = express.Router();
const professionalController = require("../controllers/professionalController");
const marketInsightsController = require("../controllers/marketInsightsController");
const protect = require("../middleware/authMiddleware");
const { requireUserType } = require("../middleware/roleMiddleware");

// Public route for recruiter / public preview
router.get(
  "/public/:usernameOrId",
  professionalController.getPublicProfessionalProfile,
);

// Authenticated Professional-only routes
router.use(protect);
router.use(requireUserType("professional"));

// Profile CRUD & draft endpoints
router.get("/profile", professionalController.getProfessionalProfile);
router.put("/profile", professionalController.updateProfessionalProfile);
router.patch("/profile", professionalController.updateProfessionalProfile);

// Aliases for profile service compatibility
router.get("/me", professionalController.getProfessionalProfile);
router.put("/me", professionalController.updateProfessionalProfile);

// Dashboard & Career Recommendations
router.get("/dashboard", professionalController.getProfessionalDashboard);
router.get(
  "/recommendations",
  professionalController.getProfessionalRecommendations,
);

// Career & Company Insights Engine
router.get("/market-insights", marketInsightsController.getMarketInsights);
router.get("/companies/:companySlug", marketInsightsController.getCompanyDetails);

module.exports = router;
