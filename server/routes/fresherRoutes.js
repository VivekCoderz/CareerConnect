const express = require("express");
const router = express.Router();
const fresherController = require("../controllers/fresherController");
const protect = require("../middleware/authMiddleware");
const { requireUserType } = require("../middleware/roleMiddleware");

// Public route for viewing public profiles
router.get("/public/:usernameOrId", fresherController.getPublicFresherProfile);

// Authenticated Fresher-only routes
router.use(protect);
router.use(requireUserType("fresher"));

// Profile endpoints
router.get("/profile", fresherController.getFresherProfile);
router.put("/profile", fresherController.updateFresherProfile);
router.patch("/profile", fresherController.updateFresherProfile);

// Aliases for compatibility
router.get("/me", fresherController.getFresherProfile);
router.put("/me", fresherController.updateFresherProfile);

// Dashboard & Recommendations
router.get("/dashboard", fresherController.getFresherDashboard);
router.get("/recommendations", fresherController.getFresherRecommendations);

module.exports = router;
