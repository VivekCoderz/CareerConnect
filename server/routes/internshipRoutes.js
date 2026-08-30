const express = require("express");
const router = express.Router();
const {
  createInternship,
  getInternships,
  getInternshipById,
  updateInternship,
  updateInternshipStatus,
  deleteInternship,
  syncFromExternalAPIs,
} = require("../controllers/internshipController");

const protect = require("../middleware/authMiddleware");
const { requireEmployer: employerOnly } = require("../middleware/roleMiddleware");

router.get("/", (req, res, next) => {
  if (req.query.myPosts === "true") {
    return protect(req, res, () => getInternships(req, res, next));
  }
  return getInternships(req, res, next);
});



router.post("/sync/external", protect, employerOnly, syncFromExternalAPIs);
router.post("/", protect, employerOnly, createInternship);
router.get("/:id", getInternshipById);
router.put("/:id", protect, employerOnly, updateInternship);
router.patch("/:id/status", protect, employerOnly, updateInternshipStatus);
router.delete("/:id", protect, employerOnly, deleteInternship);

module.exports = router;