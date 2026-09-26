const Interview = require("../models/Interview");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const User = require("../models/User");
const notificationService = require("../services/notificationService");
const socketService = require("../services/socketService");
const aiInterviewService = require("../services/aiInterviewService");

// Helper to get or create EmployerProfile for the authenticated user
const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company Organization",
    });
  }
  return profile._id;
};

// Helper to verify employer ownership of a job/internship/application
const verifyEmployerApplicationAccess = async (employerProfileId, userId, applicationId) => {
  const allEmployerJobs = await Job.find(
    {
      $or: [{ createdBy: userId }, { employerId: employerProfileId }],
    },
    "_id"
  );

  const allEmployerInternships = await Internship.find(
    {
      $or: [{ createdBy: userId }, { employerId: employerProfileId }],
    },
    "_id"
  );

  const jobIds = allEmployerJobs.map((j) => j._id);
  const internshipIds = allEmployerInternships.map((i) => i._id);

  const orConditions = [
    { employerId: employerProfileId },
    { employerId: userId },
  ];
  if (jobIds.length > 0) orConditions.push({ jobId: { $in: jobIds } });
  if (internshipIds.length > 0) orConditions.push({ internshipId: { $in: internshipIds } });

  return await Application.findOne({
    _id: applicationId,
    $or: orConditions,
  });
};

const isCandidateOwner = (interview, user) =>
  Boolean(interview?.candidateId && String(interview.candidateId) === String(user?._id));

const buildAiContext = async (interview) => {
  const [job, internship, application] = await Promise.all([
    interview.jobId ? Job.findById(interview.jobId).select("title description requirements requiredSkills skills") : null,
    interview.internshipId ? Internship.findById(interview.internshipId).select("title description requirements requiredSkills skills") : null,
    Application.findById(interview.applicationId).select("skills experience opportunityTitle"),
  ]);
  const opportunity = job || internship;
  const requirements = opportunity?.requirements;
  return {
    title: opportunity?.title || application?.opportunityTitle || interview.title,
    description: opportunity?.description || "",
    requirements: Array.isArray(requirements) ? requirements.join(", ") : requirements || "",
    skills: application?.skills || opportunity?.requiredSkills || opportunity?.skills || [],
    roundName: interview.roundName,
  };
};

const isEmployerUser = (user) =>
  user?.role === "employer" ||
  user?.userType === "employer" ||
  user?.role === "COMPANY_ADMIN" ||
  user?.adminLevel === "COMPANY_ADMIN";

const employerInterviewQuery = (interviewId, employerProfileId, userId) => ({
  _id: interviewId,
  $or: [{ employerId: employerProfileId }, { employerId: userId }],
});

/**
 * GET /api/interviews
 * List interviews for employer or candidate with search & dynamic filters
 */
exports.getInterviews = async (req, res, next) => {
  try {
    const isEmployer = isEmployerUser(req.user);
    let query = {};

    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      query.$or = [
        { employerId: employerProfileId },
        { employerId: req.user._id },
      ];
    } else {
      // Find all application IDs associated with this candidate (by user ID or email)
      const userEmails = [req.user.email].filter(Boolean);
      const userApps = await Application.find({
        $or: [
          { candidateId: req.user._id },
          { email: { $in: userEmails } },
          { studentEmail: { $in: userEmails } },
        ],
      }).select("_id");
      const appIds = userApps.map((a) => a._id);

      // Find any other User records sharing the same email (e.g. Google vs Local auth)
      const sameEmailUsers = await User.find({ email: { $in: userEmails } }).select("_id");
      const candidateUserIds = sameEmailUsers.map((u) => u._id);
      if (!candidateUserIds.some((id) => id.toString() === req.user._id.toString())) {
        candidateUserIds.push(req.user._id);
      }

      query.$or = [
        { candidateId: { $in: candidateUserIds } },
        { applicationId: { $in: appIds } },
      ];
    }

    const { status, jobId, internshipId, roundNumber, result, search } = req.query;

    if (status && status !== "All") {
      const normalized = status.toLowerCase();
      query.status = { $in: [status, normalized, status.charAt(0).toUpperCase() + status.slice(1)] };
    }

    if (result && result !== "All") {
      const normalizedRes = result.toLowerCase();
      query.result = { $in: [result, normalizedRes, result.charAt(0).toUpperCase() + result.slice(1)] };
    }

    if (jobId) query.jobId = jobId;
    if (internshipId) query.internshipId = internshipId;
    if (roundNumber && roundNumber !== "All") query.roundNumber = Number(roundNumber);

    let interviews = await Interview.find(query)
      .populate("candidateId", "fullName email phone profileImage userType location")
      .populate("jobId", "title department location type")
      .populate("internshipId", "title department location type companyName")
      .populate(
        "applicationId",
        "studentName studentEmail studentPhone education skills experience portfolioUrl resumeUrl status stage appliedAt opportunityType opportunityTitle"
      )
      .populate("employerId", "companyName logo officialEmail mobile location")
      .populate("interviewerId", "fullName email department")
      .sort({ scheduledDate: 1, startTime: 1, scheduledTime: 1 });

    // In-memory search if specified
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      interviews = interviews.filter((i) => {
        const cName = i.candidateId?.fullName?.toLowerCase() || "";
        const cEmail = i.candidateId?.email?.toLowerCase() || "";
        const jTitle = i.jobId?.title?.toLowerCase() || i.internshipId?.title?.toLowerCase() || "";
        const round = i.roundName?.toLowerCase() || "";
        const interviewer = i.interviewerName?.toLowerCase() || "";
        const appId = i.applicationId?._id?.toString() || "";
        return (
          cName.includes(q) ||
          cEmail.includes(q) ||
          jTitle.includes(q) ||
          round.includes(q) ||
          interviewer.includes(q) ||
          appId.includes(q)
        );
      });
    }

    // Candidate view sanitization: do not expose internal scorecards/feedback notes
    if (!isEmployer) {
      interviews = interviews.map((item) => {
        const obj = item.toObject();
        if (obj.status !== "completed" && obj.status !== "Completed") {
          delete obj.scorecard;
        } else if (obj.scorecard) {
          // Expose only overallScore and recommendation to candidate, hide internal notes
          obj.scorecard = {
            overallScore: obj.scorecard.overallScore,
            recommendation: obj.scorecard.recommendation,
          };
        }
        delete obj.feedback;
        delete obj.interviewerFeedback;
        delete obj.notes;
        if (obj.aiInterview) {
          delete obj.aiInterview.questions;
          delete obj.aiInterview.answers;
          delete obj.aiInterview.evaluationSummary;
          delete obj.aiInterview.integrityFlags;
          delete obj.aiInterview.failureReason;
          delete obj.aiInterview.generationModel;
          delete obj.aiInterview.evaluationModel;
        }
        return obj;
      });
    }

    // Base query for stats and tabCounts
    const allForCounts = await Interview.find(isEmployer ? {
      $or: [
        { employerId: await getEmployerProfileId(req.user) },
        { employerId: req.user._id },
      ],
    } : query.$or ? { $or: query.$or } : {});

    const total = allForCounts.length;
    const scheduled = allForCounts.filter((i) => (i.status || "").toLowerCase() === "scheduled").length;
    const completed = allForCounts.filter((i) => (i.status || "").toLowerCase() === "completed").length;
    const rescheduled = allForCounts.filter((i) => (i.status || "").toLowerCase() === "rescheduled").length;
    const cancelled = allForCounts.filter((i) => (i.status || "").toLowerCase() === "cancelled").length;

    const upcoming = scheduled + rescheduled;
    const pendingEvaluation = allForCounts.filter((i) => {
      const isComp = (i.status || "").toLowerCase() === "completed";
      const hasScorecard =
        (i.scorecard && i.scorecard.submittedAt) ||
        (i.feedback && i.feedback.submittedAt) ||
        (i.scorecard?.overallScore > 0);
      return isComp && !hasScorecard;
    }).length;

    const stats = {
      upcoming,
      completed,
      pendingEvaluation,
      total,
      scheduled,
      rescheduled,
      cancelled,
    };

    const tabCounts = {
      All: total,
      Scheduled: scheduled,
      Completed: completed,
      Rescheduled: rescheduled,
      Cancelled: cancelled,
    };

    return res.status(200).json({
      success: true,
      count: interviews.length,
      interviews,
      stats,
      tabCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/statistics (and /api/interviews/stats)
 * Real-time MongoDB metrics for employer or candidate
 */
exports.getInterviewStats = async (req, res, next) => {
  try {
    const isEmployer = isEmployerUser(req.user);
    let baseQuery = {};

    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      baseQuery.employerId = employerProfileId;
    } else {
      const userEmails = [req.user.email].filter(Boolean);
      const userApps = await Application.find({
        $or: [
          { candidateId: req.user._id },
          { email: { $in: userEmails } },
          { studentEmail: { $in: userEmails } },
        ],
      }).select("_id");
      const appIds = userApps.map((a) => a._id);

      const sameEmailUsers = await User.find({ email: { $in: userEmails } }).select("_id");
      const candidateUserIds = sameEmailUsers.map((u) => u._id);
      if (!candidateUserIds.some((id) => id.toString() === req.user._id.toString())) {
        candidateUserIds.push(req.user._id);
      }

      baseQuery.$or = [
        { candidateId: { $in: candidateUserIds } },
        { applicationId: { $in: appIds } },
      ];
    }

    const allInterviews = await Interview.find(baseQuery);
    const todayStr = new Date().toISOString().split("T")[0];

    const total = allInterviews.length;
    const scheduled = allInterviews.filter((i) => (i.status || "").toLowerCase() === "scheduled").length;
    const completed = allInterviews.filter((i) => (i.status || "").toLowerCase() === "completed").length;
    const rescheduled = allInterviews.filter((i) => (i.status || "").toLowerCase() === "rescheduled").length;
    const cancelled = allInterviews.filter((i) => (i.status || "").toLowerCase() === "cancelled").length;

    const upcoming = scheduled + rescheduled;
    const pendingEvaluation = allInterviews.filter((i) => {
      const isComp = (i.status || "").toLowerCase() === "completed";
      const hasScorecard =
        (i.scorecard && i.scorecard.submittedAt) ||
        (i.feedback && i.feedback.submittedAt) ||
        (i.scorecard?.overallScore > 0);
      return isComp && !hasScorecard;
    }).length;

    const scored = allInterviews.filter((i) => {
      const score = i.scorecard?.overallScore || i.feedback?.overallScore || i.feedback?.rating;
      return (i.status || "").toLowerCase() === "completed" && score > 0;
    });

    const avgScore =
      scored.length > 0
        ? Number(
            (
              scored.reduce((acc, curr) => {
                const s = curr.scorecard?.overallScore || curr.feedback?.overallScore || curr.feedback?.rating || 0;
                return acc + s;
              }, 0) / scored.length
            ).toFixed(1)
          )
        : 0;

    const passed = allInterviews.filter((i) => (i.result || "").toLowerCase() === "passed").length;
    const failed = allInterviews.filter((i) => (i.result || "").toLowerCase() === "failed").length;

    let selectedCount = 0;
    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      selectedCount = await Application.countDocuments({
        employerId: employerProfileId,
        status: { $in: ["Selected", "Hired"] },
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        upcoming,
        completed,
        pendingEvaluation,
        total,
        scheduled,
        rescheduled,
        cancelled,
        avgScore,
        passed,
        failed,
        selected: selectedCount,
        recommendedHire: passed,
      },
      tabCounts: {
        All: total,
        Scheduled: scheduled,
        Completed: completed,
        Rescheduled: rescheduled,
        Cancelled: cancelled,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/eligible-candidates
 * Returns applications eligible for interview scheduling (Shortlisted, or previous round passed)
 */
exports.getEligibleCandidates = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);

    const allEmployerJobs = await Job.find(
      {
        $or: [{ createdBy: req.user._id }, { employerId: employerProfileId }],
      },
      "_id title department"
    );

    const allEmployerInternships = await Internship.find(
      {
        $or: [{ createdBy: req.user._id }, { employerId: employerProfileId }],
      },
      "_id title department"
    );

    const jobIds = allEmployerJobs.map((j) => j._id);
    const internshipIds = allEmployerInternships.map((i) => i._id);

    const orConditions = [
      { employerId: employerProfileId },
      { employerId: req.user._id },
    ];
    if (jobIds.length > 0) orConditions.push({ jobId: { $in: jobIds } });
    if (internshipIds.length > 0) orConditions.push({ internshipId: { $in: internshipIds } });

    // Eligible applications must be Shortlisted, Approved, Interview Scheduled, or Interview Completed (for next round)
    // NEVER rejected or withdrawn
    const applications = await Application.find({
      $or: orConditions,
      status: { $in: ["Shortlisted", "Approved", "Interview", "Interview Scheduled", "Interview Completed"] },
    })
      .populate("candidateId", "fullName email phone profileImage userType location skills")
      .populate("jobId", "title department location")
      .populate("internshipId", "title department location companyName")
      .sort({ appliedAt: -1 });

    // Enhance each application with its interview history
    const eligibleList = await Promise.all(
      applications.map(async (app) => {
        const appInterviews = await Interview.find({ applicationId: app._id })
          .sort({ roundNumber: 1 });

        const totalRounds = appInterviews.length;
        const lastInterview = totalRounds > 0 ? appInterviews[totalRounds - 1] : null;

        // Eligibility determination
        let isEligible = false;
        let nextRoundNumber = 1;
        let eligibilityReason = "";

        if (totalRounds === 0) {
          isEligible = app.status === "Shortlisted" || app.status === "Approved" || app.status === "Interview";
          nextRoundNumber = 1;
          eligibilityReason = isEligible ? "Ready for Round 1" : "Candidate not shortlisted yet";
        } else {
          const lastStatus = (lastInterview.status || "").toLowerCase();
          const lastResult = (lastInterview.result || "").toLowerCase();

          if (lastStatus === "scheduled" || lastStatus === "rescheduled") {
            isEligible = false;
            nextRoundNumber = lastInterview.roundNumber;
            eligibilityReason = `Round ${lastInterview.roundNumber} is currently scheduled`;
          } else if (lastStatus === "completed" && lastResult === "passed") {
            isEligible = true;
            nextRoundNumber = lastInterview.roundNumber + 1;
            eligibilityReason = `Cleared Round ${lastInterview.roundNumber}. Ready for Round ${nextRoundNumber}`;
          } else if (lastResult === "failed") {
            isEligible = false;
            eligibilityReason = `Candidate did not clear Round ${lastInterview.roundNumber}`;
          } else {
            isEligible = false;
            eligibilityReason = `Awaiting scorecard for Round ${lastInterview.roundNumber}`;
          }
        }

        // Configured interview process rounds with real completion and lock status
        const defaultRounds = [
          { roundNumber: 1, name: "Round 1 - Technical Assessment", type: "Technical", durationMinutes: 45 },
          { roundNumber: 2, name: "Round 2 - Live Problem Solving & Coding", type: "Coding", durationMinutes: 45 },
          { roundNumber: 3, name: "Round 3 - HR & Culture Fit Discussion", type: "HR", durationMinutes: 30 },
        ];

        const roundsPipeline = defaultRounds.map((r) => {
          const matchingInterview = appInterviews.find((i) => i.roundNumber === r.roundNumber);
          if (matchingInterview) {
            const s = (matchingInterview.status || "").toLowerCase();
            const res = (matchingInterview.result || "").toLowerCase();
            if (s === "completed") {
              return {
                ...r,
                status: res === "passed" ? "completed" : "failed",
                label: res === "passed" ? "Completed" : "Not Cleared",
                interviewId: matchingInterview._id,
                isSelectable: false,
              };
            } else {
              return {
                ...r,
                status: "scheduled",
                label: "Already Scheduled",
                interviewId: matchingInterview._id,
                isSelectable: false,
              };
            }
          }

          if (r.roundNumber === nextRoundNumber && isEligible) {
            return {
              ...r,
              status: "available",
              label: "Available",
              isSelectable: true,
            };
          }

          return {
            ...r,
            status: "locked",
            label: "Locked",
            isSelectable: false,
          };
        });

        return {
          applicationId: app._id,
          candidateId: app.candidateId?._id,
          candidateName: app.studentName || app.candidateId?.fullName || "Candidate",
          candidateEmail: app.studentEmail || app.candidateId?.email || "",
          candidatePhone: app.studentPhone || app.candidateId?.phone || "",
          candidatePhoto: app.candidateId?.profileImage || "",
          opportunityType: app.opportunityType,
          opportunityTitle: app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Opportunity",
          jobId: app.jobId?._id || null,
          internshipId: app.internshipId?._id || null,
          applicationStatus: app.status,
          appliedAt: app.appliedAt,
          resumeUrl: app.resumeUrl,
          totalRoundsConducted: totalRounds,
          nextRoundNumber,
          isEligible,
          eligibilityReason,
          roundsPipeline,
          lastInterview: lastInterview
            ? {
                roundNumber: lastInterview.roundNumber,
                roundName: lastInterview.roundName,
                status: lastInterview.status,
                result: lastInterview.result,
                score: lastInterview.scorecard?.overallScore || 0,
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: eligibleList.length,
      candidates: eligibleList,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/interviews/candidate/:candidateId - employer-scoped interview history */
exports.getCandidateInterviewHistory = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const interviews = await Interview.find({
      candidateId: req.params.candidateId,
      $or: [{ employerId: employerProfileId }, { employerId: req.user._id }],
    })
      .populate("jobId", "title department")
      .populate("internshipId", "title department")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: interviews.length, interviews });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/availability
 * Returns available time slots for a given date, checking interviewer & candidate conflicts
 */
exports.getInterviewAvailability = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const { date, interviewerId, interviewerName, candidateId, duration = 45 } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required to check availability" });
    }

    const durationNum = Number(duration) || 45;

    // Define standard business hour slot templates
    const baseSlotDefinitions = [
      { start: "09:30 AM", end: "10:15 AM" },
      { start: "10:30 AM", end: "11:15 AM" },
      { start: "11:30 AM", end: "12:15 PM" },
      { start: "02:00 PM", end: "02:45 PM" },
      { start: "03:00 PM", end: "03:45 PM" },
      { start: "04:00 PM", end: "04:45 PM" },
      { start: "05:00 PM", end: "05:45 PM" },
    ];

    // Find all active scheduled or rescheduled interviews on that date
    const query = {
      scheduledDate: date,
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
    };

    query.$or = [{ employerId: employerProfileId }, { employerId: req.user._id }];

    const existingInterviews = await Interview.find(query).select(
      "scheduledTime startTime endTime interviewerId interviewerName candidateId status"
    );

    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = date === todayStr;
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const slots = baseSlotDefinitions.map((slot) => {
      const slotTimeStr = `${slot.start} - ${slot.end}`;

      // Check if slot has already passed today
      let isPast = false;
      if (isToday) {
        const [timePart, meridiem] = slot.start.split(" ");
        const [hStr, mStr] = timePart.split(":");
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (meridiem === "PM" && h !== 12) h += 12;
        if (meridiem === "AM" && h === 12) h = 0;

        if (h < currentHours || (h === currentHours && m <= currentMinutes)) {
          isPast = true;
        }
      }

      // Check conflict with existing interview
      let conflictReason = null;
      for (const inv of existingInterviews) {
        const invTime = (inv.scheduledTime || inv.startTime || "").trim().toLowerCase();
        const matchesSlot =
          invTime.includes(slot.start.toLowerCase()) ||
          invTime === slotTimeStr.toLowerCase();

        if (matchesSlot) {
          if (
            (interviewerId && inv.interviewerId && inv.interviewerId.toString() === interviewerId.toString()) ||
            (interviewerName && inv.interviewerName && inv.interviewerName.toLowerCase() === interviewerName.toLowerCase())
          ) {
            conflictReason = "Interviewer has a conflicting interview";
            break;
          }
          if (candidateId && inv.candidateId && inv.candidateId.toString() === candidateId.toString()) {
            conflictReason = "Candidate already booked at this time";
            break;
          }
        }
      }

      const available = !isPast && !conflictReason;

      return {
        slot: slotTimeStr,
        startTime: slot.start,
        endTime: slot.end,
        durationMinutes: durationNum,
        available,
        reason: conflictReason || (isPast ? "Time slot has passed" : "Available"),
      };
    });

    return res.status(200).json({
      success: true,
      date,
      slots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/:id
 * Detailed interview information including candidate profile and multi-round timeline
 */
exports.getInterviewById = async (req, res, next) => {
  try {
    const isEmployer = isEmployerUser(req.user);
    const interview = await Interview.findById(req.params.id)
      .populate("candidateId", "fullName email phone profileImage userType location skills experience")
      .populate("jobId", "title department location type description requirements")
      .populate("internshipId", "title department location type companyName description")
      .populate("employerId", "companyName logo officialEmail mobile location website")
      .populate("applicationId", "studentName studentEmail studentPhone education skills experience portfolioUrl resumeUrl status stage appliedAt opportunityType opportunityTitle")
      .populate("interviewerId", "fullName email department");

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    // Authorization check
    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      if (!interview.employerId || (!interview.employerId._id.equals(employerProfileId) && !interview.employerId._id.equals(req.user._id))) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this interview record" });
      }
    } else {
      if (!interview.candidateId || !interview.candidateId._id.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this interview record" });
      }
    }

    // Fetch all rounds for this application for timeline display
    const roundTimeline = await Interview.find({ applicationId: interview.applicationId?._id })
      .sort({ roundNumber: 1 })
      .select("roundNumber roundName interviewType scheduledDate startTime duration status result scorecard.overallScore");

    const interviewData = interview.toObject();

    // Sanitize for candidate
    if (!isEmployer) {
      interviewData.scorecard = interviewData.scorecard && ["completed", "Completed"].includes(interviewData.status) ? {
        overallScore: interviewData.scorecard.overallScore,
        recommendation: interviewData.scorecard.recommendation,
      } : undefined;
      delete interviewData.feedback;
      delete interviewData.interviewerFeedback;
      delete interviewData.notes;
      if (interviewData.aiInterview) {
        delete interviewData.aiInterview.answers;
        delete interviewData.aiInterview.evaluationSummary;
        delete interviewData.aiInterview.integrityFlags;
        delete interviewData.aiInterview.failureReason;
        delete interviewData.aiInterview.generationModel;
        delete interviewData.aiInterview.evaluationModel;
      }
    }

    return res.status(200).json({
      success: true,
      interview: interviewData,
      roundTimeline,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews
 * Schedule a new interview (Backend enforces candidate eligibility & multi-round prerequisites)
 */
exports.scheduleInterview = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const {
      applicationId,
      candidateId,
      jobId,
      internshipId,
      roundNumber = 1,
      roundName,
      title,
      interviewType = "Online",
      interviewFormat = "manual",
      interviewerId,
      interviewerName,
      interviewerEmail,
      interviewerRole,
      scheduledDate,
      startTime,
      scheduledTime,
      endTime,
      duration = 45,
      durationMinutes = 45,
      meetingMode = "Online",
      meetingLink,
      location,
      instructions,
      preparationGuidelines,
      notes,
    } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "An active applicationId is required to schedule an interview",
      });
    }

    // 1. Verify application exists and belongs to this employer
    const application = await verifyEmployerApplicationAccess(employerProfileId, req.user._id, applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found or does not belong to your company",
      });
    }

    // 2. Prevent scheduling for rejected or withdrawn applications
    if (application.status === "Rejected" || application.status === "Withdrawn") {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule interview. Application is currently ${application.status}.`,
      });
    }

    const roundNum = Number(roundNumber) || 1;

    // 3. Multi-Round & Eligibility Enforcement
    if (roundNum === 1) {
      // First round requires candidate to be Shortlisted (or already in interview stage, or Approved)
      if (
        application.status !== "Shortlisted" &&
        application.status !== "Approved" &&
        application.status !== "Interview" &&
        application.status !== "Interview Scheduled"
      ) {
        return res.status(400).json({
          success: false,
          message: "Only shortlisted candidates are eligible for an interview. Please shortlist this candidate first.",
        });
      }
    } else {
      // Round 2+ requires previous round (roundNum - 1) to be completed and passed
      const previousRound = await Interview.findOne({
        applicationId: application._id,
        roundNumber: roundNum - 1,
      });

      if (!previousRound) {
        return res.status(400).json({
          success: false,
          message: `Cannot schedule Round ${roundNum}. Round ${roundNum - 1} has not been created yet.`,
        });
      }

      const prevStatus = (previousRound.status || "").toLowerCase();
      const prevResult = (previousRound.result || "").toLowerCase();

      if (prevStatus !== "completed" || prevResult !== "passed") {
        return res.status(400).json({
          success: false,
          message: `Cannot schedule Round ${roundNum}. Round ${roundNum - 1} must be completed with result 'Passed' first.`,
        });
      }
    }

    // 4. Validate no past dates
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: "Interview date is required." });
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (scheduledDate < todayStr) {
      return res.status(400).json({
        success: false,
        message: "Interview date cannot be in the past.",
      });
    }

    // 5. Validate interview format and manual meeting specifics
    const finalFormat = String(interviewFormat || "manual").toLowerCase();
    if (!["manual", "ai"].includes(finalFormat)) {
      return res.status(400).json({ success: false, message: "Interview format must be manual or ai." });
    }
    const finalType = interviewType || "Online";
    const finalMeetingMode = meetingMode || (["Online", "Offline"].includes(finalType) ? finalType : "Online");
    if (finalFormat === "manual" && finalMeetingMode === "Online" && !meetingLink) {
      return res.status(400).json({
        success: false,
        message: "Meeting link is required for Online interviews.",
      });
    }
    if (finalFormat === "manual" && finalMeetingMode === "Offline" && !location) {
      return res.status(400).json({
        success: false,
        message: "Physical location is required for Offline/In-Person interviews.",
      });
    }

    // 6. Prevent duplicate active interview for the exact same round
    const existingActiveRound = await Interview.findOne({
      applicationId: application._id,
      roundNumber: roundNum,
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
    });

    if (existingActiveRound) {
      return res.status(400).json({
        success: false,
        message: `Round ${roundNum} is already actively scheduled for this candidate. Use Reschedule instead.`,
      });
    }

    const finalTime = startTime || scheduledTime || "11:00 AM";
    const finalDuration = Number(duration || durationMinutes) || 45;

    // 6.1 Prevent double-booking / conflicting slot for this interviewer or candidate
    const conflictQuery = {
      scheduledDate,
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
    };

    const conflictOr = [];
    if (interviewerId) conflictOr.push({ interviewerId });
    if (interviewerName) conflictOr.push({ interviewerName });
    conflictOr.push({ candidateId: application.candidateId });

    const conflictingInterview = await Interview.findOne({
      ...conflictQuery,
      $and: [
        { $or: [{ scheduledTime: finalTime }, { startTime: finalTime }] },
        { $or: conflictOr },
      ],
    });

    if (conflictingInterview) {
      const isCandidateConflict = conflictingInterview.candidateId?.toString() === application.candidateId?.toString();
      return res.status(409).json({
        success: false,
        message: isCandidateConflict
          ? `The candidate already has an interview scheduled on ${scheduledDate} at ${finalTime}. Please choose another time slot.`
          : `Interviewer ${interviewerName || "selected"} is already booked for an interview on ${scheduledDate} at ${finalTime}. Please choose another available slot.`,
      });
    }

    // 7. Create Interview
    const interview = await Interview.create({
      employerId: employerProfileId,
      companyId: application.companyId || req.user.companyId || null,
      candidateId: application.candidateId,
      jobId: application.jobId || jobId || null,
      internshipId: application.internshipId || internshipId || null,
      applicationId: application._id,
      title: title || `${roundName || `Round ${roundNum} Interview`}`,
      roundNumber: roundNum,
      roundName: roundName || `Round ${roundNum} - ${finalType}`,
      interviewType: finalType,
      interviewFormat: finalFormat,
      interviewerId: interviewerId || null,
      interviewerName: interviewerName || req.user.fullName || "Hiring Lead",
      interviewerEmail: interviewerEmail || req.user.email || "",
      interviewerRole: interviewerRole || "Interviewer",
      scheduledDate,
      startTime: finalTime,
      scheduledTime: finalTime,
      endTime: endTime || "",
      duration: finalDuration,
      durationMinutes: finalDuration,
      meetingMode: finalFormat === "ai" ? "AI Interview" : finalMeetingMode,
      meetingLink: finalFormat === "manual" ? meetingLink || "" : "",
      location: finalFormat === "manual" ? location || "" : "",
      instructions: instructions || notes || "",
      preparationGuidelines: preparationGuidelines || "",
      notes: notes || "",
      status: "scheduled",
      result: "pending",
    });

    // 8. Update Application Status to "Interview Scheduled"
    application.status = "Interview Scheduled";
    application.stage = `Interview Round ${roundNum}`;
    application.notes.push({
      text: `Interview Round ${roundNum} (${interview.roundName}) scheduled for ${scheduledDate} at ${finalTime}`,
      addedBy: req.user._id,
      createdAt: new Date(),
    });
    await application.save();

    // 9. Dispatch in-app notification to candidate
    try {
      const oppTitle =
        application.opportunityTitle ||
        (await Job.findById(interview.jobId).select("title"))?.title ||
        (await Internship.findById(interview.internshipId).select("title"))?.title ||
        "Opportunity";
      const compName = application.companyName || req.user.fullName || "Employer";

      await notificationService.createNotification({
        recipientId: application.candidateId,
        senderId: req.user._id,
        title: "Interview Scheduled 📅",
        message: `Your ${finalFormat === "ai" ? "AI " : ""}${interview.roundName || `Round ${roundNum}`} for ${oppTitle} at ${compName} has been scheduled for ${scheduledDate} at ${finalTime}.`,
        notificationType: "INTERVIEW_SCHEDULED",
        relatedInterviewId: interview._id,
        relatedApplicationId: application._id,
        actionUrl: "/student/dashboard?tab=interviews",
        metadata: {
          roundNumber: roundNum,
          scheduledDate,
          scheduledTime: finalTime,
          meetingMode: finalFormat === "ai" ? "AI Interview" : finalMeetingMode,
          interviewFormat: finalFormat,
          meetingLink: interview.meetingLink,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch schedule notification:", notifErr.message);
    }

    // Real-time socket broadcast
    socketService.emitInterviewScheduled(application.candidateId, interview);
    socketService.emitApplicationUpdated(application);

    return res.status(201).json({
      success: true,
      message: `Interview Round ${roundNum} scheduled successfully. Candidate dashboard has been updated.`,
      interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/interviews/:id/reschedule (also supports PATCH)
 * Reschedules an existing interview record without creating duplicate documents
 */
exports.rescheduleInterview = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const {
      scheduledDate,
      startTime,
      scheduledTime,
      endTime,
      duration,
      durationMinutes,
      meetingMode,
      meetingLink,
      location,
      rescheduledReason,
      preparationGuidelines,
    } = req.body;

    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (!["scheduled", "rescheduled", "confirmed"].includes(String(interview.status).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Only an active scheduled interview can be rescheduled.",
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: "New interview date is required." });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (scheduledDate < todayStr) {
      return res.status(400).json({ success: false, message: "New interview date cannot be in the past." });
    }

    const prevDate = interview.scheduledDate;
    const prevTime = interview.scheduledTime || interview.startTime || "";
    const newTime = startTime || scheduledTime || prevTime || "11:00 AM";
    const finalReason = rescheduledReason || "Rescheduled by employer";

    const conflictTargets = [{ candidateId: interview.candidateId }];
    if (interview.interviewFormat !== "ai") {
      if (interview.interviewerId) conflictTargets.push({ interviewerId: interview.interviewerId });
      else if (interview.interviewerName) conflictTargets.push({ interviewerName: interview.interviewerName });
    }
    const conflictingInterview = await Interview.findOne({
      _id: { $ne: interview._id },
      scheduledDate,
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
      $and: [
        { $or: [{ scheduledTime: newTime }, { startTime: newTime }] },
        { $or: conflictTargets },
      ],
    });
    if (conflictingInterview) {
      return res.status(409).json({
        success: false,
        message: "The candidate or interviewer is already booked for this time slot.",
      });
    }

    // Archive previous schedule into history
    if (!interview.rescheduleHistory) {
      interview.rescheduleHistory = [];
    }
    interview.rescheduleHistory.push({
      previousDate: prevDate,
      previousStartTime: prevTime,
      newDate: scheduledDate,
      newStartTime: newTime,
      reason: finalReason,
      rescheduledAt: new Date(),
      rescheduledBy: req.user._id,
    });

    interview.previousDate = prevDate;
    interview.previousStartTime = prevTime;
    interview.newDate = scheduledDate;
    interview.newStartTime = newTime;
    interview.scheduledDate = scheduledDate;
    interview.startTime = newTime;
    interview.scheduledTime = newTime;
    if (endTime !== undefined) interview.endTime = endTime;
    interview.scheduledAt = null;
    if (duration || durationMinutes) {
      const dur = Number(duration || durationMinutes);
      interview.duration = dur;
      interview.durationMinutes = dur;
    }
    if (interview.interviewFormat !== "ai") {
      if (meetingMode) interview.meetingMode = meetingMode;
      if (meetingLink !== undefined) interview.meetingLink = meetingLink;
      if (location !== undefined) interview.location = location;
    }
    if (preparationGuidelines !== undefined) interview.preparationGuidelines = preparationGuidelines;
    interview.status = "rescheduled";
    interview.rescheduledAt = new Date();
    interview.rescheduledBy = req.user._id;
    interview.rescheduledReason = finalReason;

    await interview.save();

    // Update application timeline note
    await Application.findByIdAndUpdate(interview.applicationId, {
      status: "Interview Scheduled",
      stage: `Interview Round ${interview.roundNumber}`,
      $push: {
        notes: {
          text: `Interview Round ${interview.roundNumber} rescheduled from ${prevDate} (${prevTime}) to ${scheduledDate} (${newTime}). Reason: ${finalReason}`,
          addedBy: req.user._id,
          createdAt: new Date(),
        },
      },
    });

    // Create Candidate In-App Notification
    try {
      const app = await Application.findById(interview.applicationId).select("opportunityTitle companyName candidateId");
      const oppTitle = app?.opportunityTitle || "Opportunity";

      await notificationService.createNotification({
        recipientId: interview.candidateId || app?.candidateId,
        senderId: req.user._id,
        title: "Interview Rescheduled 🔄",
        message: `Your ${interview.roundName || `Round ${interview.roundNumber}`} interview for ${oppTitle} has been rescheduled from ${prevDate} (${prevTime}) to ${scheduledDate} (${newTime}).`,
        notificationType: "INTERVIEW_RESCHEDULED",
        relatedInterviewId: interview._id,
        relatedApplicationId: interview.applicationId,
        actionUrl: "/student/dashboard?tab=interviews",
        metadata: {
          roundNumber: interview.roundNumber,
          previousDate: prevDate,
          previousTime: prevTime,
          newDate: scheduledDate,
          newTime,
          reason: finalReason,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch reschedule notification:", notifErr.message);
    }

    // Real-time socket broadcast
    socketService.emitInterviewRescheduled(interview.candidateId, interview);

    return res.status(200).json({
      success: true,
      message: "Interview rescheduled successfully",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/interviews/:id/cancel (also supports PATCH)
 * Cancels an interview document (does NOT delete).
 * Decoupled from application: candidate stays Shortlisted!
 */
exports.cancelInterview = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const { cancellationReason, cancellationMessage } = req.body;

    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (!["scheduled", "rescheduled", "confirmed", "ongoing"].includes(String(interview.status).toLowerCase())) {
      return res.status(409).json({ success: false, message: "Only an active interview can be cancelled" });
    }

    const finalReason = cancellationReason || "Interviewer unavailable";
    const finalMessage = cancellationMessage || "";

    interview.status = "cancelled";
    interview.cancelledAt = new Date();
    interview.cancelledBy = req.user._id;
    interview.cancellationReason = finalReason;
    interview.cancellationMessage = finalMessage;
    await interview.save();

    // Check if any other scheduled interviews remain for this application
    const activeRemaining = await Interview.countDocuments({
      applicationId: interview.applicationId,
      status: { $in: ["scheduled", "rescheduled", "Scheduled", "Rescheduled"] },
    });

    // IMPORTANT: Cancelling an interview must NOT reject the candidate.
    // Ensure application remains Shortlisted so employer can schedule a new interview or reschedule.
    if (activeRemaining === 0) {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Shortlisted",
        stage: "Shortlisted",
        $push: {
          notes: {
            text: `Interview Round ${interview.roundNumber} cancelled. Reason: ${finalReason}.${finalMessage ? ` Note: ${finalMessage}` : ""}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else {
      await Application.findByIdAndUpdate(interview.applicationId, {
        $push: {
          notes: {
            text: `Interview Round ${interview.roundNumber} cancelled. Reason: ${finalReason}.`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    }

    // Create Candidate In-App Notification
    try {
      const app = await Application.findById(interview.applicationId).select("opportunityTitle companyName candidateId");
      const oppTitle = app?.opportunityTitle || "Opportunity";

      await notificationService.createNotification({
        recipientId: interview.candidateId || app?.candidateId,
        senderId: req.user._id,
        title: "Interview Cancelled ✕",
        message: `Your ${interview.roundName || `Round ${interview.roundNumber}`} interview for ${oppTitle} scheduled for ${interview.scheduledDate} at ${interview.scheduledTime} has been cancelled. Reason: ${finalReason}.${finalMessage ? ` Note: ${finalMessage}` : ""}`,
        notificationType: "INTERVIEW_CANCELLED",
        relatedInterviewId: interview._id,
        relatedApplicationId: interview.applicationId,
        actionUrl: "/student/dashboard?tab=interviews",
        metadata: {
          roundNumber: interview.roundNumber,
          cancelledDate: interview.scheduledDate,
          cancelledTime: interview.scheduledTime,
          cancellationReason: finalReason,
          cancellationMessage: finalMessage,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch cancel notification:", notifErr.message);
    }

    // Real-time socket broadcast
    socketService.emitInterviewCancelled(interview.candidateId, interview);

    return res.status(200).json({
      success: true,
      message: "Interview has been cancelled. Application remains shortlisted.",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/interviews/:id
 * DELETE INTERVIEW RULE:
 * Only allows deleting DRAFT interviews.
 * Scheduled, completed, rescheduled, or cancelled interviews CANNOT be deleted to preserve audit history.
 */
exports.deleteInterview = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview record not found" });
    }

    // Strict Rule: Non-drafts cannot be deleted
    const isDraft = interview.isDraft === true || interview.status === "draft" || interview.status === "Draft";
    if (!isDraft) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete active or historical interview records. Scheduled, completed, rescheduled, or cancelled interviews must be preserved for audit history. Use Cancel Interview instead.",
      });
    }

    // Permanent delete only if it is a draft
    await Interview.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Draft interview deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/interviews/:id/complete (also supports PATCH)
 * Marks interview status as completed
 */
exports.completeInterview = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.interviewFormat === "ai") {
      return res.status(400).json({
        success: false,
        message: "AI interviews are completed automatically after the candidate submits all answers.",
      });
    }

    if (!["scheduled", "rescheduled", "confirmed", "ongoing"].includes(String(interview.status).toLowerCase())) {
      return res.status(409).json({ success: false, message: "Only an active interview can be completed" });
    }

    interview.status = "completed";
    await interview.save();

    await Application.findByIdAndUpdate(interview.applicationId, {
      status: "Interview Completed",
    });

    // Real-time socket broadcast
    socketService.emitInterviewStatusUpdated(interview.candidateId, interview);

    return res.status(200).json({
      success: true,
      message: "Interview marked as completed.",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/interviews/:id/ai/start - candidate starts their assigned AI interview */
exports.startAiInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (!isCandidateOwner(interview, req.user)) {
      return res.status(403).json({ success: false, message: "Only the assigned candidate can start this interview" });
    }
    if (interview.interviewFormat !== "ai") {
      return res.status(400).json({ success: false, message: "This is a manual interview" });
    }
    if (["evaluating", "completed"].includes(interview.aiInterview?.status)) {
      return res.status(409).json({ success: false, message: "This AI interview is already being evaluated or completed" });
    }
    if (!["scheduled", "rescheduled"].includes(String(interview.status).toLowerCase())) {
      return res.status(409).json({ success: false, message: "This interview is not available to start" });
    }
    if (!req.body?.consentAccepted) {
      return res.status(400).json({ success: false, message: "Consent is required before starting the AI interview" });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (interview.scheduledDate && interview.scheduledDate > today) {
      return res.status(409).json({ success: false, message: "The interview can only be started on or after its scheduled date" });
    }

    if (!interview.aiInterview?.questions?.length) {
      const context = await buildAiContext(interview);
      const generated = await aiInterviewService.generateQuestions(context);
      interview.aiInterview.questions = generated.questions;
      interview.aiInterview.generationModel = generated.modelName;
    }
    interview.aiInterview.status = "in_progress";
    interview.aiInterview.consentAcceptedAt ||= new Date();
    interview.aiInterview.startedAt ||= new Date();
    interview.aiInterview.lastActivityAt = new Date();
    interview.aiInterview.failureReason = "";
    await interview.save();

    return res.status(200).json({
      success: true,
      interviewId: interview._id,
      status: interview.aiInterview.status,
      startedAt: interview.aiInterview.startedAt,
      questions: interview.aiInterview.questions,
      answeredQuestionIds: interview.aiInterview.answers.map((answer) => answer.questionId),
      answers: interview.aiInterview.answers.map((answer) => ({
        questionId: answer.questionId,
        answer: answer.answer,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/interviews/:id/ai/answer - autosave one candidate answer */
exports.saveAiInterviewAnswer = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (!isCandidateOwner(interview, req.user)) {
      return res.status(403).json({ success: false, message: "Only the assigned candidate can answer this interview" });
    }
    if (interview.interviewFormat !== "ai" || !["in_progress", "failed"].includes(interview.aiInterview?.status)) {
      return res.status(409).json({ success: false, message: "AI interview is not in progress" });
    }
    const questionId = String(req.body?.questionId || "");
    if (!/^[a-f\d]{24}$/i.test(questionId)) {
      return res.status(400).json({ success: false, message: "Invalid interview question" });
    }
    const question = interview.aiInterview.questions.id(questionId);
    const answerText = String(req.body?.answer || "").trim();
    if (!question) return res.status(400).json({ success: false, message: "Invalid interview question" });
    if (!answerText) return res.status(400).json({ success: false, message: "Answer cannot be empty" });
    if (answerText.length > 6000) {
      return res.status(400).json({ success: false, message: "Answer must be 6000 characters or fewer" });
    }

    const existing = interview.aiInterview.answers.find(
      (answer) => String(answer.questionId) === String(question._id)
    );
    if (existing) {
      existing.answer = answerText;
      existing.answeredAt = new Date();
    } else {
      interview.aiInterview.answers.push({ questionId: question._id, answer: answerText });
    }
    interview.aiInterview.lastActivityAt = new Date();
    interview.aiInterview.status = "in_progress";
    interview.aiInterview.failureReason = "";
    await interview.save();
    return res.status(200).json({ success: true, message: "Answer saved", questionId: question._id });
  } catch (error) {
    next(error);
  }
};

/** POST /api/interviews/:id/ai/complete - evaluate answers and publish the employer scorecard */
exports.completeAiInterview = async (req, res, next) => {
  let interview;
  try {
    interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (!isCandidateOwner(interview, req.user)) {
      return res.status(403).json({ success: false, message: "Only the assigned candidate can complete this interview" });
    }
    if (interview.interviewFormat !== "ai" || !["in_progress", "failed"].includes(interview.aiInterview?.status)) {
      return res.status(409).json({ success: false, message: "AI interview is not ready for evaluation" });
    }
    const answeredIds = new Set(interview.aiInterview.answers.map((answer) => String(answer.questionId)));
    const missing = interview.aiInterview.questions.filter((question) => !answeredIds.has(String(question._id)));
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Please answer all questions before submitting (${missing.length} remaining)`,
      });
    }

    interview.aiInterview.status = "evaluating";
    interview.aiInterview.failureReason = "";
    await interview.save();

    const context = await buildAiContext(interview);
    const evaluation = await aiInterviewService.evaluateInterview({
      ...context,
      questions: interview.aiInterview.questions,
      answers: interview.aiInterview.answers,
    });
    // AI feedback is advisory. HR must explicitly set the final pass/fail outcome.
    const finalResult = "pending";
    interview.scorecard = {
      technicalSkills: evaluation.technicalSkills,
      problemSolving: evaluation.problemSolving,
      communication: evaluation.communication,
      roleKnowledge: evaluation.roleKnowledge,
      cultureFit: evaluation.cultureFit,
      overallScore: evaluation.overallScore,
      strengths: evaluation.strengths,
      areasForImprovement: evaluation.areasForImprovement,
      feedback: evaluation.feedback,
      recommendation: evaluation.recommendation,
      submittedAt: new Date(),
      submittedBy: null,
      source: "ai",
    };
    interview.feedback = {
      rating: evaluation.overallScore,
      technicalScore: evaluation.technicalSkills,
      communicationScore: evaluation.communication,
      comments: evaluation.feedback,
      recommendation: evaluation.recommendation,
      submittedAt: new Date(),
    };
    interview.interviewerFeedback = evaluation.feedback;
    interview.aiInterview.status = "completed";
    interview.aiInterview.completedAt = new Date();
    interview.aiInterview.lastActivityAt = new Date();
    interview.aiInterview.evaluationModel = evaluation.modelName;
    interview.aiInterview.evaluationSummary = evaluation.evaluationSummary;
    interview.status = "completed";
    interview.completedAt = new Date();
    interview.result = finalResult;
    await interview.save();

    await Application.findByIdAndUpdate(interview.applicationId, {
      status: "Interview Completed",
      stage: `${interview.roundName} - AI EVALUATED`,
      $push: {
        notes: {
          text: `AI interview scorecard generated. Score: ${evaluation.overallScore}/5.0 | Recommendation: ${evaluation.recommendation}. HR review required.`,
          addedBy: req.user._id,
          createdAt: new Date(),
        },
      },
    });
    try {
      const employerProfile = await EmployerProfile.findById(interview.employerId).select("userId");
      if (employerProfile?.userId) {
        await notificationService.createNotification({
          recipientId: employerProfile.userId,
          senderId: req.user._id,
          title: "AI Interview Ready for Review ✨",
          message: `${interview.roundName || "AI interview"} has been completed. The AI scorecard (${evaluation.overallScore}/5.0) is ready for HR review.`,
          notificationType: "INTERVIEW_RESULT",
          relatedInterviewId: interview._id,
          relatedApplicationId: interview.applicationId,
          actionUrl: "/employer/dashboard?tab=interviews",
          metadata: {
            score: evaluation.overallScore,
            recommendation: evaluation.recommendation,
            source: "ai",
          },
        });
      }
    } catch (notificationError) {
      console.warn("Failed to notify employer about AI interview:", notificationError.message);
    }
    socketService.emitInterviewStatusUpdated(interview.candidateId, interview);
    return res.status(200).json({
      success: true,
      message: "AI interview completed and scorecard sent to the employer for review",
      overallScore: evaluation.overallScore,
      recommendation: evaluation.recommendation,
    });
  } catch (error) {
    if (interview && interview.aiInterview) {
      interview.aiInterview.status = "failed";
      interview.aiInterview.failureReason = "Evaluation could not be completed. Please retry.";
      await interview.save().catch(() => {});
    }
    next(error);
  }
};

/**
 * POST /api/interviews/:id/scorecard (also supports PATCH /feedback)
 * Evaluates candidate on 5 criteria, calculates overall score, sets result and advances status
 */
exports.submitInterviewScorecard = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.interviewFormat === "ai" && interview.aiInterview?.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "The candidate must complete the AI interview before HR can review its scorecard.",
      });
    }
    if (["cancelled", "draft"].includes(String(interview.status).toLowerCase())) {
      return res.status(409).json({ success: false, message: "A cancelled or draft interview cannot be scored" });
    }

    const {
      scorecard = {},
      strengths = "",
      areasForImprovement = "",
      feedback = "",
      recommendation = "Hire",
      result,
      isFinalRound = false,
      markSelected = false,
    } = req.body;

    const technical = Number(scorecard.technicalSkills || req.body.technicalScore || 0);
    const problemSolving = Number(scorecard.problemSolving || req.body.problemSolving || 0);
    const communication = Number(scorecard.communication || req.body.communicationScore || 0);
    const roleKnowledge = Number(scorecard.roleKnowledge || req.body.roleKnowledge || 0);
    const cultureFit = Number(scorecard.cultureFit || req.body.cultureFit || 0);

    // Compute average overall score
    const criteriaScores = [technical, problemSolving, communication, roleKnowledge, cultureFit].filter(
      (v) => v > 0
    );
    const allScores = [technical, problemSolving, communication, roleKnowledge, cultureFit];
    if (allScores.some((value) => !Number.isFinite(value) || value < 0 || value > 5)) {
      return res.status(400).json({ success: false, message: "Every score must be a number from 0 to 5" });
    }
    const allowedRecommendations = ["Strong Hire", "Hire", "Hold", "No Hire", "Pending"];
    if (!allowedRecommendations.includes(recommendation)) {
      return res.status(400).json({ success: false, message: "Invalid hiring recommendation" });
    }
    const overallScore =
      criteriaScores.length > 0
        ? Number((criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length).toFixed(1))
        : Number(req.body.rating || 0);

    // Derive result: passed / failed
    let finalResult = result ? result.toLowerCase() : "pending";
    if (!result) {
      if (["Strong Hire", "Hire"].includes(recommendation)) {
        finalResult = "passed";
      } else if (recommendation === "No Hire") {
        finalResult = "failed";
      } else {
        finalResult = "pending";
      }
    }

    interview.scorecard = {
      technicalSkills: technical,
      problemSolving,
      communication,
      roleKnowledge,
      cultureFit,
      overallScore,
      strengths: strengths || scorecard.strengths || interview.scorecard?.strengths || "",
      areasForImprovement:
        areasForImprovement || scorecard.areasForImprovement || interview.scorecard?.areasForImprovement || "",
      feedback: feedback || req.body.comments || interview.scorecard?.feedback || "",
      recommendation,
      submittedAt: new Date(),
      submittedBy: req.user._id,
      source: interview.scorecard?.source || "manual",
    };

    // Backward compatibility for feedback field
    interview.feedback = {
      rating: overallScore,
      technicalScore: technical,
      communicationScore: communication,
      comments: feedback || req.body.comments || "",
      recommendation,
      submittedAt: new Date(),
    };

    interview.interviewerFeedback = feedback || req.body.comments || "";
    interview.status = "completed";
    interview.result = finalResult;

    await interview.save();

    // Advance Application Status
    const shouldSelect =
      finalResult === "passed" && Boolean(isFinalRound) && Boolean(markSelected);

    if (shouldSelect) {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Selected",
        stage: "Selected / Eligible for Offer",
        $push: {
          notes: {
            text: `Candidate cleared ${interview.roundName} with score ${overallScore}/5.0 and has been SELECTED for offer.`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Interview Completed",
        stage: `${interview.roundName} - ${finalResult.toUpperCase()}`,
        $push: {
          notes: {
            text: `Scorecard submitted for ${interview.roundName}. Score: ${overallScore}/5.0 | Result: ${finalResult.toUpperCase()}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    }

    // Dispatch In-App Notification to Candidate
    try {
      const app = await Application.findById(interview.applicationId).select("opportunityTitle candidateId");
      const oppTitle = app?.opportunityTitle || "Opportunity";
      const isPassed = finalResult === "passed";

      await notificationService.createNotification({
        recipientId: interview.candidateId || app?.candidateId,
        senderId: req.user._id,
        title: isPassed ? "Round Cleared! 🏆" : "Interview Evaluation Completed 📝",
        message: isPassed
          ? `Congratulations! You have passed ${interview.roundName || `Round ${interview.roundNumber}`} for ${oppTitle}.`
          : `Your evaluation for ${interview.roundName || `Round ${interview.roundNumber}`} for ${oppTitle} has been completed.`,
        notificationType: "INTERVIEW_RESULT",
        relatedInterviewId: interview._id,
        relatedApplicationId: interview.applicationId,
        actionUrl: "/student/dashboard?tab=interviews",
        metadata: {
          roundNumber: interview.roundNumber,
          result: finalResult,
          score: overallScore,
          selected: shouldSelect,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch scorecard notification:", notifErr.message);
    }

    // Real-time socket broadcast
    socketService.emitInterviewStatusUpdated(interview.candidateId, interview);

    return res.status(200).json({
      success: true,
      message: shouldSelect
        ? "Scorecard recorded! Candidate has cleared all rounds and is now SELECTED for Offer Letter."
        : `Scorecard recorded with result: ${finalResult.toUpperCase()}`,
      interview,
      overallScore,
      result: finalResult,
      isCandidateSelected: shouldSelect,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/interviews/:id/result
 * Explicitly update interview outcome (passed | failed) and optionally select candidate
 */
exports.updateInterviewResult = async (req, res, next) => {
  try {
    const employerProfileId = await getEmployerProfileId(req.user);
    const { result, selectCandidate, rejectCandidate } = req.body;

    if (result && !["passed", "failed", "pending"].includes(String(result).toLowerCase())) {
      return res.status(400).json({ success: false, message: "Result must be passed, failed, or pending" });
    }

    const interview = await Interview.findOne(
      employerInterviewQuery(req.params.id, employerProfileId, req.user._id)
    );

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (String(interview.status).toLowerCase() !== "completed") {
      return res.status(409).json({ success: false, message: "Complete and score the interview before setting its result" });
    }

    if (result) {
      interview.result = result.toLowerCase();
    }

    await interview.save();

    if (selectCandidate && interview.result === "passed") {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Selected",
        stage: "Selected / Eligible for Offer",
        $push: {
          notes: {
            text: `Candidate manually selected by employer after clearing ${interview.roundName}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else if (rejectCandidate && interview.result === "failed") {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Rejected",
        stage: "Rejected",
        $push: {
          notes: {
            text: `Application rejected following interview ${interview.roundName}`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Interview result set to ${interview.result}`,
      interview,
    });
  } catch (error) {
    next(error);
  }
};
