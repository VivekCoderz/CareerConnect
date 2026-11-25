// Admin dashboard (super admin and company admin), global search and notifications.
// Split out of adminController.js, which re-exports everything for routes/adminRoutes.js.
const User = require("../../models/User");
const Company = require("../../models/Company");
const Report = require("../../models/Report");
const Job = require("../../models/Job");
const Internship = require("../../models/Internship");
const Application = require("../../models/Application");
const AuditLog = require("../../models/AuditLog");
const Interview = require("../../models/Interview");
const OrganizationRequest = require("../../models/OrganizationRequest");

/**
 * Helper to compute date filter based on range
 */
function getStartDateForRange(range) {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "30d":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

// =========================================================================
// 1. ADMIN AUTHENTICATION
// =========================================================================

const adminDashboardCache = new Map();

const ADMIN_DASHBOARD_CACHE_TTL_MS = 45 * 1000; // 45 seconds TTL for fast responses

/**
 * GET /api/admin/dashboard
 * Dynamically switches between SUPER_ADMIN (Platform) and COMPANY_ADMIN (Tenant)
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const { range = "30d", refresh } = req.query;
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
    const cacheKey = `${isSuperAdmin ? "SUPER" : req.user.companyId || "COMPANY"}_${range}`;

    // Fast-path cache check: return cached metrics instantly unless explicitly refreshed
    if (refresh !== "true" && adminDashboardCache.has(cacheKey)) {
      const cached = adminDashboardCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ADMIN_DASHBOARD_CACHE_TTL_MS) {
        return res.status(200).json({
          success: true,
          data: cached.data,
          ...cached.data,
          cached: true,
        });
      }
    }

    const startDate = getStartDateForRange(range);

    // Helper for funnel aggregation
    const getFunnelCounts = async (matchFilter) => {
      const agg = await Application.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } },
      ]);
      const map = {};
      agg.forEach((item) => {
        map[item._id] = item.count;
      });
      const applied = (map["applied"] || 0);
      const underReview = (map["under review"] || map["under_review"] || map["approved"] || 0);
      const shortlisted = (map["shortlisted"] || 0);
      const interview = (map["interview"] || map["interview scheduled"] || map["interview completed"] || 0);
      const selected = (map["selected"] || map["hired"] || map["offered"] || 0);
      const rejected = (map["rejected"] || 0);
      const withdrawn = (map["withdrawn"] || 0);
      return {
        applied,
        underReview,
        shortlisted,
        interview,
        selected,
        rejected,
        withdrawn,
        total: applied + underReview + shortlisted + interview + selected + rejected + withdrawn,
      };
    };

    // -------------------------------------------------------------------
    // A. COMPANY_ADMIN DASHBOARD: Strictly Scoped to Assigned Company
    // -------------------------------------------------------------------
    if (!isSuperAdmin) {
      const companyId = req.user.companyId;
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "No company assigned to this Company Administrator",
        });
      }

      const company = await Company.findById(companyId);

      const [
        companyUsersCount,
        companyJobsTotal,
        companyJobsPublished,
        companyJobsPending,
        companyJobsClosed,
        companyInternshipsTotal,
        companyInternshipsPublished,
        companyInternshipsPending,
        companyInternshipsClosed,
        companyUpcomingInterviews,
        companyCompletedInterviews,
        companyCancelledInterviews,
        companyReportsCount,
        funnelData,
        recentApplications,
        recentCompanyLogs,
      ] = await Promise.all([
        User.countDocuments({ companyId }),
        Job.countDocuments({ companyId }),
        Job.countDocuments({ companyId, status: { $in: ["Published", "active"] } }),
        Job.countDocuments({ companyId, status: "Pending Approval" }),
        Job.countDocuments({ companyId, status: "Closed" }),
        Internship.countDocuments({ companyId }),
        Internship.countDocuments({ companyId, status: { $in: ["Published", "active"] } }),
        Internship.countDocuments({ companyId, status: "Pending Approval" }),
        Internship.countDocuments({ companyId, status: "Closed" }),
        Interview.countDocuments({ companyId, status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] } }),
        Interview.countDocuments({ companyId, status: { $in: ["completed", "Completed"] } }),
        Interview.countDocuments({ companyId, status: { $in: ["cancelled", "Cancelled"] } }),
        Report.countDocuments({ companyId, status: "Open" }),
        getFunnelCounts({ companyId }),
        Application.find({ companyId })
          .populate("candidateId", "fullName email profileImage")
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
        AuditLog.find({ companyId })
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
      ]);

      const totalOpportunities = companyJobsTotal + companyInternshipsTotal;
      const activeOpportunities = companyJobsPublished + companyInternshipsPublished;
      const pendingReviews = companyJobsPending + companyInternshipsPending;

      const dashboardData = {
        role: "COMPANY_ADMIN",
        scope: "TENANT",
        company: {
          _id: company?._id || companyId,
          name: company?.name || "My Company",
          industry: company?.industry || "Technology",
          logo: company?.logo || "",
          status: company?.status || "active",
        },
        overview: {
          totalUsers: companyUsersCount,
          totalEmployers: 1,
          activeEmployers: 1,
          totalOpportunities,
          activeOpportunities,
          totalApplications: funnelData.total,
          upcomingInterviews: companyUpcomingInterviews,
          completedInterviews: companyCompletedInterviews,
          cancelledInterviews: companyCancelledInterviews,
          pendingReviews,
          requiresAttention: companyReportsCount + pendingReviews,
        },
        users: {
          students: 0,
          freshers: 0,
          professionals: 0,
          employers: companyUsersCount,
        },
        opportunities: {
          jobs: {
            total: companyJobsTotal,
            published: companyJobsPublished,
            pendingApproval: companyJobsPending,
            closed: companyJobsClosed,
          },
          internships: {
            total: companyInternshipsTotal,
            published: companyInternshipsPublished,
            pendingApproval: companyInternshipsPending,
            closed: companyInternshipsClosed,
          },
        },
        applicationFunnel: {
          ...funnelData,
          byType: { jobs: companyJobsTotal, internships: companyInternshipsTotal },
        },
        userGrowth: [],
        attention: (await Report.find({ companyId, status: "Open" }).limit(5).lean()).map((r) => ({
          id: r._id,
          title: `${r.reportType || "Report"}: ${r.title || r.details?.slice(0, 40) || "Complaint"}`,
          category: "Reports",
          severity: "high",
          link: "/admin/reports",
        })),
        recentActivity: recentCompanyLogs.length > 0
          ? recentCompanyLogs.map((log) => ({
              id: log._id,
              title: log.action.replace(/_/g, " "),
              candidate: log.actorName || "Team Member",
              status: log.module || "System",
              date: log.createdAt,
            }))
          : (recentApplications || []).map((app) => ({
              id: app._id,
              title: `Application for ${app.opportunityTitle || "Role"}`,
              candidate: app.candidateId?.fullName || "Candidate",
              status: app.status || "Applied",
              date: app.createdAt,
            })),
      };

      adminDashboardCache.set(cacheKey, { data: dashboardData, timestamp: Date.now() });

      return res.status(200).json({
        success: true,
        data: dashboardData,
        ...dashboardData,
      });
    }

    // -------------------------------------------------------------------
    // B. SUPER_ADMIN DASHBOARD: Global Platform-Wide Aggregations
    // -------------------------------------------------------------------
    const [
      totalCompanies,
      activeCompanies,
      totalCompanyAdmins,
      totalStudents,
      totalEmployers,
      totalFreshers,
      totalProfessionals,
      totalJobs,
      activeJobs,
      pendingJobs,
      closedJobs,
      totalInternships,
      activeInternships,
      pendingInternships,
      closedInternships,
      upcomingInterviews,
      completedInterviews,
      cancelledInterviews,
      openReports,
      pendingOrgRequests,
      funnelData,
      recentCompanies,
      recentAuditLogs,
      // FL-11: moved from serial awaits into the batch to eliminate extra round-trips
      attentionReports,
      attentionOrgRequests,
      applicationTrends,
      fallbackActivity,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: { $in: ["active", "ACTIVE"] } }),
      User.countDocuments({ role: "COMPANY_ADMIN" }),
      User.countDocuments({ userType: "student" }),
      User.countDocuments({ userType: "employer" }),
      User.countDocuments({ userType: "fresher" }),
      User.countDocuments({ userType: "professional" }),
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ["Published", "active"] } }),
      Job.countDocuments({ status: "Pending Approval" }),
      Job.countDocuments({ status: "Closed" }),
      Internship.countDocuments(),
      Internship.countDocuments({ status: { $in: ["Published", "active"] } }),
      Internship.countDocuments({ status: "Pending Approval" }),
      Internship.countDocuments({ status: "Closed" }),
      Interview.countDocuments({ status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] } }),
      Interview.countDocuments({ status: { $in: ["completed", "Completed"] } }),
      Interview.countDocuments({ status: { $in: ["cancelled", "Cancelled"] } }),
      Report.countDocuments({ status: "Open" }),
      OrganizationRequest.countDocuments({ status: "PENDING" }),
      getFunnelCounts({}),
      Company.find().sort({ createdAt: -1 }).limit(5).lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean(),
      // FL-11: these were previously serial awaits — now concurrent
      Report.find({ status: "Open" }).limit(3).lean(),
      OrganizationRequest.find({ status: "PENDING" }).limit(3).lean(),
      Application.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Application.find().populate("candidateId", "fullName email").sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const totalUsers = totalStudents + totalEmployers + totalFreshers + totalProfessionals;
    const totalOpportunities = totalJobs + totalInternships;
    const activeOpportunities = activeJobs + activeInternships;
    const pendingReviews = pendingJobs + pendingInternships + pendingOrgRequests;

    // applicationTrends is now fetched in the batch above (fallback: empty array)

    const superAdminDashboardData = {
      role: "SUPER_ADMIN",
      scope: "GLOBAL",
      overview: {
        totalUsers,
        totalEmployers,
        activeEmployers: activeCompanies || totalEmployers,
        totalOpportunities,
        activeOpportunities,
        totalApplications: funnelData.total,
        upcomingInterviews,
        completedInterviews,
        cancelledInterviews,
        pendingReviews,
        requiresAttention: openReports + pendingReviews,
        totalCompanies,
        activeCompanies,
        totalCompanyAdmins,
      },
      users: {
        students: totalStudents,
        employers: totalEmployers,
        freshers: totalFreshers,
        professionals: totalProfessionals,
      },
      opportunities: {
        jobs: {
          total: totalJobs,
          published: activeJobs,
          pendingApproval: pendingJobs,
          closed: closedJobs,
        },
        internships: {
          total: totalInternships,
          published: activeInternships,
          pendingApproval: pendingInternships,
          closed: closedInternships,
        },
      },
      applicationFunnel: {
        ...funnelData,
        byType: { jobs: totalJobs, internships: totalInternships },
      },
      userGrowth: applicationTrends.map((item) => ({ date: item._id, count: item.count })),
      attention: [
        ...(attentionReports || []).map((r) => ({
          id: r._id,
          title: `Report: ${r.reportType || "Flagged Content"} - ${r.title || r.details?.slice(0, 30)}`,
          category: "Reports",
          severity: "high",
          link: "/admin/reports",
        })),
        ...(attentionOrgRequests || []).map((o) => ({
          id: o._id,
          title: `New Organization Request: ${o.organizationName}`,
          category: "Onboarding",
          severity: "medium",
          link: "/admin/companies",
        })),
      ],
      recentActivity: recentAuditLogs.length > 0
        ? recentAuditLogs.map((log) => ({
            id: log._id,
            title: log.action.replace(/_/g, " "),
            candidate: log.actorName || "Admin",
            status: log.module || "Platform",
            date: log.createdAt,
          }))
        : (fallbackActivity || []).map((app) => ({
            id: app._id,
            title: `Application for ${app.opportunityTitle || "Role"}`,
            candidate: app.candidateId?.fullName || "Candidate",
            status: app.status || "Applied",
            date: app.createdAt,
          })),
      recentCompanies: (recentCompanies || []).map((c) => ({
        _id: c._id,
        name: c.name,
        industry: c.industry,
        status: c.status,
        createdAt: c.createdAt,
      })),
    };

    adminDashboardCache.set(cacheKey, { data: superAdminDashboardData, timestamp: Date.now() });

    return res.status(200).json({
      success: true,
      data: superAdminDashboardData,
      ...superAdminDashboardData,
    });
  } catch (error) {
    console.error("Admin dashboard aggregation error:", error);
    next(error);
  }
};

// =========================================================================
// 3. COMPANY MANAGEMENT (SUPER_ADMIN ONLY)
// =========================================================================

/**
 * GET /api/admin/search
 */
exports.searchAdmin = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim()) {
      return res.status(200).json({ success: true, results: {} });
    }

    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
    const companyScope = !isSuperAdmin ? { companyId: req.user.companyId } : {};

    const [users, jobs, companies] = await Promise.all([
      User.find({
        ...companyScope,
        $or: [
          { fullName: { $regex: q.trim(), $options: "i" } },
          { email: { $regex: q.trim(), $options: "i" } },
        ],
      }).select("fullName email userType role").limit(5).lean(),
      Job.find({
        ...companyScope,
        title: { $regex: q.trim(), $options: "i" },
      }).select("title companyName status").limit(5).lean(),
      isSuperAdmin
        ? Company.find({ name: { $regex: q.trim(), $options: "i" } }).select("name industry status").limit(5).lean()
        : [],
    ]);

    return res.status(200).json({
      success: true,
      results: {
        users,
        jobs,
        companies,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notifications
 */
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || (req.user.role === "admin" && !req.user.companyId);
    const filter = isSuperAdmin ? {} : { companyId: req.user.companyId };

    const [openReports, pendingOpportunities] = await Promise.all([
      Report.find({ ...filter, status: "Open" }).sort({ createdAt: -1 }).limit(5).lean(),
      Job.find({ ...filter, status: "Pending" }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const notifications = [
      ...openReports.map((r) => ({
        id: r._id,
        title: `Report: ${r.reportType}`,
        message: r.details,
        type: "warning",
        link: "/admin/reports",
        createdAt: r.createdAt,
      })),
      ...pendingOpportunities.map((j) => ({
        id: j._id,
        title: `Pending Job Approval: ${j.title}`,
        message: `Opportunity posted for ${j.companyName}`,
        type: "info",
        link: "/admin/opportunities",
        createdAt: j.createdAt,
      })),
    ];

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};
