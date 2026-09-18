const express = require("express");
const router = express.Router();
const aiAssistantController = require("../controllers/aiAssistantController");
const protect = require("../middleware/authMiddleware");
const { consumeWindow } = require("../services/otpService");

const limitAiRequests = (action, maxRequests, windowMs) => async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const allowed = await consumeWindow(`ai:${action}:user`, userId, maxRequests, windowMs);
    if (!allowed) return res.status(429).json({ success: false, message: "AI request limit reached. Please try again later." });
    next();
  } catch (error) {
    next(error);
  }
};

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

router.post("/chat", limitAiRequests("chat", 30, 60 * 60 * 1000), aiAssistantController.chat);
router.post("/send-recommendation-mail", limitAiRequests("recommendation", 5, 24 * 60 * 60 * 1000), aiAssistantController.sendRecommendationMail);

module.exports = router;
