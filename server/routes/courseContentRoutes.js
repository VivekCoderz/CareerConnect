const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const {
  addCourseContent,
  getCourseContent,
  updateCourseContent,deleteCourseContent
} = require("../controllers/courseContentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// COURSE CONTENT ROUTES
// ==========================================

// Add content to a course
// POST /api/courses/:courseId/content
router.post("/:courseId",protect,upload.single("file"),addCourseContent);
//get course content
router.get("/:courseId", protect, getCourseContent);
// Update course content
router.put("/:contentId", protect, updateCourseContent);

// Delete course content
router.delete("/:contentId", protect, deleteCourseContent);


module.exports = router;