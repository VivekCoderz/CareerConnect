const express = require("express");

const {
  addCourseContent,
} = require("../controllers/courseContentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// COURSE CONTENT ROUTES
// ==========================================

// Add content to a course
// POST /api/courses/:courseId/content

router.post("/:courseId/content", protect, addCourseContent);

module.exports = router;