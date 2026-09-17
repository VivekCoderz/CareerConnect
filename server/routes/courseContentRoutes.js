const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const {
  getUploadSignature,
  addCourseContent,
  getCourseContent,
  updateCourseContent,
  deleteCourseContent,
  streamPdfContent,
  streamVideoContent,
} = require("../controllers/courseContentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// COURSE CONTENT ROUTES
// ==========================================

// Upload signature generation for direct browser-to-Cloudinary upload
// GET /api/course-content/upload-signature
router.get("/upload-signature", protect, getUploadSignature);

// Stream/View PDF directly without 401 ACL issues
// GET /api/course-content/:contentId/view-pdf
router.get("/:contentId/view-pdf", streamPdfContent);

// Stream/View Video directly with HTTP 206 Range support
// GET /api/course-content/:contentId/view-video
router.get("/:contentId/view-video", streamVideoContent);

// Add content to a course
// POST /api/courses/:courseId/content
router.post("/:courseId", protect, upload.single("file"), addCourseContent);
// Get course content
router.get("/:courseId", protect, getCourseContent);
// Update course content
router.put("/:contentId", protect, upload.single("file"), updateCourseContent);

// Delete course content
router.delete("/:contentId", protect, deleteCourseContent);

module.exports = router;