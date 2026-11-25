// Applications across companies (admin view) and their status.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const mongoose = require("mongoose");
const Application = require("../../models/Application");
const { checkTransition, normalizeStatus } = require("../../utils/applicationStatus");
const { notifyApplicationUpdates } = require("../../services/applicationNotifications");

/**
 * GET /api/admin/applications
 */
exports.getAdminApplications = async (req, res, next) => {
  try {
    const { status = "all", type = "all", page = 1, limit = 15 } = req.query;
    const filter = {};

    // Strict Scope: Company Admins only see applications for their company
    if (req.user.role === "COMPANY_ADMIN") {
      filter.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (type === "Job" || type === "Internship") {
      filter.opportunityType = type;
    }
    // Stage cards count the whole scope, not just the selected stage. aggregate() does not
    // cast ids the way find() does.
    const scope = { ...filter };
    if (scope.companyId && mongoose.isValidObjectId(scope.companyId)) {
      scope.companyId = new mongoose.Types.ObjectId(String(scope.companyId));
    }

    if (status !== "all") {
      filter.status = String(status);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total, byStatus] = await Promise.all([
      Application.find(filter)
        .populate("candidateId", "fullName email profileImage phone city")
        .populate("companyId", "name logo")
        .populate("employerId", "companyName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments(filter),
      Application.aggregate([{ $match: scope }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const counts = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
    const sum = (...names) => names.reduce((acc, name) => acc + (counts[name] || 0), 0);
    const stats = {
      total: byStatus.reduce((acc, row) => acc + row.count, 0),
      applied: sum("Applied"),
      reviewing: sum("Under Review", "In Progress", "Assessment", "Approved"),
      shortlisted: sum("Shortlisted"),
      interview: sum("Interview", "Interview Scheduled", "Interview Completed"),
      hired: sum("Hired", "Selected", "Offer", "Offered"),
      rejected: sum("Rejected"),
    };
    const pagination = { page: Number(page), limit: Number(limit), total, pages: Math.max(1, Math.ceil(total / Number(limit))) };

    return res.status(200).json({
      success: true,
      applications,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      // Shape the admin Applications page reads.
      data: { applications, stats, pagination },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/applications/:id/status
 */
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Company Admin access control: must belong to their assigned company
    if (req.user.role === "COMPANY_ADMIN") {
      if (!application.companyId || application.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only modify applications belonging to your company",
        });
      }
    }

    // Same transition rules as the employer endpoints; admins may also withdraw, and pass
    // { reopen: true } to bring a rejected application back to Under Review.
    const problem = typeof status === "string"
      ? checkTransition(application.status, status, { actor: "admin", reopen: req.body.reopen === true })
      : "Invalid application status";
    if (problem) {
      return res.status(409).json({ success: false, code: "INVALID_STATUS_TRANSITION", message: problem });
    }

    const previousStatus = application.status;
    application.status = normalizeStatus(status);
    await application.save();
    if (previousStatus !== application.status) {
      await notifyApplicationUpdates([application.toObject()], application.status, { senderId: req.user._id })
        .catch((err) => console.warn("Application notification failed:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 9. REPORTS & TRUST MODERATION (SCOPED / GLOBAL DYNAMIC SYSTEM)
// =========================================================================
