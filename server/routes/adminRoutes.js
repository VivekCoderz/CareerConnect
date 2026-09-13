const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  requireAdmin,
  requireSuperAdmin,
  requireCompanyAdmin,
  scopeToCompany,
} = require("../middleware/roleMiddleware");
const { loginLimiter } = require("../middleware/rateLimitMiddleware");
const { sanitizeInputs } = require("../middleware/validationMiddleware");
const {
  adminLogin,
  adminLogout,
  getAdminMe,
  getAdminDashboard,
  searchAdmin,
  getAdminNotifications,
  // Companies (SUPER_ADMIN)
  getAdminCompanies,
  createAdminCompany,
  getAdminCompanyById,
  updateAdminCompany,
  updateAdminCompanyStatus,
  deleteAdminCompany,
  // Company Admins (SUPER_ADMIN)
  getCompanyAdmins,
  createCompanyAdmin,
  updateCompanyAdmin,
  updateCompanyAdminStatus,
  // Own Company (COMPANY_ADMIN)
  getOwnCompany,
  updateOwnCompany,
  // Users
  getAdminUsers,
  updateUserStatus,
  getAdminStudents,
  updateStudentStatus,
  getAdminEmployers,
  updateEmployerStatus,
  // Opportunities
  getAdminOpportunities,
  updateOpportunityStatus,
  // Applications
  getAdminApplications,
  updateApplicationStatus,
  // Reports
  getAdminReports,
  createAdminReport,
  updateAdminReportStatus,
  // Settings
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/adminController");

// ===================================================
// PUBLIC ADMIN AUTHENTICATION
// ===================================================
// POST /api/admin/login — Dedicated Admin Login (strictly SUPER_ADMIN or COMPANY_ADMIN)
router.post("/login", loginLimiter, sanitizeInputs, adminLogin);

// POST /api/admin/logout — Clears admin session and cookies
router.post("/logout", adminLogout);

// ===================================================
// PROTECTED ADMIN ENDPOINTS (Requires valid Admin)
// ===================================================
router.use(protect, requireAdmin);

// Current admin identity & permissions
router.get("/me", getAdminMe);

// Role-Aware Dynamic Dashboard
router.get("/dashboard", getAdminDashboard);
router.get("/search", searchAdmin);
router.get("/notifications", getAdminNotifications);

// ===================================================
// SUPER_ADMIN ONLY ENDPOINTS
// ===================================================
router.get("/companies", requireSuperAdmin, getAdminCompanies);
router.post("/companies", requireSuperAdmin, sanitizeInputs, createAdminCompany);
router.get("/companies/:id", requireSuperAdmin, getAdminCompanyById);
router.put("/companies/:id", requireSuperAdmin, sanitizeInputs, updateAdminCompany);
router.patch("/companies/:id/status", requireSuperAdmin, updateAdminCompanyStatus);
router.delete("/companies/:id", requireSuperAdmin, deleteAdminCompany);

router.get("/company-admins", requireSuperAdmin, getCompanyAdmins);
router.post("/company-admins", requireSuperAdmin, sanitizeInputs, createCompanyAdmin);
router.put("/company-admins/:id", requireSuperAdmin, sanitizeInputs, updateCompanyAdmin);
router.patch("/company-admins/:id/status", requireSuperAdmin, updateCompanyAdminStatus);

// ===================================================
// COMPANY_ADMIN ONLY ENDPOINTS (Own Company)
// ===================================================
router.get("/company", requireCompanyAdmin, getOwnCompany);
router.put("/company", requireCompanyAdmin, sanitizeInputs, updateOwnCompany);

// ===================================================
// TENANT-SCOPED & ROLE-SCOPED RESOURCE ENDPOINTS
// ===================================================
router.use(scopeToCompany);

// User Management
router.get("/users", getAdminUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/students", getAdminStudents);
router.patch("/students/:id/status", updateStudentStatus);
router.get("/employers", getAdminEmployers);
router.patch("/employers/:id/status", updateEmployerStatus);

// Opportunity Management (Jobs & Internships)
router.get("/opportunities", getAdminOpportunities);
router.patch("/opportunities/:type/:id/status", updateOpportunityStatus);

// Application Management
router.get("/applications", getAdminApplications);
router.patch("/applications/:id/status", updateApplicationStatus);

// Reports Management
router.get("/reports", getAdminReports);
router.post("/reports", sanitizeInputs, createAdminReport);
router.patch("/reports/:id/status", updateAdminReportStatus);

// Settings Management
router.get("/settings", getAdminSettings);
router.put("/settings", updateAdminSettings);

module.exports = router;
