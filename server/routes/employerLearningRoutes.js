const express = require("express");
const router = express.Router();
const learningController = require("../controllers/employerLearningController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.get("/courses", learningController.getCourseCatalog);
router.get("/my-learning", learningController.getMyLearning);
router.post("/enroll", learningController.enrollInCourse);
router.patch("/progress/:enrollmentId", learningController.updateProgress);
router.get("/certificates", learningController.getMyCertificates);
router.get("/skill-development", learningController.getSkillDevelopment);

module.exports = router;
