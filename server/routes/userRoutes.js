const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

// Protected profile management routes
router.get("/me", protect, userController.getCurrentUser);
router.get("/profile", protect, userController.getCurrentUser);
router.put("/profile", protect, userController.updateProfile);

// Career goals
router.get("/career-goals", protect, userController.getCareerGoals);
router.post("/career-goals", protect, userController.setCareerGoal);

// Public / Protected user lookup
router.get("/:id", protect, userController.getUserById);

module.exports = router;
