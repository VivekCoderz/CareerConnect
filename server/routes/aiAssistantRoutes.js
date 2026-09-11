const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/aiAssistantController");
const protect = require("../middleware/authMiddleware");

// Strictly restrict AI Assistant to student, fresher, and working professional workspaces
const allowCandidateWorkspaceOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required to use AI Assistant.",
    });
  }

  // Employers cannot access the student/candidate AI
  if (req.user.role === "employer") {
    return res.status(403).json({
      success: false,
      message: "AI Assistant is exclusively available for student, fresher, and working professional workspaces.",
    });
  }

  next();
};

router.use(protect);
router.use(allowCandidateWorkspaceOnly);

router.post("/chat", aiAssistantController.chat);
router.post("/send-recommendation-mail", aiAssistantController.sendRecommendationMail);

module.exports = router;
