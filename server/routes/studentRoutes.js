const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const protect = require("../middleware/authMiddleware");
const courseController = require("../controllers/courseController");
const courseContentController = require("../controllers/courseContentController");

// All student routes require authentication
router.use(protect);

router.get("/dashboard", studentController.getStudentDashboard);
router.get("/profile", studentController.getStudentProfile);
router.put("/profile", studentController.updateStudentProfile);
router.post("/save", studentController.toggleSaveOpportunity);
router.post("/apply", studentController.applyOpportunity);

// Also alias /me for studentProfileService compatibility
router.get("/me", studentController.getStudentProfile);
router.put("/me", studentController.updateStudentProfile);

//student course routes
router.get("/courses", courseController.getStudentMyCourses);
router.get("/courses/:courseId/content",courseContentController.getStudentCourseContent);
router.patch("/courses/:courseId/content/:contentId/complete",courseContentController.markContentComplete);


module.exports = router;
