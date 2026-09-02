// server/routes/employerRoutes.js
const express = require("express");
const router = express.Router();
const employerController = require("../controllers/employerController");
const protect = require("../middleware/authMiddleware");
const { requireEmployer } = require("../middleware/roleMiddleware");

// Public route for candidate/student company view
router.get("/companies/:companyId", employerController.getPublicCompanyProfile);

// Authenticated employer profile routes
router.use(protect);
router.use(requireEmployer);

router.get("/profile", employerController.getEmployerProfile);
router.post("/profile", employerController.updateEmployerProfile);
router.put("/profile", employerController.updateEmployerProfile);
router.patch("/profile", employerController.updateEmployerProfile);
router.post("/profile/draft", employerController.saveDraftEmployerProfile);
router.post("/profile/publish", employerController.publishEmployerProfile);
router.post("/profile/unpublish", employerController.unpublishEmployerProfile);
router.get("/dashboard", employerController.getEmployerDashboard);
router.delete("/profile", employerController.deleteEmployerProfile);

module.exports = router;
