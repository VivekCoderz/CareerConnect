// Platform settings and the external job feed sync.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const Company = require("../../models/Company");
const { getPlatformSettings, updatePlatformSettings, validateSettingsUpdate } = require("../../services/platformSettings");
const AuditLog = require("../../models/AuditLog");
const { runExternalJobSync } = require("../../services/externalJobSync");

/**
 * GET /api/admin/settings
 */
exports.getAdminSettings = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);

    if (isSuperAdmin) {
      return res.status(200).json({
        success: true,
        scope: "GLOBAL",
        settings: await getPlatformSettings({ fresh: true }),
      });
    }

    // COMPANY_ADMIN: Return assigned company settings
    const company = await Company.findById(req.user.companyId).select("name settings");
    return res.status(200).json({
      success: true,
      scope: "TENANT",
      companyName: company?.name,
      settings: company?.settings || {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings (platform admins only; enforced by requireSuperAdmin on the route)
 */
exports.updateAdminSettings = async (req, res, next) => {
  try {
    const invalid = validateSettingsUpdate(req.body);
    if (invalid) {
      return res.status(400).json({ success: false, message: invalid });
    }

    const settings = await updatePlatformSettings(req.body);

    try {
      await AuditLog.create({
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "UPDATE_PLATFORM_SETTINGS",
        module: "Settings",
        target: "Platform settings",
        details: `Updated: ${Object.keys(req.body).filter((key) => key in settings).join(", ") || "nothing"}`,
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Global platform settings updated successfully",
      settings,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 11. SEARCH & NOTIFICATIONS
// =========================================================================

// ===================================================
// EXTERNAL JOB FEED SYNC (SUPER_ADMIN)
// POST /api/admin/jobs/sync
// Runs the same sync as the schedule; feed failures are reported per source, not thrown.
// ===================================================
exports.syncExternalJobs = async (req, res, next) => {
  try {
    const result = await runExternalJobSync();
    return res.status(200).json({ success: true, message: "External job feeds synced", ...result });
  } catch (error) {
    next(error);
  }
};
