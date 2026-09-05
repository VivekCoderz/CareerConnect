const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  generateResumeHandler,
  updateResumeHandler,
  getMyResume,
  saveManualEdit,
} = require("../controllers/resumeController.js");

const router = express.Router();

// All resume routes require authentication
router.use(protect);

router.post("/generate", generateResumeHandler);
router.post("/update", updateResumeHandler);
router.get("/me", getMyResume);
router.put("/manual", saveManualEdit);

module.exports = router;