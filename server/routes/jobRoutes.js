const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

// Public Job Search / Authenticated myJobs
router.get("/", (req, res, next) => {
  if (req.query.myJobs === "true" || req.query.myJobs === true || req.query.myJobs === "1") {
    return protect(req, res, () => jobController.getJobs(req, res, next));
  }
  return jobController.getJobs(req, res, next);
});
router.get("/:id", jobController.getJobById);

// Employer authenticated routes
router.use(protect);
router.use(requireEmployer);

router.post("/", jobController.createJob);
router.put("/:id", jobController.updateJob);
router.patch("/:id/status", jobController.updateJobStatus);
router.post("/:id/duplicate", jobController.duplicateJob);
router.delete("/:id", jobController.deleteJob);

module.exports = router;
