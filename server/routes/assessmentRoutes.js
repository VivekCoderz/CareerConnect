const express = require("express");
const router = express.Router();
const assessmentController = require("../controllers/assessmentController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);

// Candidate take & submit test
router.get("/:id", assessmentController.getAssessmentById);
router.post("/:id/submit", assessmentController.submitAssessment);

// Employer management
router.get("/", requireEmployer, assessmentController.getAssessments);
router.post("/", requireEmployer, assessmentController.createAssessment);
router.get(
  "/:id/results",
  requireEmployer,
  assessmentController.getAssessmentResults,
);
router.delete("/:id", requireEmployer, assessmentController.deleteAssessment);

module.exports = router;
