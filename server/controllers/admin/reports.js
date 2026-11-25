// Reports: list, detail and create.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const mongoose = require("mongoose");
const Report = require("../../models/Report");
const AuditLog = require("../../models/AuditLog");

/**
 * GET /api/admin/reports
 * Rich server-side filtering, dynamic summary KPIs, repeat-target clustering, attention alerts, and audit feed
 */
exports.getAdminReports = async (req, res, next) => {
  try {
    const {
      status = "all",
      category = "all",
      type = "all",
      priority = "all",
      companyId = "",
      search = "",
      dateRange = "all",
      startDate = "",
      endDate = "",
      page = 1,
      limit = 12,
    } = req.query;

    const isCompanyAdmin = req.user.role === "COMPANY_ADMIN";
    const effectiveCompanyId = isCompanyAdmin ? req.user.companyId : companyId;

    // 1. BASE FILTER FOR STATS
    const statsFilter = {};
    if (effectiveCompanyId) {
      statsFilter.companyId = effectiveCompanyId;
    }

    const [totalReports, openReports, investigatingReports, resolvedReports, dismissedReports, criticalReports] =
      await Promise.all([
        Report.countDocuments(statsFilter),
        Report.countDocuments({ ...statsFilter, status: "Open" }),
        Report.countDocuments({ ...statsFilter, status: { $in: ["Investigating", "Under Review"] } }),
        Report.countDocuments({ ...statsFilter, status: "Resolved" }),
        Report.countDocuments({ ...statsFilter, status: "Dismissed" }),
        Report.countDocuments({ ...statsFilter, priority: "Critical", status: { $in: ["Open", "Investigating", "Under Review"] } }),
      ]);

    const stats = {
      total: totalReports,
      open: openReports,
      investigating: investigatingReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
      critical: criticalReports,
    };

    // 2. QUERY FILTER FOR LISTINGS
    const filter = {};
    if (effectiveCompanyId) {
      filter.companyId = effectiveCompanyId;
    }

    // Status filter
    if (status && status !== "all") {
      if (status.toLowerCase() === "investigating" || status.toLowerCase() === "under review") {
        filter.status = { $in: ["Investigating", "Under Review"] };
      } else {
        filter.status = status;
      }
    }

    // Category / ReportType filter
    const cat = category !== "all" ? category : type !== "all" ? type : "";
    if (cat) {
      filter.$or = filter.$or || [];
      filter.$or.push({ category: cat }, { reportType: cat });
    }

    // Priority filter
    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    // Date filtering
    const now = new Date();
    if (dateRange === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: startOfDay };
    } else if (dateRange === "7d") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: past7 };
    } else if (dateRange === "30d") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: past30 };
    } else if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = eDate;
      }
    }

    // Server-side Search
    if (search && search.trim()) {
      const s = search.trim();
      const searchConditions = [
        { details: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
        { category: { $regex: s, $options: "i" } },
        { reportType: { $regex: s, $options: "i" } },
        { targetTitle: { $regex: s, $options: "i" } },
        { reportedByName: { $regex: s, $options: "i" } },
      ];

      if (mongoose.Types.ObjectId.isValid(s)) {
        searchConditions.push({ _id: new mongoose.Types.ObjectId(s) });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 12);
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("companyId", "name logo status isVerified industry")
        .populate("reportedBy", "fullName email role userType phone profileImage")
        .populate("opportunityId", "title companyName workMode location status deadline openings")
        .populate("applicationId", "opportunityTitle status createdAt studentName studentEmail")
        .populate("interviewId", "title roundName interviewType status date time roundNumber")
        .populate("reportedUserId", "fullName email role userType phone profileImage")
        .populate("resolvedBy", "fullName email")
        .populate("dismissedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Report.countDocuments(filter),
    ]);

    // 3. MULTI-TARGET DETECTION (Detect repeat reports on same Opportunity/Company)
    const targetIds = reports
      .map((r) => r.opportunityId?._id || r.targetId || r.companyId?._id)
      .filter(Boolean);

    let repeatCountMap = {};
    if (targetIds.length > 0) {
      const repeatCounts = await Report.aggregate([
        {
          $match: {
            $or: [
              { opportunityId: { $in: targetIds } },
              { targetId: { $in: targetIds } },
              { companyId: { $in: targetIds } },
            ],
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$opportunityId", { $ifNull: ["$targetId", "$companyId"] }] },
            count: { $sum: 1 },
          },
        },
      ]);
      repeatCounts.forEach((rc) => {
        if (rc._id) repeatCountMap[rc._id.toString()] = rc.count;
      });
    }

    const enhancedReports = reports.map((r) => {
      const tId = (r.opportunityId?._id || r.targetId || r.companyId?._id)?.toString();
      const repeatCount = tId ? repeatCountMap[tId] || 1 : 1;
      return {
        ...r,
        repeatCount,
        hasRepeatAlert: repeatCount > 1,
      };
    });

    // 4. REQUIRES ATTENTION ALERTS (Real MongoDB issues only)
    const attentionItems = [];
    if (criticalReports > 0) {
      attentionItems.push({
        id: "critical-reports",
        severity: "danger",
        title: `${criticalReports} Critical Priority Reports`,
        description: "Severe reports involving safety, fraud, or acute policy violations requiring urgent review.",
        actionFilter: "Open",
      });
    }

    const openFraudCount = await Report.countDocuments({
      ...statsFilter,
      $or: [{ category: "Spam / Fraud" }, { reportType: { $regex: "fraud|fake|scam", $options: "i" } }],
      status: { $in: ["Open", "Investigating"] },
    });
    if (openFraudCount > 0) {
      attentionItems.push({
        id: "fraud-complaints",
        severity: "danger",
        title: `${openFraudCount} Unresolved Fraud / Scam Complaints`,
        description: "Reports flagged for deceptive listings or impersonation on the platform.",
        actionFilter: "Open",
      });
    }

    // Targets with repeat complaints
    const multiReportTargets = await Report.aggregate([
      { $match: { ...statsFilter, status: { $in: ["Open", "Investigating"] } } },
      {
        $group: {
          _id: { $ifNull: ["$opportunityId", { $ifNull: ["$targetId", "$companyId"] }] },
          count: { $sum: 1 },
          title: { $first: { $ifNull: ["$targetTitle", "$title"] } },
        },
      },
      { $match: { count: { $gte: 2 }, _id: { $ne: null } } },
      { $limit: 3 },
    ]);

    if (multiReportTargets.length > 0) {
      multiReportTargets.forEach((mrt) => {
        attentionItems.push({
          id: `repeat-target-${mrt._id}`,
          severity: "warning",
          title: `${mrt.count} Repeated Reports Filed on Same Entity`,
          description: `Multiple candidates or users filed separate complaints regarding "${mrt.title || "Target Entity"}".`,
          actionFilter: "Open",
        });
      });
    }

    // 5. RECENT MODERATION ACTIVITY
    const recentActivity = await AuditLog.find({ module: "Reports" })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        reports: enhancedReports,
        stats,
        attention: attentionItems,
        recentActivity: (recentActivity || []).map((a) => ({
          _id: a._id,
          action: a.action,
          target: a.target,
          details: a.details,
          actorName: a.actorName,
          createdAt: a.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
      reports: enhancedReports,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    console.error("getAdminReports error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/reports/:id
 * Deep detailed report record with full related entities and repeat history
 */
exports.getAdminReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("companyId", "name logo status isVerified location industry website email phone")
      .populate("reportedBy", "fullName email role userType phone profileImage createdAt")
      .populate("opportunityId", "title companyName workMode location status deadline openings category description")
      .populate("applicationId", "opportunityTitle status createdAt studentName studentEmail resumeUrl coverNote")
      .populate("interviewId", "title roundName interviewType status date time roundNumber meetingLink")
      .populate("reportedUserId", "fullName email role userType phone profileImage createdAt")
      .populate("resolvedBy", "fullName email")
      .populate("dismissedBy", "fullName email")
      .populate("adminNotes.authorId", "fullName email");

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (req.user.role === "COMPANY_ADMIN") {
      if (!report.companyId || report.companyId._id.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: This report does not belong to your company",
        });
      }
    }

    const targetRef = report.opportunityId?._id || report.targetId || report.companyId?._id;
    let relatedReports = [];
    if (targetRef) {
      relatedReports = await Report.find({
        _id: { $ne: report._id },
        $or: [{ opportunityId: targetRef }, { targetId: targetRef }, { companyId: targetRef }],
      })
        .select("category reportType details status priority createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    return res.status(200).json({
      success: true,
      report,
      relatedReports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/reports
 * Create report with rich categories and entity connections
 */
exports.createAdminReport = async (req, res, next) => {
  try {
    const {
      category = "Opportunity",
      reportType,
      title = "",
      details,
      description = "",
      priority = "Medium",
      companyId,
      opportunityId,
      opportunityModel = "Job",
      applicationId,
      interviewId,
      reportedUserId,
      targetType,
      targetId,
      targetTitle,
    } = req.body;

    const finalDetails = details || description;
    if (!finalDetails) {
      return res.status(400).json({ success: false, message: "Report details/description is required" });
    }

    const report = await Report.create({
      category: category || "Opportunity",
      reportType: reportType || category || "Opportunity",
      title: title || `${category} Report`,
      details: finalDetails,
      description: finalDetails,
      priority: priority || "Medium",
      companyId: companyId || (req.user.role === "COMPANY_ADMIN" ? req.user.companyId : null),
      opportunityId: opportunityId || null,
      opportunityModel: opportunityModel || "Job",
      applicationId: applicationId || null,
      interviewId: interviewId || null,
      reportedUserId: reportedUserId || null,
      targetType: targetType || "Opportunity",
      targetId: targetId || opportunityId || null,
      targetTitle: targetTitle || title || "",
      reportedBy: req.user._id,
      reportedByName: req.user.fullName || "User",
      status: "Open",
    });

    try {
      await AuditLog.create({
        companyId: report.companyId || null,
        actorId: req.user._id,
        actorName: req.user.fullName || "User",
        actorEmail: req.user.email || "",
        action: "CREATE_REPORT",
        module: "Reports",
        target: `Report #${report._id.toString().slice(-6)}`,
        details: `Report created for category ${category}`,
      });
    } catch (logErr) {
      console.warn("[admin reports] audit log failed:", logErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 10. SETTINGS MANAGEMENT (GLOBAL VS TENANT)
// =========================================================================
