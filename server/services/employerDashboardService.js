const mongoose = require("mongoose");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const JobOffer = require("../models/JobOffer");
const AuditLog = require("../models/AuditLog");
const Employee = require("../models/Employee");
const TeamMember = require("../models/TeamMember");
const User = require("../models/User");
const Company = require("../models/Company");
const EmployerProfile = require("../models/EmployerProfile");
const Notification = require("../models/Notification");
const { getInterviewDateTimes } = require("../utils/interviewTimeUtils");

/**
 * Maps raw meeting mode/interview type to 'video' | 'onsite' | 'phone'
 */
const normalizeInterviewType = (interview) => {
  const mode = (interview.meetingMode || interview.interviewType || "").toLowerCase();
  if (mode.includes("phone") || mode.includes("call")) return "phone";
  if (mode.includes("onsite") || mode.includes("in-person") || mode.includes("office")) return "onsite";
  return "video";
};

/**
 * Maps raw application status to standard lowercase pipeline stage
 */
const normalizeStage = (status) => {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("shortlist")) return "shortlisted";
  if (s.includes("assessment") || s.includes("test")) return "assessment";
  if (s.includes("interview")) return "interview";
  if (s.includes("offer") || s.includes("selected")) return "offer";
  if (s.includes("hire")) return "hired";
  if (s.includes("reject")) return "rejected";
  if (s.includes("withdraw")) return "withdrawn";
  return "applied";
};

/**
 * Server-authoritative aggregation service for Employer Hub Dashboard
 * Scoped dynamically to companyId, employer profile, and user ownership in MongoDB
 */
const getEmployerDashboardData = async (companyId, user = null) => {
  const effectiveUserId = user?._id ? (mongoose.Types.ObjectId.isValid(user._id) ? new mongoose.Types.ObjectId(user._id) : user._id) : null;

  // Resolve employer profile if user exists
  let profile = null;
  if (effectiveUserId) {
    profile = await EmployerProfile.findOne({ userId: effectiveUserId }).lean();
  }
  const profileId = profile?._id ? (mongoose.Types.ObjectId.isValid(profile._id) ? new mongoose.Types.ObjectId(profile._id) : profile._id) : null;

  // Resolve companyId: check passed companyId or user.companyId or profile.companyId
  let rawCompanyId = companyId || user?.companyId || null;
  const compObjectId = rawCompanyId && mongoose.Types.ObjectId.isValid(rawCompanyId)
    ? new mongoose.Types.ObjectId(rawCompanyId)
    : null;

  // If no companyId and no user, return clean empty dashboard structure
  if (!compObjectId && !effectiveUserId && !profileId) {
    return {
      kpis: {
        activeJobs: 0,
        newApplications: 0,
        newToday: 0,
        applicationsThisWeek: 0,
        upcomingInterviews: 0,
        interviewsToday: 0,
        offersPending: 0,
        teamMembers: 1,
      },
      pipeline: [
        { stage: "applied", count: 0 },
        { stage: "shortlisted", count: 0 },
        { stage: "assessment", count: 0 },
        { stage: "interview", count: 0 },
        { stage: "offer", count: 0 },
        { stage: "hired", count: 0 },
      ],
      upcomingInterviews: [],
      recentApplications: [],
      activeJobs: [],
      activity: [],
      company: {
        id: null,
        name: user?.companyName || "Your Company",
        logo: user?.profileImage || "",
        verificationStatus: "unverified",
      },
      profileCompletion: user?.profileCompletion || 20,
      unreadNotificationsCount: 0,
    };
  }

  // Backfill companyId on older user jobs & internships if user is linked to an approved company
  if (compObjectId && effectiveUserId) {
    try {
      await Promise.all([
        Job.updateMany(
          { createdBy: effectiveUserId, $or: [{ companyId: null }, { companyId: { $exists: false } }] },
          { $set: { companyId: compObjectId } }
        ),
        Internship.updateMany(
          { createdBy: effectiveUserId, $or: [{ companyId: null }, { companyId: { $exists: false } }] },
          { $set: { companyId: compObjectId } }
        ),
      ]);
    } catch {
      // Non-blocking integrity backfill
    }
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Comprehensive Job & Internship Ownership Filter
  const jobOwnerConditions = [];
  if (compObjectId) jobOwnerConditions.push({ companyId: compObjectId });
  if (effectiveUserId) jobOwnerConditions.push({ createdBy: effectiveUserId });
  if (profileId) jobOwnerConditions.push({ employerId: profileId });
  if (effectiveUserId) jobOwnerConditions.push({ employerId: effectiveUserId });

  const jobOwnerFilter = jobOwnerConditions.length === 1 ? jobOwnerConditions[0] : { $or: jobOwnerConditions };

  const activeJobFilter = {
    $and: [
      jobOwnerFilter,
      { status: { $in: ["Published", "Active", "Open", "published", "active", "open"] } },
    ],
  };

  const [activeJobsCount, rawActiveJobs, allCompanyJobs, allCompanyInternships] = await Promise.all([
    Job.countDocuments(activeJobFilter),
    Job.find(activeJobFilter)
      .sort({ applicantsCount: -1, createdAt: -1 })
      .limit(6)
      .lean(),
    Job.find(jobOwnerFilter, "_id").lean(),
    Internship.find(jobOwnerFilter, "_id").lean(),
  ]);

  const companyJobIds = allCompanyJobs.map((j) => j._id);
  const companyInternshipIds = allCompanyInternships.map((i) => i._id);

  // 2. Application Scoping: applications tied to any employer/company jobs, internships, companyId, or employerId
  const appConditions = [];
  if (companyJobIds.length > 0) appConditions.push({ jobId: { $in: companyJobIds } });
  if (companyInternshipIds.length > 0) appConditions.push({ internshipId: { $in: companyInternshipIds } });
  if (compObjectId) appConditions.push({ companyId: compObjectId });
  if (profileId) appConditions.push({ employerId: profileId });
  if (effectiveUserId) appConditions.push({ employerId: effectiveUserId });

  const appScopeFilter = appConditions.length > 0
    ? (appConditions.length === 1 ? appConditions[0] : { $or: appConditions })
    : { _id: null };

  const [
    totalApplicationsCount,
    newTodayCount,
    applicationsThisWeekCount,
    rawApplicationsForPipeline,
    rawRecentApplications,
  ] = await Promise.all([
    Application.countDocuments(appScopeFilter),
    Application.countDocuments({
      $and: [
        appScopeFilter,
        {
          $or: [
            { appliedAt: { $gte: startOfToday, $lte: endOfToday } },
            { createdAt: { $gte: startOfToday, $lte: endOfToday } },
          ],
        },
      ],
    }),
    Application.countDocuments({
      $and: [
        appScopeFilter,
        {
          $or: [
            { appliedAt: { $gte: startOfWeek } },
            { createdAt: { $gte: startOfWeek } },
          ],
        },
      ],
    }),
    Application.aggregate([
      { $match: appScopeFilter },
      { $group: { _id: { $toLower: "$status" }, count: { $sum: 1 } } },
    ]),
    Application.find(appScopeFilter)
      .populate("candidateId", "fullName email profileImage")
      .populate("jobId", "title")
      .populate("internshipId", "title")
      .sort({ appliedAt: -1, createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  // Aggregate pipeline counts by 6 canonical stages
  const stageCounts = {
    applied: 0,
    shortlisted: 0,
    assessment: 0,
    interview: 0,
    offer: 0,
    hired: 0,
  };

  rawApplicationsForPipeline.forEach((group) => {
    const stage = normalizeStage(group._id);
    if (stageCounts[stage] !== undefined) {
      stageCounts[stage] += group.count;
    }
  });

  const pipeline = [
    { stage: "applied", count: stageCounts.applied },
    { stage: "shortlisted", count: stageCounts.shortlisted },
    { stage: "assessment", count: stageCounts.assessment },
    { stage: "interview", count: stageCounts.interview },
    { stage: "offer", count: stageCounts.offer },
    { stage: "hired", count: stageCounts.hired },
  ];

  // 3. Interviews Scoping: scheduled / confirmed and future
  const interviewScopeConditions = [];
  if (companyJobIds.length > 0) interviewScopeConditions.push({ jobId: { $in: companyJobIds } });
  if (companyInternshipIds.length > 0) interviewScopeConditions.push({ internshipId: { $in: companyInternshipIds } });
  if (compObjectId) interviewScopeConditions.push({ companyId: compObjectId });
  if (profileId) interviewScopeConditions.push({ employerId: profileId });
  if (effectiveUserId) interviewScopeConditions.push({ employerId: effectiveUserId });

  const interviewScopeFilter = interviewScopeConditions.length > 0
    ? {
        $and: [
          interviewScopeConditions.length === 1 ? interviewScopeConditions[0] : { $or: interviewScopeConditions },
          {
            status: {
              $in: ["scheduled", "confirmed", "Scheduled", "Confirmed"],
              $nin: ["cancelled", "completed", "no_show", "draft", "missed", "Cancelled", "Completed", "Missed"],
            },
          },
        ],
      }
    : { _id: null };

  const rawCandidateInterviews = await Interview.find(interviewScopeFilter)
    .populate("candidateId", "fullName email profileImage")
    .populate("jobId", "title")
    .populate("internshipId", "title")
    .lean();

  const validUpcomingInterviews = [];
  let interviewsTodayCount = 0;

  for (const iv of rawCandidateInterviews) {
    let startDt = iv.scheduledAt ? new Date(iv.scheduledAt) : null;
    if (!startDt || isNaN(startDt.getTime())) {
      const times = getInterviewDateTimes(iv);
      startDt = times?.startDateTime || (iv.scheduledDate ? new Date(iv.scheduledDate) : null);
    }

    if (startDt && !isNaN(startDt.getTime())) {
      if (startDt.getTime() > now.getTime()) {
        validUpcomingInterviews.push({
          id: iv._id.toString(),
          candidateId: (iv.candidateId?._id || iv.candidateId || "").toString(),
          candidateName: iv.candidateId?.fullName || iv.candidateName || "Candidate",
          jobId: (iv.jobId?._id || iv.jobId || iv.internshipId?._id || iv.internshipId || "").toString(),
          jobTitle: iv.jobId?.title || iv.internshipId?.title || iv.title || "Position",
          scheduledAt: startDt.toISOString(),
          type: normalizeInterviewType(iv),
          durationMin: Number(iv.durationMinutes || iv.duration || 45),
          status: (iv.status || "scheduled").toLowerCase(),
          meetingUrl: iv.meetingLink || undefined,
          _rawDate: startDt,
        });
      }

      if (startDt.getTime() >= startOfToday.getTime() && startDt.getTime() <= endOfToday.getTime()) {
        interviewsTodayCount += 1;
      }
    }
  }

  validUpcomingInterviews.sort((a, b) => a._rawDate.getTime() - b._rawDate.getTime());
  const upcomingInterviews = validUpcomingInterviews.slice(0, 5).map(({ _rawDate, ...rest }) => rest);

  // 4. Pending Offers Scoping
  const offerScopeConditions = [];
  if (companyJobIds.length > 0) offerScopeConditions.push({ jobId: { $in: companyJobIds } });
  if (compObjectId) offerScopeConditions.push({ companyId: compObjectId });
  if (profileId) offerScopeConditions.push({ employerId: profileId });
  if (effectiveUserId) offerScopeConditions.push({ employerId: effectiveUserId });

  const offersPendingCount = offerScopeConditions.length > 0
    ? await JobOffer.countDocuments({
        $and: [
          offerScopeConditions.length === 1 ? offerScopeConditions[0] : { $or: offerScopeConditions },
          { status: { $in: ["Sent", "sent", "Pending", "pending", "Draft", "draft"] } },
        ],
      })
    : 0;

  // 5. Team Members count
  const [employeeCount, teamMemberCount, companyUserCount] = await Promise.all([
    Employee.countDocuments(
      compObjectId
        ? { companyId: compObjectId }
        : profileId
        ? { employerId: profileId }
        : { _id: null }
    ),
    TeamMember.countDocuments(compObjectId ? { companyId: compObjectId } : { _id: null }),
    compObjectId ? User.countDocuments({ companyId: compObjectId, status: { $ne: "suspended" } }) : 1,
  ]);
  const teamMembers = Math.max(employeeCount, teamMemberCount, companyUserCount, 1);

  // 6. Recent Applications formatting
  const recentApplications = rawRecentApplications.map((app) => ({
    id: app._id.toString(),
    candidateId: (app.candidateId?._id || app.candidateId || "").toString(),
    candidateName: app.candidateId?.fullName || app.studentName || "Applicant",
    jobId: (app.jobId?._id || app.jobId || app.internshipId?._id || app.internshipId || "").toString(),
    jobTitle: app.jobId?.title || app.internshipId?.title || app.opportunityTitle || "Role",
    appliedAt: app.appliedAt || app.createdAt,
    status: normalizeStage(app.status),
  }));

  // 7. Active Jobs formatting
  const activeJobs = rawActiveJobs.map((j) => ({
    id: j._id.toString(),
    title: j.title || "Job Title",
    type: j.employmentType || "Full-time",
    location: j.location || j.city || "Remote / On-site",
    remote: (j.workMode || "").toLowerCase() === "remote",
    status: (j.status || "published").toLowerCase(),
    applicantsCount: j.applicantsCount || 0,
    postedAt: j.createdAt || j.updatedAt,
  }));

  // 8. Recent Activity & Real Notifications
  // A. Real candidate applications for employer's jobs
  const appNotifications = (rawRecentApplications || []).map((app) => {
    const candidateName = app.candidateId?.fullName || app.studentName || "A candidate";
    const jobTitle = app.jobId?.title || app.internshipId?.title || app.opportunityTitle || "Position";
    return {
      id: `app-${app._id}`,
      type: "Application",
      title: "New Application Received",
      message: `${candidateName} applied for "${jobTitle}"`,
      actorName: candidateName,
      createdAt: app.appliedAt || app.createdAt,
      tab: "ats",
      link: "/employer/dashboard",
    };
  });

  // B. Real direct notifications from Notification collection
  const directNotifs = effectiveUserId
    ? await Notification.find({
        $or: [{ recipient: effectiveUserId }, { recipientId: effectiveUserId }],
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
    : [];

  const directNotifications = directNotifs
    .filter((n) => !/automated test/i.test(n.message || n.content || n.title || ""))
    .map((n) => ({
      id: `notif-${n._id}`,
      type: n.category || n.notificationType || "Notification",
      title: n.title || "Notification",
      message: n.message || n.content || n.preview || n.title || "New notification",
      actorName: n.sender || "CareerConnect",
      createdAt: n.createdAt,
      tab: "overview",
      link: n.actionUrl || "/employer/dashboard",
    }));

  // C. Real audit log events (strictly real account / company actions, excluding test suite spam)
  const auditOr = [];
  if (compObjectId) auditOr.push({ companyId: compObjectId });
  if (effectiveUserId) auditOr.push({ actorId: effectiveUserId });

  const rawAuditLogs = auditOr.length > 0
    ? await AuditLog.find({
        $or: auditOr,
        details: { $not: /automated test/i },
        action: {
          $nin: [
            "OPPORTUNITY_UPDATED",
            "OPPORTUNITY_FEATURED",
            "OPPORTUNITY_UNFEATURED",
            "OPPORTUNITY_APPROVED",
            "APPROVE_OPPORTUNITY",
            "REJECT_OPPORTUNITY",
          ],
        },
      })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    : [];

  const auditNotifications = rawAuditLogs.map((log) => ({
    id: `audit-${log._id}`,
    type: log.module || "Organization",
    title: (log.action || "System Event").replace(/_/g, " "),
    message: log.details || `${log.action} ${log.target || ""}`.trim() || log.action,
    actorName: log.actorName || "System",
    createdAt: log.createdAt,
    tab: log.module?.toLowerCase() === "organization" || log.action?.includes("ORGANIZATION") ? "organization" : "overview",
    link: "/employer/dashboard",
  }));

  // Combine and sort chronologically (most recent first)
  const activity = [
    ...appNotifications,
    ...directNotifications,
    ...auditNotifications,
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // 9. Company information & Verification Status
  let companyDoc = null;
  if (compObjectId) {
    companyDoc = await Company.findById(compObjectId).lean();
  }
  if (!companyDoc && user?.companyId) {
    companyDoc = await Company.findById(user.companyId).lean();
  }

  const isCompanyActive = companyDoc?.status?.toLowerCase() === "active" || companyDoc?.verified === true;
  const verificationStatus = isCompanyActive ? "verified" : (companyDoc?.status?.toLowerCase() || "unverified");

  // 10. Unread notifications for authenticated user
  const unreadNotificationsCount = effectiveUserId
    ? await Notification.countDocuments({
        $or: [{ recipient: effectiveUserId }, { recipientId: effectiveUserId }],
        isRead: false,
      })
    : 0;

  return {
    kpis: {
      activeJobs: activeJobsCount,
      newApplications: totalApplicationsCount,
      newToday: newTodayCount,
      applicationsThisWeek: applicationsThisWeekCount,
      upcomingInterviews: validUpcomingInterviews.length,
      interviewsToday: interviewsTodayCount,
      offersPending: offersPendingCount,
      teamMembers,
    },
    pipeline,
    upcomingInterviews,
    recentApplications,
    activeJobs,
    activity,
    company: {
      id: companyDoc?._id?.toString() || (compObjectId ? compObjectId.toString() : null),
      name: companyDoc?.name || profile?.companyName || user?.companyName || "Your Company",
      logo: companyDoc?.logo || user?.profileImage || "",
      verificationStatus,
    },
    profileCompletion: user?.profileCompletion || profile?.profileCompletion || 85,
    unreadNotificationsCount,
    // Backwards compatibility fields for legacy components
    stats: {
      activeJobs: activeJobsCount,
      applications: totalApplicationsCount,
      upcomingInterviews: validUpcomingInterviews.length,
      interviews: validUpcomingInterviews.length,
      teamStaff: teamMembers,
    },
  };
};

module.exports = {
  getEmployerDashboardData,
  normalizeInterviewType,
  normalizeStage,
};

