const express = require("express");

const {
  createCourse,
  getMyCourses,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
} = require("../controllers/courseController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// EMPLOYER COURSE ROUTES
// ==========================================

// Create a new course
// POST /api/courses
router.post("/", protect, createCourse);

// Get courses created by logged-in employer
// GET /api/courses/my-courses
router.get("/my-courses", protect, getMyCourses);

// Update Course
router.put("/:id", protect, updateCourse);

// Delete Course
router.delete("/:id", protect, deleteCourse);

//update the status of the course
router.patch("/:id/status", protect, updateCourseStatus);

module.exports = router;
