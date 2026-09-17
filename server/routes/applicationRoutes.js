// routes/applicationRoutes.js
const express = require("express");
const router = express.Router();

const applicationController = require("../controllers/applicationController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer: employerOnly } = require("../middleware/roleMiddleware");

// Safety: missing controller fn → clear error instead of crash
const ensureFn = (fn, name) => {
  if (typeof fn !== "function") {
    console.error(`❌ applicationController.${name} is not a function`);
    return (req, res) =>
      res.status(500).json({
        success: false,
        message: `Handler ${name} is not implemented`,
      });
  }
  return fn;
};

const {
  applyToInternship,
  applyToJob,
  getMyApplications,
  getMyAppliedIds,
  getEmployerApplications,
  getApplicationById,
  updateApplicationStatus,
  updateApplicationStage,
  addApplicationNote,
  withdrawApplication,
} = applicationController;

// ========== CANDIDATE ==========
router.post("/", protect, (_req, res) => res.status(405).json({
  success: false, message: "Use the job or internship application endpoint",
}));

router.post(
  "/internship/:internshipId",
  protect,
  ensureFn(applyToInternship, "applyToInternship")
);

router.post(
  "/job/:jobId",
  protect,
  ensureFn(applyToJob, "applyToJob")
);

router.get(
  "/me/applied-ids",
  protect,
  ensureFn(getMyAppliedIds, "getMyAppliedIds")
);

router.get(
  "/me",
  protect,
  ensureFn(getMyApplications, "getMyApplications")
);

router.patch(
  "/:id/withdraw",
  protect,
  ensureFn(withdrawApplication, "withdrawApplication")
);

// ========== EMPLOYER (static path BEFORE /:id) ==========
router.get(
  "/employer/list",
  protect,
  employerOnly,
  ensureFn(getEmployerApplications, "getEmployerApplications")
);

router.patch(
  "/:id/status",
  protect,
  employerOnly,
  ensureFn(updateApplicationStatus, "updateApplicationStatus")
);

router.patch(
  "/:id/stage",
  protect,
  employerOnly,
  ensureFn(updateApplicationStage, "updateApplicationStage")
);

router.post(
  "/:id/notes",
  protect,
  employerOnly,
  ensureFn(addApplicationNote, "addApplicationNote")
);

// ========== DETAIL ==========
router.get(
  "/:id",
  protect,
  ensureFn(getApplicationById, "getApplicationById")
);

module.exports = router;
