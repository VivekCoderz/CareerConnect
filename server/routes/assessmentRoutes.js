const express = require("express");
const router = express.Router();
const assessmentController = require("../controllers/assessmentController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);

// ── Candidate routes (authenticated, no employer role required) ──────────────
router.get("/candidate/list", assessmentController.getCandidateAssessments);
router.post("/:id/start", assessmentController.startAssessment);
router.get("/:id", assessmentController.getAssessmentById);
router.post("/:id/submit", assessmentController.submitAssessment);

// ── Employer management routes ───────────────────────────────────────────────
router.get("/", requireEmployer, assessmentController.getAssessments);
router.post("/", requireEmployer, assessmentController.createAssessment);
router.put("/:id", requireEmployer, assessmentController.updateAssessment);
router.patch("/:id/schedule", requireEmployer, assessmentController.scheduleRound);
router.get("/:id/results", requireEmployer, assessmentController.getAssessmentResults);
router.get("/job/:jobId/results", requireEmployer, assessmentController.getResultsByJob);
router.patch("/submissions/:submissionId/review", requireEmployer, assessmentController.reviewSubmission);
router.delete("/:id", requireEmployer, assessmentController.deleteAssessment);

module.exports = router;
