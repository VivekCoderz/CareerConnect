const express = require("express");
const router = express.Router();
const recommendationController = require("../controllers/recommendationController");
const protect = require("../middleware/authMiddleware");

// All recommendation routes are authenticated
router.use(protect);

router.get("/", recommendationController.getRecommendationsOverview);
router.get("/jobs", recommendationController.getRecommendedJobs);
router.get("/internships", recommendationController.getRecommendedInternships);
router.get("/skills", recommendationController.getSkillGapAnalysis);
router.get("/courses", recommendationController.getRecommendedCourses);
router.get("/projects", recommendationController.getRecommendedProjects);
router.get("/career-paths", recommendationController.getCareerPaths);
router.get("/action-plan", recommendationController.getActionPlan);

module.exports = router;
