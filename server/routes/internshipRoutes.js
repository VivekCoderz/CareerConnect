// server/routes/internshipRoutes.js
const express = require("express");
const router = express.Router();
const internshipController = require("../controllers/internshipController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer: employerOnly } = require("../middleware/roleMiddleware");

// Category metadata & aggregated counts
router.get("/categories", internshipController.getInternshipCategories);

// Category shortcut routes
router.get("/work-from-home", (req, res, next) => {
  req.query.workMode = "Remote";
  return internshipController.getInternships(req, res, next);
});

router.get("/international", (req, res, next) => {
  req.query.isInternational = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/latest", (req, res, next) => {
  req.query.sort = "latest";
  return internshipController.getInternships(req, res, next);
});

router.get("/paid", (req, res, next) => {
  req.query.isPaid = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/with-job-offer", (req, res, next) => {
  req.query.hasJobOffer = "true";
  return internshipController.getInternships(req, res, next);
});

router.get("/in/:city", (req, res, next) => {
  req.query.city = req.params.city;
  return internshipController.getInternships(req, res, next);
});

router.get("/category/:category", (req, res, next) => {
  req.query.category = req.params.category;
  return internshipController.getInternships(req, res, next);
});

// Sync external API jobs
router.post("/sync/external", protect, employerOnly, internshipController.syncFromExternalAPIs);

// Employer create internship
router.post("/", protect, employerOnly, internshipController.createInternship);

// General filterable catalog / myPosts
router.get("/", (req, res, next) => {
  if (req.query.myPosts === "true") {
    return protect(req, res, () => internshipController.getInternships(req, res, next));
  }
  return internshipController.getInternships(req, res, next);
});

// Single internship details
router.get("/:id", internshipController.getInternshipById);

// Employer update/delete operations
router.put("/:id", protect, employerOnly, internshipController.updateInternship);
router.patch("/:id/status", protect, employerOnly, internshipController.updateInternshipStatus);
router.delete("/:id", protect, employerOnly, internshipController.deleteInternship);

module.exports = router;
