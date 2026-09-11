const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const {
  adminLogin,
  adminLogout,
  getAdminDashboard,
  searchAdmin,
  getAdminNotifications,
  getAdminStudents,
  updateStudentStatus,
  getAdminEmployers,
  updateEmployerStatus,
  getAdminOpportunities,
  updateOpportunityStatus,
  getAdminApplications,
  updateApplicationStatus,
  getAdminReports,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminController");

// ===================================================
// PUBLIC ADMIN AUTHENTICATION
// ===================================================
// POST /api/admin/login — Dedicated Admin Login (strictly requires role: 'admin')
router.post("/login", loginLimiter, sanitizeInputs, adminLogin);

// POST /api/admin/logout — Clears admin session and cookies
router.post("/logout", adminLogout);

// ===================================================
// PROTECTED ADMIN ENDPOINTS (Strictly requires role: 'admin')
// ===================================================
router.use(protect, requireAdmin);

// Page 24: Admin Dashboard & Telemetry
router.get("/dashboard", getAdminDashboard);
router.get("/search", searchAdmin);
router.get("/notifications", getAdminNotifications);

// Page 25: Student Management
router.get("/students", getAdminStudents);
router.patch("/students/:id/status", updateStudentStatus);

// Page 26: Employer Management
router.get("/employers", getAdminEmployers);
router.patch("/employers/:id/status", updateEmployerStatus);

// Page 27: Opportunity Management (Jobs & Internships)
router.get("/opportunities", getAdminOpportunities);
router.patch("/opportunities/:type/:id/status", updateOpportunityStatus);

// Page 28: Application Management
router.get("/applications", getAdminApplications);
router.patch("/applications/:id/status", updateApplicationStatus);

// Page 29: Reports
router.get("/reports", getAdminReports);

// Page 30: Settings
router.get("/settings", getAdminSettings);
router.put("/settings", updateAdminSettings);

module.exports = router;
