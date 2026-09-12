
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
  enrollFreeCourse,
  getCourseApplications,
  updateCourseApplicationStatus,
  getEmployerAllApplications,
  getStudentMyCourses,
  getAllPublishedCourses,
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

// Get ALL applications across ALL courses created by logged-in employer
// GET /api/courses/my-applications
// SECURITY: Backend verifies course.createdBy === req.user._id
router.get("/my-applications", protect, getEmployerAllApplications);

// ==========================================
// STUDENT COURSE ROUTES
// ==========================================

// Recommended courses for logged-in student
router.get("/recommended", protect, getRecommendedCourses);

// All published courses catalog for students ("All Courses" tab)
// GET /api/courses
router.get("/", protect, getAllPublishedCourses);

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

// Student can directly enroll in a FREE course
router.post("/:id/enroll", protect, enrollFreeCourse);

// Get course details using id
router.get("/:id", protect, getCourseDetails);



// Update Course
router.put("/:id", protect, updateCourse);

// Delete Course
router.delete("/:id", protect, deleteCourse);

// Update the status of the course
router.patch("/:id/status", protect, updateCourseStatus);



module.exports = router;

