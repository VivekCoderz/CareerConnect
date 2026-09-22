const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const protect = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

<<<<<<< HEAD
// Public Job Search / Authenticated myJobs
router.get("/", (req, res, next) => {
  if (req.query.myJobs === "true" || req.query.myJobs === true || req.query.myJobs === "1") {
    return protect(req, res, () => jobController.getJobs(req, res, next));
  }
  return jobController.getJobs(req, res, next);
});
router.get("/:id", jobController.getJobById);
=======
// Public Job Search
router.get("/", optionalAuth, jobController.getJobs);
router.get("/:id", optionalAuth, jobController.getJobById);
>>>>>>> f60867c15d511c34986d3dc19cb080813fa799e7

// Employer authenticated routes
router.use(protect);
router.use(requireEmployer);

router.post("/", jobController.createJob);
router.put("/:id", jobController.updateJob);
router.patch("/:id/status", jobController.updateJobStatus);
router.post("/:id/duplicate", jobController.duplicateJob);
router.delete("/:id", jobController.deleteJob);

module.exports = router;
