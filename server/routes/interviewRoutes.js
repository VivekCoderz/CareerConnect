const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const interviewController = require("../controllers/interviewController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");
const { aiInterviewLimiter } = require("../middleware/rateLimitMiddleware");

// All interview endpoints require authenticated session
router.use(protect);

router.param("id", (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid interview ID" });
  }
  next();
});

router.param("candidateId", (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid candidate ID" });
  }
  next();
});

// 1. Statistics (Must precede /:id)
router.get("/statistics", interviewController.getInterviewStats);
router.get("/stats", interviewController.getInterviewStats);

// 2. Eligible Shortlisted Candidates (Must precede /:id)
router.get("/eligible-candidates", requireEmployer, interviewController.getEligibleCandidates);

// 2.1 Interview Availability (Must precede /:id)
router.get("/availability", interviewController.getInterviewAvailability);

// 2.2 Employer-scoped candidate history (must precede /:id)
router.get("/candidate/:candidateId", requireEmployer, interviewController.getCandidateInterviewHistory);

// 3. List Interviews (Role-adaptive: Employer owns company interviews; Candidate sees their own)
router.get("/", interviewController.getInterviews);

// 4. Detailed Interview by ID
router.get("/:id", interviewController.getInterviewById);

// Candidate AI interview lifecycle
router.post("/:id/ai/start", aiInterviewLimiter, interviewController.startAiInterview);
router.post("/:id/ai/answer", interviewController.saveAiInterviewAnswer);
router.post("/:id/ai/complete", aiInterviewLimiter, interviewController.completeAiInterview);

// 5. Schedule Interview
router.post("/", requireEmployer, interviewController.scheduleInterview);

// 6. Reschedule Interview (Support both PUT & PATCH)
router.put("/:id/reschedule", requireEmployer, interviewController.rescheduleInterview);
router.patch("/:id/reschedule", requireEmployer, interviewController.rescheduleInterview);

// 7. Cancel Interview (Support both PUT & PATCH)
router.put("/:id/cancel", requireEmployer, interviewController.cancelInterview);
router.patch("/:id/cancel", requireEmployer, interviewController.cancelInterview);

// 8. Mark Completed (Support both PUT & PATCH)
router.put("/:id/complete", requireEmployer, interviewController.completeInterview);
router.patch("/:id/complete", requireEmployer, interviewController.completeInterview);

// 9. Scorecard Evaluation (Support POST /scorecard & PATCH /feedback)
router.post("/:id/scorecard", requireEmployer, interviewController.submitInterviewScorecard);
router.patch("/:id/feedback", requireEmployer, interviewController.submitInterviewScorecard);

// 10. Explicit Result Outcome
router.put("/:id/result", requireEmployer, interviewController.updateInterviewResult);

// 11. Generic Status update (backward compatibility)
router.patch("/:id/status", requireEmployer, interviewController.updateInterviewStatus || interviewController.rescheduleInterview);

// 12. Delete Interview (Drafts only; non-drafts rejected for auditability)
router.delete("/:id", requireEmployer, interviewController.deleteInterview);

module.exports = router;
