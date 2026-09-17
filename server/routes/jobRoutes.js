const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

// Public Job Search
router.get("/", optionalAuth, jobController.getJobs);
router.get("/:id", optionalAuth, jobController.getJobById);

// Employer authenticated routes
router.use(protect);
router.use(requireEmployer);

router.post("/", jobController.createJob);
router.put("/:id", jobController.updateJob);
router.patch("/:id/status", jobController.updateJobStatus);
router.post("/:id/duplicate", jobController.duplicateJob);
router.delete("/:id", jobController.deleteJob);

module.exports = router;
