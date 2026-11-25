// Report actions: status, priority, notes, resolve and dismiss.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const Report = require("../../models/Report");
const AuditLog = require("../../models/AuditLog");
const Notification = require("../../models/Notification");

/**
 * PATCH /api/admin/reports/:id/status
 * Updates status (Open -> Investigating -> Resolved/Dismissed)
 */
exports.updateAdminReportStatus = async (req, res, next) => {
  try {
    const { status, resolutionNotes, adminNote } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only update reports belonging to your company",
        });
      }
    }

    const previousStatus = report.status;
    report.status = status;

    if (resolutionNotes) {
      report.resolutionNote = resolutionNotes;
      report.resolutionNotes = resolutionNotes;
    }

    if (status === "Resolved") {
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
    } else if (status === "Dismissed") {
      report.dismissedBy = req.user._id;
      report.dismissedAt = new Date();
    }

    if (adminNote && adminNote.trim()) {
      report.adminNotes.push({
        note: adminNote.trim(),
        authorId: req.user._id,
        authorName: req.user.fullName || "Admin",
        createdAt: new Date(),
      });
    }

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "UPDATE_REPORT_STATUS",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Status changed from ${previousStatus} to ${status}.`,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Report status updated to ${status}`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id/priority
 * Allows Super Admin to adjust severity / priority
 */
exports.updateAdminReportPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
      return res.status(400).json({ success: false, message: "Invalid priority level" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const previousPriority = report.priority;
    report.priority = priority;
    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "UPDATE_REPORT_PRIORITY",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Priority updated from ${previousPriority} to ${priority}.`,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Priority set to ${priority}`,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/notes
 * Adds an internal admin note without overwriting user complaint
 */
exports.addAdminReportNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: "Admin note content is required" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const newNote = {
      note: note.trim(),
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    };

    report.adminNotes.push(newNote);
    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "ADD_REPORT_NOTE",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Added internal administrative note.`,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Admin note added successfully",
      note: newNote,
      adminNotes: report.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/resolve
 * Resolves report with mandatory resolution note and notifies submitter
 */
exports.resolveAdminReport = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;
    if (!resolutionNote || !resolutionNote.trim()) {
      return res.status(400).json({
        success: false,
        message: "A resolution note detailing findings or corrective action is required.",
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    report.status = "Resolved";
    report.resolutionNote = resolutionNote.trim();
    report.resolutionNotes = resolutionNote.trim();
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();

    report.adminNotes.push({
      note: `Resolved: ${resolutionNote.trim()}`,
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    });

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "RESOLVE_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Report resolved: ${resolutionNote.trim()}`,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    if (report.reportedBy) {
      try {
        await Notification.create({
          recipient: report.reportedBy,
          recipientId: report.reportedBy,
          senderRole: "admin",
          sender: "E2Job Trust & Safety",
          title: "Your Report Has Been Resolved",
          preview: `Report #${report._id.toString().slice(-6)} has been reviewed and resolved.`,
          message: `Your report regarding "${report.title || report.category || "an issue"}" has been thoroughly investigated and resolved. Action note: ${resolutionNote.trim()}. Thank you for helping keep E2Job safe.`,
          category: "system_alert",
          notificationType: "GENERAL",
        });
      } catch (notifErr) {
        console.warn("[admin reports] notification failed:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Report marked as Resolved successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports/:id/dismiss
 * Dismisses report with mandatory reason and notifies submitter
 */
exports.dismissAdminReport = async (req, res, next) => {
  try {
    const { dismissalReason, adminNote = "" } = req.body;
    if (!dismissalReason || !dismissalReason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A dismissal reason (e.g. 'No violation found', 'Duplicate report') is required.",
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    report.status = "Dismissed";
    report.dismissalReason = dismissalReason.trim();
    report.dismissedBy = req.user._id;
    report.dismissedAt = new Date();

    const noteText = `Dismissed: ${dismissalReason.trim()}${adminNote ? ` (${adminNote.trim()})` : ""}`;
    report.adminNotes.push({
      note: noteText,
      authorId: req.user._id,
      authorName: req.user.fullName || "Admin",
      createdAt: new Date(),
    });

    await report.save();

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: "DISMISS_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: noteText,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    if (report.reportedBy) {
      try {
        await Notification.create({
          recipient: report.reportedBy,
          recipientId: report.reportedBy,
          senderRole: "admin",
          sender: "E2Job Trust & Safety",
          title: "Update on Your Submitted Report",
          preview: `Report #${report._id.toString().slice(-6)} has been reviewed.`,
          message: `Your report regarding "${report.title || report.category || "an issue"}" has been reviewed by moderation. It was closed with the following outcome: ${dismissalReason.trim()}.`,
          category: "system_alert",
          notificationType: "GENERAL",
        });
      } catch (notifErr) {
        console.warn("[admin reports] notification failed:", notifErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Report marked as Dismissed",
      report,
    });
  } catch (error) {
    next(error);
  }
};
