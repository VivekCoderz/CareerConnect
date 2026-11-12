const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const protect = require("../middleware/authMiddleware");
const { requireCandidate, requireUserType } = require("../middleware/roleMiddleware");
const courseController = require("../controllers/courseController");
const courseContentController = require("../controllers/courseContentController");

// All student routes require an authenticated candidate (not employers or admins)
router.use(protect, requireCandidate());

// The student profile and dashboard are for students only: a user has one candidate
// profile, of their own userType (freshers and professionals have /api/fresher and
// /api/professional). The course routes below stay open to every candidate.
const studentOnly = requireUserType("student");

router.get("/dashboard", studentOnly, studentController.getStudentDashboard);
router.get("/profile", studentOnly, studentController.getStudentProfile);
router.put("/profile", studentOnly, studentController.updateStudentProfile);
router.post("/save", studentController.toggleSaveOpportunity);
// Retired duplicate apply path: responds 410 pointing at /api/applications/...
router.post("/apply", studentController.applyOpportunity);

// Also alias /me for studentProfileService compatibility
router.get("/me", studentOnly, studentController.getStudentProfile);
router.put("/me", studentOnly, studentController.updateStudentProfile);

//student course routes
router.get("/courses", courseController.getStudentMyCourses);
router.get("/courses/:courseId/content",courseContentController.getStudentCourseContent);
router.patch("/courses/:courseId/content/:contentId/complete",courseContentController.markContentComplete);


module.exports = router;
