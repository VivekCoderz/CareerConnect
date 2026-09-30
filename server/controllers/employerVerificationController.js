const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const EmployerProfile = require("../models/EmployerProfile");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const User = require("../models/User");
const { escapeRegex } = require("../utils/listingSecurity");

// Profiles created before verification existed have no verificationStatus; they count as pending.
const STATUS_FILTERS = {
  pending: { verificationStatus: { $nin: ["approved", "rejected"] } },
  approved: { verificationStatus: "approved" },
  verified: { verificationStatus: "approved" },
  rejected: { verificationStatus: "rejected" },
};

const countByCreator = async (Model, userIds) => {
  const rows = await Model.aggregate([
    { $match: { createdBy: { $in: userIds } } },
    { $group: { _id: "$createdBy", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

/**
 * GET /api/admin/employers?status=all|pending|approved|rejected&search=&page=&limit=
 * Employer profiles with their verification status. COMPANY_ADMIN sees only their company.
 */
exports.listEmployers = async (req, res, next) => {
  try {
    const { status = "all", search = "", page = 1, limit = 12 } = req.query;
    const scope = {};
    if (req.user.role === "COMPANY_ADMIN") {
      scope.userId = { $in: await User.find({ companyId: req.user.companyId }).distinct("_id") };
    }

    const query = { ...scope, ...(STATUS_FILTERS[status] || {}) };
    if (String(search).trim()) {
      const pattern = { $regex: escapeRegex(String(search).trim()), $options: "i" };
      query.$or = [{ companyName: pattern }, { officialEmail: pattern }];
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const parsedPage = Math.max(Number(page) || 1, 1);

    const [profiles, total, approved, rejected, all] = await Promise.all([
      EmployerProfile.find(query)
        .populate("userId", "fullName email isActive")
        .populate("verifiedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      EmployerProfile.countDocuments(query),
      EmployerProfile.countDocuments({ ...scope, ...STATUS_FILTERS.approved }),
      EmployerProfile.countDocuments({ ...scope, ...STATUS_FILTERS.rejected }),
      EmployerProfile.countDocuments(scope),
    ]);

    const userIds = profiles.map((p) => p.userId?._id).filter(Boolean);
    const [jobCounts, internshipCounts] = await Promise.all([
      countByCreator(Job, userIds),
      countByCreator(Internship, userIds),
    ]);

    const employers = profiles.map((profile) => {
      const ownerId = String(profile.userId?._id || "");
      const postedJobsCount = jobCounts.get(ownerId) || 0;
      const postedInternshipsCount = internshipCounts.get(ownerId) || 0;
      return {
        ...profile,
        verificationStatus: profile.verificationStatus || "pending",
        postedJobsCount,
        postedInternshipsCount,
        totalOpportunities: postedJobsCount + postedInternshipsCount,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        employers,
        stats: { total: all, verified: approved, rejected, pending: all - approved - rejected },
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          pages: Math.ceil(total / parsedLimit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/employers/:id/verification { status: "approved" | "rejected", reason? }
 * :id is the EmployerProfile id. Platform admins only (requireSuperAdmin on the route).
 */
exports.setEmployerVerification = async (req, res, next) => {
  try {
    const { status, reason } = req.body || {};
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be "approved" or "rejected"' });
    }
    if (reason !== undefined && reason !== null && typeof reason !== "string") {
      return res.status(400).json({ success: false, message: "reason must be a string" });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }

    const profile = await EmployerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }

    const trimmedReason = (reason || "").trim().slice(0, 1000);
    profile.verificationStatus = status;
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = status === "approved" ? new Date() : null;
    profile.rejectionReason = status === "rejected" ? trimmedReason || null : null;
    await profile.save();

    try {
      await AuditLog.create({
        employerId: profile._id,
        actorId: req.user._id,
        actorName: req.user.fullName || "Admin",
        actorEmail: req.user.email || "",
        action: status === "approved" ? "APPROVE_EMPLOYER" : "REJECT_EMPLOYER",
        module: "Employers",
        target: profile.companyName,
        details: trimmedReason ? `Reason: ${trimmedReason}` : "",
      });
    } catch (logErr) {
      console.warn("Audit log creation warning:", logErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Employer "${profile.companyName}" ${status}`,
      employer: {
        _id: profile._id,
        userId: profile.userId,
        companyName: profile.companyName,
        verificationStatus: profile.verificationStatus,
        verifiedBy: profile.verifiedBy,
        verifiedAt: profile.verifiedAt,
        rejectionReason: profile.rejectionReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
