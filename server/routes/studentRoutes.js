const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const protect = require("../middleware/authMiddleware");

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

module.exports = router;
