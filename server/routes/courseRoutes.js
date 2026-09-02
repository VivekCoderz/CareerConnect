
const express = require("express");

const {
  createCourse,
  getMyCourses,
  updateCourse,
  deleteCourse,
  updateCourseStatus,
  getRecommendedCourses,
  getCourseDetails,
  applyCourse,
  getCourseApplications,
  updateCourseApplicationStatus,
  getStudentMyCourses
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

// ==========================================
// STUDENT COURSE ROUTES
// ==========================================

// Recommended courses for logged-in student
router.get("/recommended", protect, getRecommendedCourses);

// ==========================================
// COURSE APPLICATION ROUTES
// ==========================================

// Employer can view applications for own course
// GET /api/courses/:courseId/applications
router.get("/:courseId/applications",protect, getCourseApplications);

// Employer can approve / reject application
// PATCH /api/courses/:courseId/applications/:applicationId/status
router.patch("/:courseId/applications/:applicationId/status",protect,updateCourseApplicationStatus);

// Student can apply for a course
// POST /api/courses/:id/apply
router.post("/:id/apply", protect, applyCourse);

// Get course details using id
router.get("/:id", protect, getCourseDetails);



// Update Course
router.put("/:id", protect, updateCourse);

// Delete Course
router.delete("/:id", protect, deleteCourse);

// Update the status of the course
router.patch("/:id/status", protect, updateCourseStatus);



module.exports = router;

