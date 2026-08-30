const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/", interviewController.getInterviews);
router.post("/", requireEmployer, interviewController.scheduleInterview);
router.patch(
  "/:id/feedback",
  requireEmployer,
  interviewController.submitInterviewFeedback,
);
router.patch(
  "/:id/status",
  requireEmployer,
  interviewController.updateInterviewStatus,
);

module.exports = router;
