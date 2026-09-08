const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

// All interview endpoints require authenticated session
router.use(protect);

// 1. Statistics (Must precede /:id)
router.get("/statistics", interviewController.getInterviewStats);
router.get("/stats", interviewController.getInterviewStats);

// 2. Eligible Shortlisted Candidates (Must precede /:id)
router.get("/eligible-candidates", requireEmployer, interviewController.getEligibleCandidates);

// 3. List Interviews (Role-adaptive: Employer owns company interviews; Candidate sees their own)
router.get("/", interviewController.getInterviews);

// 4. Detailed Interview by ID
router.get("/:id", interviewController.getInterviewById);

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

module.exports = router;
