// server/routes/jobVisibilityRoutes.js
const express = require("express");
const router = express.Router();
const jobVisibilityController = require("../controllers/jobVisibilityController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer, requireUserType } = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(protect);

// ==========================================
// EMPLOYEE ROUTES (Require Employer Role)
// ==========================================
router.post(
  "/employer/jobs",
  requireEmployer,
  jobVisibilityController.createJobWithVisibility
);

router.get(
  "/employer/jobs",
  requireEmployer,
  jobVisibilityController.getEmployerJobsWithVisibility
);

router.get(
  "/employer/jobs/:jobId/config",
  requireEmployer,
  jobVisibilityController.getJobVisibilityConfig
);

router.put(
  "/employer/jobs/:jobId/config",
  requireEmployer,
  jobVisibilityController.configureJobVisibility
);

// ==========================================
// STUDENT / CANDIDATE ROUTES
// ==========================================
router.get(
  "/student/eligible-jobs",
  requireUserType("student", "fresher", "professional", "user"),
  jobVisibilityController.getEligibleJobsForStudent
);

router.get(
  "/student/jobs/:jobId",
  requireUserType("student", "fresher", "professional", "user"),
  jobVisibilityController.getEligibleJobDetails
);

router.post(
  "/student/jobs/:jobId/apply",
  requireUserType("student", "fresher", "professional", "user"),
  jobVisibilityController.applyToEligibleJob
);

module.exports = router;
