const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const AuditLog = require("../models/AuditLog");
const PlatformSetting = require("../models/PlatformSetting");
const StudentProfile = require("../models/StudentProfile");
const FresherProfile = require("../models/FresherProfile");
const ProfessionalProfile = require("../models/ProfessionalProfile");

/**
 * Helper to compute date filter based on range
 * @param {string} range - '7d' | '30d' | '3m' | '6m' | '1y'
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

/**
 * GET /api/admin/dashboard
 * Aggregated dashboard payload with 100% dynamic DB data
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const { range = "30d" } = req.query;
    const startDate = getStartDateForRange(range);

    // 1. Overview counts
    const [
      totalUsers,
      totalEmployers,
      activeEmployersCount,
      totalJobs,
      publishedJobsCount,
      pendingJobsCount,
      draftJobsCount,
      closedJobsCount,
      totalInternships,
      publishedInternshipsCount,
      pendingInternshipsCount,
      draftInternshipsCount,
      closedInternshipsCount,
      totalApplications,
      upcomingInterviewsCount,
      completedInterviewsCount,
      cancelledInterviewsCount,
    ] = await Promise.all([
      User.countDocuments(),
      EmployerProfile.countDocuments(),
      EmployerProfile.countDocuments({ isPublished: true }),
      Job.countDocuments(),
      Job.countDocuments({ status: "Published" }),
      Job.countDocuments({ status: "Pending Approval" }),
      Job.countDocuments({ status: "Draft" }),
      Job.countDocuments({ status: { $in: ["Closed", "Paused"] } }),
      Internship.countDocuments(),
      Internship.countDocuments({ status: "Published" }),
      Internship.countDocuments({ status: "Pending Approval" }),
      Internship.countDocuments({ status: "Draft" }),
      Internship.countDocuments({ status: { $in: ["Closed", "Paused"] } }),
      Application.countDocuments(),
      Interview.countDocuments({
        status: { $in: ["scheduled", "Scheduled", "rescheduled", "Rescheduled"] },
      }),
      Interview.countDocuments({
        status: { $in: ["completed", "Completed"] },
      }),
      Interview.countDocuments({
        status: { $in: ["cancelled", "Cancelled"] },
      }),
    ]);

    // Active opportunities combine published jobs + published internships
    const activeOpportunities = publishedJobsCount + publishedInternshipsCount;

    // Pending reviews combine items needing Admin action
    const pendingEmployerVerifications = await EmployerProfile.countDocuments({ isPublished: false });
    const pendingReviews = pendingJobsCount + pendingInternshipsCount + pendingEmployerVerifications;

    // 2. User breakdown by userType
    const userTypeAggregation = await User.aggregate([
      {
        $group: {
          _id: "$userType",
          count: { $sum: 1 },
        },
      },
    ]);

    const usersBreakdown = {
      students: 0,
      freshers: 0,
      professionals: 0,
      employers: 0,
    };

    userTypeAggregation.forEach((item) => {
      if (item._id === "student") usersBreakdown.students = item.count;
      else if (item._id === "fresher") usersBreakdown.freshers = item.count;
      else if (item._id === "professional") usersBreakdown.professionals = item.count;
      else if (item._id === "employer") usersBreakdown.employers = item.count;
    });

    // 3. User Growth Timeline (grouped by date)
    const isLongRange = range === "6m" || range === "1y";
    const dateFormat = isLongRange ? "%Y-%m" : "%Y-%m-%d";

    const userGrowthAggregation = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const userGrowth = userGrowthAggregation.map((item) => ({
      date: item._id,
      registrationCount: item.count,
    }));

    // 4. Application Funnel
    const applicationStatusAggregation = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const funnelMap = {
      applied: 0,
      underReview: 0,
      shortlisted: 0,
      interview: 0,
      selected: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applicationStatusAggregation.forEach((item) => {
      const status = item._id;
      if (status === "Applied") funnelMap.applied += item.count;
      else if (status === "Under Review" || status === "Approved") funnelMap.underReview += item.count;
      else if (status === "Shortlisted") funnelMap.shortlisted += item.count;
      else if (
        status === "Interview" ||
        status === "Interview Scheduled" ||
        status === "Interview Completed"
      ) {
        funnelMap.interview += item.count;
      } else if (status === "Selected" || status === "Offered" || status === "Hired") {
        funnelMap.selected += item.count;
      } else if (status === "Rejected") {
        funnelMap.rejected += item.count;
      } else if (status === "Withdrawn") {
        funnelMap.withdrawn += item.count;
      }
    });

    // Also get application breakdown by opportunityType
    const [jobApplicationsCount, internshipApplicationsCount] = await Promise.all([
      Application.countDocuments({ opportunityType: "Job" }),
      Application.countDocuments({ opportunityType: "Internship" }),
    ]);

    // 5. Requires Attention items (real records requiring admin review)
    const attention = [];
    if (pendingJobsCount > 0) {
      attention.push({
        id: "pending-jobs",
        title: `${pendingJobsCount} job${pendingJobsCount > 1 ? "s" : ""} awaiting approval`,
        count: pendingJobsCount,
        category: "Jobs",
        severity: "high",
        actionText: "Review Jobs",
        link: "/admin/jobs?status=Pending Approval",
      });
    }

    if (pendingInternshipsCount > 0) {
      attention.push({
        id: "pending-internships",
        title: `${pendingInternshipsCount} internship${pendingInternshipsCount > 1 ? "s" : ""} awaiting approval`,
        count: pendingInternshipsCount,
        category: "Internships",
        severity: "high",
        actionText: "Review Internships",
        link: "/admin/internships?status=Pending Approval",
      });
    }

    if (pendingEmployerVerifications > 0) {
      attention.push({
        id: "pending-employers",
        title: `${pendingEmployerVerifications} employer profile${pendingEmployerVerifications > 1 ? "s" : ""} pending publication`,
        count: pendingEmployerVerifications,
        category: "Employers",
        severity: "medium",
        actionText: "Verify Profiles",
        link: "/admin/employers?status=pending",
      });
    }

    // 6. Recent real platform activities
    const [recentUsers, recentJobs, recentInternships, recentApps, recentInterviews] =
      await Promise.all([
        User.find()
          .select("fullName email role userType createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Job.find()
          .select("title companyName status createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Internship.find()
          .select("title companyName status createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Application.find()
          .select("opportunityTitle companyName studentName status createdAt appliedAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Interview.find()
          .select("title roundName status scheduledDate createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const activityList = [];

    recentUsers.forEach((u) => {
      activityList.push({
        id: `user-${u._id}`,
        type: "USER_REGISTERED",
        entity: "User",
        title: `${u.fullName || u.email || "New User"} registered as ${u.userType || u.role || "member"}`,
        timestamp: u.createdAt,
        badge: u.userType || u.role,
        link: `/admin/users`,
      });
    });

    recentJobs.forEach((j) => {
      activityList.push({
        id: `job-${j._id}`,
        type: "JOB_POSTED",
        entity: "Job",
        title: `Job posted: "${j.title}" by ${j.companyName || "Employer"}`,
        timestamp: j.createdAt,
        badge: j.status,
        link: `/opportunities`,
      });
    });

    recentInternships.forEach((i) => {
      activityList.push({
        id: `internship-${i._id}`,
        type: "INTERNSHIP_POSTED",
        entity: "Internship",
        title: `Internship posted: "${i.title}" by ${i.companyName || "Employer"}`,
        timestamp: i.createdAt,
        badge: i.status,
        link: `/internships/${i._id}`,
      });
    });

    recentApps.forEach((a) => {
      activityList.push({
        id: `app-${a._id}`,
        type: "APPLICATION_SUBMITTED",
        entity: "Application",
        title: `Application for "${a.opportunityTitle || "Position"}" (${a.status || "Applied"})`,
        timestamp: a.createdAt || a.appliedAt,
        badge: a.status,
        link: `/applications`,
      });
    });

    recentInterviews.forEach((it) => {
      activityList.push({
        id: `interview-${it._id}`,
        type: "INTERVIEW_SCHEDULED",
        entity: "Interview",
        title: `Interview "${it.title}" scheduled for ${it.scheduledDate}`,
        timestamp: it.createdAt,
        badge: it.status,
        link: `/employer/dashboard`,
      });
    });

    // Sort combined activities descending by timestamp
    activityList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activityList.slice(0, 12);

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeEmployers: activeEmployersCount,
          totalEmployers,
          activeOpportunities,
          totalApplications,
          upcomingInterviews: upcomingInterviewsCount,
          completedInterviews: completedInterviewsCount,
          cancelledInterviews: cancelledInterviewsCount,
          pendingReviews,
        },
        users: usersBreakdown,
        userGrowth,
        opportunities: {
          jobs: {
            total: totalJobs,
            published: publishedJobsCount,
            pendingApproval: pendingJobsCount,
            draft: draftJobsCount,
            closed: closedJobsCount,
          },
          internships: {
            total: totalInternships,
            published: publishedInternshipsCount,
            pendingApproval: pendingInternshipsCount,
            draft: draftInternshipsCount,
            closed: closedInternshipsCount,
          },
        },
        applicationFunnel: {
          ...funnelMap,
          byType: {
            jobs: jobApplicationsCount,
            internships: internshipApplicationsCount,
          },
        },
        attention,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Admin dashboard controller error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/search
 * Search real data across Users, Employers, Jobs, Internships, Applications, Interviews
 */
exports.searchAdmin = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        results: {
          users: [],
          employers: [],
          jobs: [],
          internships: [],
          applications: [],
          interviews: [],
        },
      });
    }

    const regex = new RegExp(q.trim(), "i");

    const [users, employers, jobs, internships, applications, interviews] = await Promise.all([
      User.find({
        $or: [{ fullName: regex }, { email: regex }, { username: regex }],
      })
        .select("fullName email role userType createdAt")
        .limit(5)
        .lean(),
      EmployerProfile.find({
        $or: [{ companyName: regex }, { industry: regex }, { officialEmail: regex }],
      })
        .select("companyName industry isPublished headquarters createdAt")
        .limit(5)
        .lean(),
      Job.find({
        $or: [{ title: regex }, { companyName: regex }, { category: regex }],
      })
        .select("title companyName status employmentType location createdAt")
        .limit(5)
        .lean(),
      Internship.find({
        $or: [{ title: regex }, { companyName: regex }, { category: regex }],
      })
        .select("title companyName status workMode location createdAt")
        .limit(5)
        .lean(),
      Application.find({
        $or: [{ opportunityTitle: regex }, { companyName: regex }, { studentName: regex }],
      })
        .select("opportunityTitle companyName studentName status opportunityType createdAt")
        .limit(5)
        .lean(),
      Interview.find({
        $or: [{ title: regex }, { roundName: regex }, { scheduledDate: regex }],
      })
        .select("title roundName status scheduledDate createdAt")
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      results: {
        users: users.map((u) => ({
          id: u._id,
          title: u.fullName || u.email,
          subtitle: `${u.email} · ${u.userType || u.role}`,
          category: "User",
          badge: u.userType || u.role,
          link: `/admin/users`,
        })),
        employers: employers.map((e) => ({
          id: e._id,
          title: e.companyName,
          subtitle: `${e.industry} · ${e.isPublished ? "Published" : "Pending"}`,
          category: "Employer",
          badge: e.isPublished ? "Verified" : "Pending",
          link: `/companies/${e._id}`,
        })),
        jobs: jobs.map((j) => ({
          id: j._id,
          title: j.title,
          subtitle: `${j.companyName} · ${j.location}`,
          category: "Job",
          badge: j.status,
          link: `/opportunities`,
        })),
        internships: internships.map((i) => ({
          id: i._id,
          title: i.title,
          subtitle: `${i.companyName} · ${i.location}`,
          category: "Internship",
          badge: i.status,
          link: `/internships/${i._id}`,
        })),
        applications: applications.map((a) => ({
          id: a._id,
          title: a.opportunityTitle,
          subtitle: `Candidate: ${a.studentName || "Applicant"} · ${a.companyName}`,
          category: "Application",
          badge: a.status,
          link: `/applications`,
        })),
        interviews: interviews.map((it) => ({
          id: it._id,
          title: it.title,
          subtitle: `${it.roundName} · ${it.scheduledDate}`,
          category: "Interview",
          badge: it.status,
          link: `/employer/dashboard`,
        })),
      },
    });
  } catch (error) {
    console.error("Admin search error:", error);
    next(error);
  }
};

/**
 * GET /api/admin/notifications
 * Admin specific attention notifications
 */
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const [pendingJobs, pendingInternships, pendingEmployers] = await Promise.all([
      Job.find({ status: "Pending Approval" })
        .select("title companyName createdAt")
        .limit(5)
        .lean(),
      Internship.find({ status: "Pending Approval" })
        .select("title companyName createdAt")
        .limit(5)
        .lean(),
      EmployerProfile.find({ isPublished: false })
        .select("companyName officialEmail createdAt")
        .limit(5)
        .lean(),
    ]);

    const notifications = [];

    pendingJobs.forEach((j) => {
      notifications.push({
        id: `notif-job-${j._id}`,
        title: "Job Pending Review",
        message: `"${j.title}" by ${j.companyName || "Employer"} needs review.`,
        type: "JOB_APPROVAL",
        timestamp: j.createdAt,
        link: "/admin/jobs?status=Pending Approval",
      });
    });

    pendingInternships.forEach((i) => {
      notifications.push({
        id: `notif-intern-${i._id}`,
        title: "Internship Pending Review",
        message: `"${i.title}" by ${i.companyName || "Employer"} needs review.`,
        type: "INTERNSHIP_APPROVAL",
        timestamp: i.createdAt,
        link: "/admin/internships?status=Pending Approval",
      });
    });

    pendingEmployers.forEach((e) => {
      notifications.push({
        id: `notif-emp-${e._id}`,
        title: "Employer Verification Pending",
        message: `Company "${e.companyName}" registered and is awaiting verification.`,
        type: "EMPLOYER_VERIFICATION",
        timestamp: e.createdAt,
        link: "/admin/employers?status=pending",
      });
    });

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    next(error);
  }
};

/**
 * POST /api/admin/login
 * Dedicated secure Admin Authentication endpoint.
 * Strict verification of email/username, password, active status, and role === 'admin'.
 * Security rule: If non-admin attempts login, returns generic 'Invalid email or password'.
 */
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, username, emailOrUsername, password, keepSignedIn = false } = req.body;
    const loginIdentifier = email || username || emailOrUsername;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required",
      });
    }

    const loginValue = loginIdentifier.trim().toLowerCase();

    // Query user with password selected
    const user = await User.findOne({
      $or: [{ email: loginValue }, { username: loginValue }],
    }).select("+password");

    // 1. User existence check
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 2. Active status check
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Account is suspended. Please contact platform support.",
      });
    }

    // 3. Password verification
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Strict ADMIN role verification
    // Non-admin roles (student, fresher, professional, employer) MUST be rejected with a generic error
    if (user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // 5. Generate secure Admin JWT
    const expiresIn = keepSignedIn ? "7d" : "24h";
    const maxAge = keepSignedIn ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn }
    );

    // Set secure HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge,
    });

    if (req.session) {
      req.session.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        userType: user.userType,
        loginTime: new Date(),
      };
    }

    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    next(error);
  }
};

/**
 * POST /api/admin/logout
 * Clears authentication token and session for Admin
 */
exports.adminLogout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    if (req.session) {
      req.session.destroy(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 25: STUDENT / CANDIDATE MANAGEMENT
// ===================================================

/**
 * GET /api/admin/students
 * List candidates (students, freshers, professionals) with filtering & stats
 */
exports.getAdminStudents = async (req, res, next) => {
  try {
    const {
      search = "",
      userType = "all",
      status = "all",
      page = 1,
      limit = 15,
    } = req.query;

    const query = {
      role: { $ne: "admin" },
      userType: { $in: ["student", "fresher", "professional"] },
    };

    if (userType !== "all") {
      query.userType = userType;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { username: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [candidates, totalCount, stats] = await Promise.all([
      User.find(query)
        .select("-password -emailOTP -emailOTPExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
      User.aggregate([
        {
          $match: {
            role: { $ne: "admin" },
            userType: { $in: ["student", "fresher", "professional"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
            suspended: {
              $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
            },
            students: {
              $sum: { $cond: [{ $eq: ["$userType", "student"] }, 1, 0] },
            },
            freshers: {
              $sum: { $cond: [{ $eq: ["$userType", "fresher"] }, 1, 0] },
            },
            professionals: {
              $sum: { $cond: [{ $eq: ["$userType", "professional"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const candidateStats = stats[0] || {
      total: 0,
      active: 0,
      suspended: 0,
      students: 0,
      freshers: 0,
      professionals: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        candidates,
        stats: candidateStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/students/:id/status
 * Toggle or set candidate active/suspended status
 */
exports.updateStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const candidate = await User.findOne({
      _id: id,
      role: { $ne: "admin" },
      userType: { $in: ["student", "fresher", "professional"] },
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate account not found",
      });
    }

    candidate.isActive = typeof isActive === "boolean" ? isActive : !candidate.isActive;
    await candidate.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `Candidate account ${candidate.isActive ? "activated" : "suspended"} successfully`,
      data: {
        _id: candidate._id,
        isActive: candidate.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 26: EMPLOYER MANAGEMENT
// ===================================================

/**
 * GET /api/admin/employers
 * List employers with verification status and opportunity counts
 */
exports.getAdminEmployers = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "all", // all | verified | pending
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (status === "verified") {
      query.isPublished = true;
    } else if (status === "pending") {
      query.isPublished = false;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { companyName: regex },
        { officialEmail: regex },
        { industry: regex },
        { "recruiter.name": regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [employers, totalCount, stats] = await Promise.all([
      EmployerProfile.find(query)
        .populate("userId", "fullName email phone isActive createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmployerProfile.countDocuments(query),
      EmployerProfile.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            verified: {
              $sum: { $cond: [{ $eq: ["$isPublished", true] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$isPublished", false] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Attach opportunities count to each employer
    const employerIds = employers.map((e) => e._id);
    const [jobsCounts, internshipsCounts] = await Promise.all([
      Job.aggregate([
        { $match: { employerId: { $in: employerIds } } },
        { $group: { _id: "$employerId", count: { $sum: 1 } } },
      ]),
      Internship.aggregate([
        { $match: { employerId: { $in: employerIds } } },
        { $group: { _id: "$employerId", count: { $sum: 1 } } },
      ]),
    ]);

    const jobsMap = new Map(jobsCounts.map((j) => [j._id.toString(), j.count]));
    const internshipsMap = new Map(internshipsCounts.map((i) => [i._id.toString(), i.count]));

    const enrichedEmployers = employers.map((emp) => {
      const jCount = jobsMap.get(emp._id.toString()) || 0;
      const iCount = internshipsMap.get(emp._id.toString()) || 0;
      return {
        ...emp,
        postedJobsCount: jCount,
        postedInternshipsCount: iCount,
        totalOpportunities: jCount + iCount,
      };
    });

    const employerStats = stats[0] || { total: 0, verified: 0, pending: 0 };

    return res.status(200).json({
      success: true,
      data: {
        employers: enrichedEmployers,
        stats: employerStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/employers/:id/status
 * Toggle verification / published status or user active status
 */
exports.updateEmployerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished, isActive } = req.body;

    const employer = await EmployerProfile.findById(id).populate("userId");
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: "Employer profile not found",
      });
    }

    if (typeof isPublished === "boolean") {
      employer.isPublished = isPublished;
      await employer.save();
    }

    if (typeof isActive === "boolean" && employer.userId) {
      employer.userId.isActive = isActive;
      await employer.userId.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      success: true,
      message: "Employer profile updated successfully",
      data: {
        _id: employer._id,
        isPublished: employer.isPublished,
        isActive: employer.userId?.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 27: OPPORTUNITY MANAGEMENT (JOBS & INTERNSHIPS)
// ===================================================

/**
 * GET /api/admin/opportunities
 * Combined listing of Jobs and Internships with filtering
 */
exports.getAdminOpportunities = async (req, res, next) => {
  try {
    const {
      type = "all", // all | job | internship
      status = "all", // all | Published | Draft | Pending Approval | Closed
      search = "",
      page = 1,
      limit = 15,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // Build sub-queries
    const jobQuery = {};
    const internQuery = {};

    if (status !== "all") {
      jobQuery.status = status;
      internQuery.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      jobQuery.$or = [{ title: regex }, { companyName: regex }, { location: regex }];
      internQuery.$or = [{ title: regex }, { companyName: regex }, { location: regex }];
    }

    let items = [];
    let totalCount = 0;

    if (type === "job") {
      const [jobs, count] = await Promise.all([
        Job.find(jobQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Job.countDocuments(jobQuery),
      ]);
      items = jobs.map((j) => ({ ...j, opportunityType: "Job" }));
      totalCount = count;
    } else if (type === "internship") {
      const [internships, count] = await Promise.all([
        Internship.find(internQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Internship.countDocuments(internQuery),
      ]);
      items = internships.map((i) => ({ ...i, opportunityType: "Internship" }));
      totalCount = count;
    } else {
      // Fetch both
      const [jobs, internships, jobsCount, internshipsCount] = await Promise.all([
        Job.find(jobQuery).sort({ createdAt: -1 }).limit(limitNum).lean(),
        Internship.find(internQuery).sort({ createdAt: -1 }).limit(limitNum).lean(),
        Job.countDocuments(jobQuery),
        Internship.countDocuments(internQuery),
      ]);

      const merged = [
        ...jobs.map((j) => ({ ...j, opportunityType: "Job" })),
        ...internships.map((i) => ({ ...i, opportunityType: "Internship" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      items = merged.slice(skip, skip + limitNum);
      totalCount = jobsCount + internshipsCount;
    }

    // Attach applications count for each opportunity
    const oppIds = items.map((it) => it._id);
    const appCounts = await Application.aggregate([
      {
        $match: {
          $or: [{ jobId: { $in: oppIds } }, { internshipId: { $in: oppIds } }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$jobId", "$internshipId"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const appCountMap = new Map(appCounts.map((a) => [a._id.toString(), a.count]));

    const enrichedItems = items.map((it) => ({
      ...it,
      applicationsCount: appCountMap.get(it._id.toString()) || 0,
    }));

    // Overview counts
    const [
      publishedJobs,
      pendingJobs,
      draftJobs,
      closedJobs,
      publishedInterns,
      pendingInterns,
      draftInterns,
      closedInterns,
    ] = await Promise.all([
      Job.countDocuments({ status: "Published" }),
      Job.countDocuments({ status: "Pending Approval" }),
      Job.countDocuments({ status: "Draft" }),
      Job.countDocuments({ status: { $in: ["Closed", "Paused"] } }),
      Internship.countDocuments({ status: "Published" }),
      Internship.countDocuments({ status: "Pending Approval" }),
      Internship.countDocuments({ status: "Draft" }),
      Internship.countDocuments({ status: { $in: ["Closed", "Paused"] } }),
    ]);

    const stats = {
      total: publishedJobs + pendingJobs + draftJobs + closedJobs + publishedInterns + pendingInterns + draftInterns + closedInterns,
      published: publishedJobs + publishedInterns,
      pending: pendingJobs + pendingInterns,
      draft: draftJobs + draftInterns,
      closed: closedJobs + closedInterns,
      totalJobs: publishedJobs + pendingJobs + draftJobs + closedJobs,
      totalInternships: publishedInterns + pendingInterns + draftInterns + closedInterns,
    };

    return res.status(200).json({
      success: true,
      data: {
        opportunities: enrichedItems,
        stats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/opportunities/:type/:id/status
 * Update status of a Job or Internship
 */
exports.updateOpportunityStatus = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Published", "Draft", "Pending Approval", "Closed", "Paused"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    let opportunity = null;
    if (type.toLowerCase() === "job") {
      opportunity = await Job.findById(id);
    } else if (type.toLowerCase() === "internship") {
      opportunity = await Internship.findById(id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid opportunity type. Must be 'job' or 'internship'.",
      });
    }

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    opportunity.status = status;
    await opportunity.save();

    return res.status(200).json({
      success: true,
      message: `Opportunity status updated to ${status}`,
      data: {
        _id: opportunity._id,
        status: opportunity.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 28: APPLICATION MANAGEMENT
// ===================================================

/**
 * GET /api/admin/applications
 * List applications platform-wide with status filters & search
 */
exports.getAdminApplications = async (req, res, next) => {
  try {
    const {
      status = "all",
      type = "all", // all | Job | Internship
      search = "",
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (status !== "all") {
      query.status = status;
    }

    if (type !== "all") {
      query.opportunityType = type;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { opportunityTitle: regex },
        { companyName: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [applications, totalCount, statusCounts] = await Promise.all([
      Application.find(query)
        .populate("candidateId", "fullName email phone profileImage userType")
        .populate("jobId", "title companyName location employmentType")
        .populate("internshipId", "title companyName location")
        .populate("employerId", "companyName officialEmail logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Application.countDocuments(query),
      Application.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const funnelCounts = {
      total: 0,
      applied: 0,
      reviewing: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
    };

    statusCounts.forEach((s) => {
      funnelCounts.total += s.count;
      const st = (s._id || "").toLowerCase();
      if (st.includes("applied")) funnelCounts.applied += s.count;
      else if (st.includes("review")) funnelCounts.reviewing += s.count;
      else if (st.includes("shortlist")) funnelCounts.shortlisted += s.count;
      else if (st.includes("interview")) funnelCounts.interview += s.count;
      else if (st.includes("hire")) funnelCounts.hired += s.count;
      else if (st.includes("reject")) funnelCounts.rejected += s.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        applications,
        stats: funnelCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/applications/:id/status
 * Update application stage
 */
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Interview Scheduled",
      "Interview Completed",
      "Hired",
      "Rejected",
      "Withdrawn",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application record not found",
      });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application stage updated to ${status}`,
      data: {
        _id: application._id,
        status: application.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 29: REPORTS & TELEMETRY
// ===================================================

/**
 * GET /api/admin/reports
 * Comprehensive platform analytical data
 */
exports.getAdminReports = async (req, res, next) => {
  try {
    const [
      candidatesCount,
      activeCandidatesCount,
      employersCount,
      verifiedEmployersCount,
      jobsCount,
      internshipsCount,
      applicationsCount,
      hiredCount,
      interviewsCount,
      userTypeBreakdown,
      jobTypeBreakdown,
      industryBreakdown,
      topHiringEmployers,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" }, userType: { $ne: "employer" } }),
      User.countDocuments({ role: { $ne: "admin" }, userType: { $ne: "employer" }, isActive: true }),
      EmployerProfile.countDocuments(),
      EmployerProfile.countDocuments({ isPublished: true }),
      Job.countDocuments(),
      Internship.countDocuments(),
      Application.countDocuments(),
      Application.countDocuments({ status: { $regex: /hired/i } }),
      Interview.countDocuments(),
      User.aggregate([
        { $match: { role: { $ne: "admin" } } },
        { $group: { _id: "$userType", count: { $sum: 1 } } },
      ]),
      Job.aggregate([
        { $group: { _id: "$employmentType", count: { $sum: 1 } } },
      ]),
      EmployerProfile.aggregate([
        { $group: { _id: "$industry", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      Application.aggregate([
        { $group: { _id: "$companyName", applicationsReceived: { $sum: 1 } } },
        { $sort: { applicationsReceived: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const hireRate = applicationsCount > 0
      ? Number(((hiredCount / applicationsCount) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCandidates: candidatesCount,
          activeCandidates: activeCandidatesCount,
          totalEmployers: employersCount,
          verifiedEmployers: verifiedEmployersCount,
          totalJobs: jobsCount,
          totalInternships: internshipsCount,
          totalApplications: applicationsCount,
          totalInterviews: interviewsCount,
          hiredCount,
          placementRate: hireRate,
        },
        userTypes: userTypeBreakdown,
        jobTypes: jobTypeBreakdown,
        topIndustries: industryBreakdown,
        topEmployers: topHiringEmployers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================================================
// PAGE 30: PLATFORM SETTINGS
// ===================================================

/**
 * GET /api/admin/settings
 * Read platform operational configuration
 */
exports.getAdminSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSetting.findOne();
    if (!settings) {
      settings = await PlatformSetting.create({});
    }

    const systemDiagnostics = {
      nodeEnv: process.env.NODE_ENV || "development",
      databaseStatus: "Connected",
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };

    return res.status(200).json({
      success: true,
      data: {
        settings,
        diagnostics: systemDiagnostics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings
 * Update platform operational configuration
 */
exports.updateAdminSettings = async (req, res, next) => {
  try {
    const {
      platformName,
      supportEmail,
      allowStudentRegistration,
      allowEmployerRegistration,
      requireEmailVerification,
      autoApproveJobs,
      autoApproveEmployers,
      maintenanceMode,
      sessionTimeoutHours,
    } = req.body;

    let settings = await PlatformSetting.findOne();
    if (!settings) {
      settings = new PlatformSetting();
    }

    if (platformName !== undefined) settings.platformName = platformName;
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (allowStudentRegistration !== undefined) settings.allowStudentRegistration = allowStudentRegistration;
    if (allowEmployerRegistration !== undefined) settings.allowEmployerRegistration = allowEmployerRegistration;
    if (requireEmailVerification !== undefined) settings.requireEmailVerification = requireEmailVerification;
    if (autoApproveJobs !== undefined) settings.autoApproveJobs = autoApproveJobs;
    if (autoApproveEmployers !== undefined) settings.autoApproveEmployers = autoApproveEmployers;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (sessionTimeoutHours !== undefined) settings.sessionTimeoutHours = sessionTimeoutHours;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

