const express = require("express");
const router = express.Router();
const skillController = require("../controllers/skillController");
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

// Public / Authenticated skill discovery routes
router.get("/", skillController.getSkills);
router.get("/trending", skillController.getTrendingSkills);
router.get("/:id", skillController.getSkillById);

// Protected routes (Admin / Authorized)
router.post("/", protect, skillController.createSkill);
router.put("/:id", protect, skillController.updateSkill);
router.delete("/:id", protect, requireRole("admin"), skillController.deleteSkill);

module.exports = router;
