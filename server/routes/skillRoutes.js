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
// The catalog is shared by every user, so only admins may change it.
router.post("/", protect, requireRole("admin", "SUPER_ADMIN"), skillController.createSkill);
router.put("/:id", protect, requireRole("admin", "SUPER_ADMIN"), skillController.updateSkill);
router.delete("/:id", protect, requireRole("admin", "SUPER_ADMIN"), skillController.deleteSkill);

module.exports = router;
