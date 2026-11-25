// Listing moderation: approve, reject, close, feature and status changes.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const Job = require("../../models/Job");
const Internship = require("../../models/Internship");
const AuditLog = require("../../models/AuditLog");
const { notifyListingDecision } = require("../../services/accountNotifications");
const { clearSearchCache } = require("../../services/jobScraperService");
const { notifyListingClosedInBackground } = require("../../services/listingClosure");

/**
 * POST /api/admin/opportunities/:type/:id/approve
 * Approves a pending opportunity and marks it Published (visible to candidates)
 */
exports.approveOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { adminNote = "" } = req.body || {};
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    // Scoped security check for COMPANY_ADMIN
    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only approve opportunities belonging to your company",
        });
      }
    }

    if (opp.status !== "Pending Approval") {
      return res.status(400).json({
        success: false,
        message: `Only listings waiting for approval can be approved (current status: ${opp.status}).`,
      });
    }

    opp.status = "Published";
    opp.closedReason = null;
    opp.approvedBy = req.user._id;
    opp.approvedAt = new Date();
    opp.approvalMethod = "admin";
    opp.rejectedBy = null;
    opp.rejectedAt = null;
    opp.rejectionReason = null;
    if (adminNote) opp.adminNote = adminNote.trim();

    await opp.save();
    // Student feeds are cached for 30 minutes; drop them so the change shows on the next load (JP-03).
    clearSearchCache();

    // Create Audit Log
    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "APPROVE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity approved and published. ${adminNote ? `Note: ${adminNote}` : ""}`.trim(),
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    // Tell the employer (in-app + email); never blocks the response
    notifyListingDecision({ listing: opp, decision: "approved" });

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" approved and published successfully.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/opportunities/:type/:id/reject
 * Rejects opportunity with required reason and optional admin note (does not delete)
 */
exports.rejectOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { rejectionReason, adminNote = "" } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid rejection reason is required.",
      });
    }

    const Model = type.toLowerCase() === "internship" ? Internship : Job;
    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only moderate opportunities belonging to your company",
        });
      }
    }

    opp.status = "Rejected";
    opp.rejectedBy = req.user._id;
    opp.rejectedAt = new Date();
    opp.rejectionReason = rejectionReason.trim();
    opp.adminNote = adminNote.trim();

    await opp.save();
    clearSearchCache();

    // Create Audit Log
    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "REJECT_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Rejected for reason: ${rejectionReason}. Note: ${adminNote}`.trim(),
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    // Tell the employer (in-app + email); never blocks the response
    notifyListingDecision({ listing: opp, decision: "rejected", reason: opp.rejectionReason || "" });

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" marked as Rejected.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/close
 * Closes opportunity (stops accepting new applications without deleting history)
 */
exports.closeOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only close opportunities belonging to your company",
        });
      }
    }

    const wasClosed = opp.status === "Closed";
    opp.status = "Closed";
    await opp.save();
    clearSearchCache();
    if (!wasClosed) notifyListingClosedInBackground(type.toLowerCase() === "internship" ? "internship" : "job", opp._id, { senderId: req.user._id });

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "CLOSE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: "Opportunity closed. No further applications accepted.",
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity "${opp.title}" has been closed.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/feature
 * Toggles isFeatured in MongoDB
 */
exports.featureOpportunity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { isFeatured } = req.body;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    opp.isFeatured = Boolean(isFeatured);
    await opp.save();

    try {
      await AuditLog.create({
        employerId: opp.employerId || null,
        companyId: opp.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: opp.isFeatured ? "FEATURE_OPPORTUNITY" : "UNFEATURE_OPPORTUNITY",
        module: "Opportunities",
        target: opp.title,
        details: `Opportunity ${opp.isFeatured ? "featured on candidate discovery" : "unfeatured"}.`,
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Opportunity ${opp.isFeatured ? "marked as Featured" : "unfeatured"} successfully.`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/status
 * General status update (kept for backward compatibility)
 */
exports.updateOpportunityStatus = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;
    const Model = type.toLowerCase() === "internship" ? Internship : Job;

    const opp = await Model.findById(id);
    if (!opp) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!opp.companyId || opp.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify opportunities belonging to your company",
        });
      }
    }

    const allowedStatuses = ["Draft", "Pending Approval", "Published", "Paused", "Closed", "Rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    // Moderation is platform-level: only a Super Admin can publish or reject a listing.
    if (req.user.role === "COMPANY_ADMIN" && ["Published", "Rejected"].includes(status)) {
      return res.status(403).json({
        success: false,
        message: "Only E2Job administrators can publish or reject listings.",
      });
    }

    opp.status = status;
    if (status !== "Closed") opp.closedReason = null;
    if (status === "Published") {
      opp.approvedBy = req.user._id;
      opp.approvedAt = new Date();
    } else if (status === "Rejected") {
      opp.rejectedBy = req.user._id;
      opp.rejectedAt = new Date();
    }
    await opp.save();
    clearSearchCache();

    return res.status(200).json({
      success: true,
      message: `Opportunity status updated to ${status}`,
      opportunity: opp,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 8. APPLICATION MANAGEMENT (SCOPED / GLOBAL)
// =========================================================================
