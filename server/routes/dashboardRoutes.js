const express = require("express");
const router = express.Router();
const fresherDashboardController = require("../controllers/fresherDashboardController");
const protect = require("../middleware/authMiddleware");
const { requireCandidate, requireUserType } = require("../middleware/roleMiddleware");

// Fresher dashboard banner: name, preferences, profile strength and counts.
router.get("/summary", protect, requireCandidate(), requireUserType("fresher"), fresherDashboardController.getDashboardSummary);

module.exports = router;
