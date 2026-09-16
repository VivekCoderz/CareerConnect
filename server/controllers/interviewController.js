const Interview = require("../models/Interview");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Internship = require("../models/Internship");
const User = require("../models/User");
const notificationService = require("../services/notificationService");

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

/**
 * GET /api/interviews
 * List interviews for employer or candidate with search & dynamic filters
 */
exports.getInterviews = async (req, res, next) => {
  try {
    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";
    console.log(">>> [getInterviews] Called by user:", {
      id: req.user._id,
      email: req.user.email,
      name: req.user.fullName,
      role: req.user.role,
      userType: req.user.userType,
      isEmployer,
    });
    let query = {};

    if (isEmployer) {
      const myJobs = await Job.find({ createdBy: req.user._id }, "_id");
      const myInternships = await Internship.find({ createdBy: req.user._id }, "_id");
      const jobIds = myJobs.map((j) => j._id);
      const internshipIds = myInternships.map((i) => i._id);

      const empOr = [
        { employerId: req.user._id },
        { interviewerId: req.user._id },
      ];
      if (jobIds.length > 0) empOr.push({ jobId: { $in: jobIds } });
      if (internshipIds.length > 0) empOr.push({ internshipId: { $in: internshipIds } });

      query.$or = empOr;
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
          delete obj.feedback;
          delete obj.interviewerFeedback;
        } else {
          // Expose result, scores, recommendation, and recruiter feedback to candidate
          const feedbackText =
            obj.scorecard?.feedback ||
            obj.scorecard?.overallFeedback ||
            obj.feedback?.overallFeedback ||
            obj.feedback?.comments ||
            "";

          obj.scorecard = {
            overallScore: obj.scorecard?.overallScore || obj.feedback?.rating || 0,
            technicalSkills: obj.scorecard?.technicalSkills || obj.feedback?.technicalScore || 0,
            communication: obj.scorecard?.communication || obj.feedback?.communicationScore || 0,
            problemSolving: obj.scorecard?.problemSolving || obj.feedback?.problemSolvingScore || 0,
            overallPerformance: obj.scorecard?.overallPerformance || 0,
            recommendation: obj.scorecard?.recommendation || obj.feedback?.recommendation || "",
            feedback: feedbackText,
            overallFeedback: feedbackText,
          };
          obj.feedback = {
            rating: obj.scorecard.overallScore,
            comments: feedbackText,
            recommendation: obj.scorecard.recommendation,
          };
          delete obj.interviewerFeedback;
        }
        return obj;
      });
    }

    return res.status(200).json({
      success: true,
      count: interviews.length,
      interviews,
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
    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";
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
    const upcoming = allInterviews.filter((i) => {
      const s = (i.status || "").toLowerCase();
      const isSched = s === "scheduled" || s === "rescheduled";
      return isSched && (!i.scheduledDate || i.scheduledDate >= todayStr);
    }).length;

    const completed = allInterviews.filter((i) => (i.status || "").toLowerCase() === "completed").length;
    const rescheduled = allInterviews.filter((i) => (i.status || "").toLowerCase() === "rescheduled").length;
    const cancelled = allInterviews.filter((i) => (i.status || "").toLowerCase() === "cancelled").length;

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
        total,
        upcoming,
        completed,
        rescheduled,
        cancelled,
        avgScore,
        passed,
        failed,
        selected: selectedCount,
        recommendedHire: passed,
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

/**
 * GET /api/interviews/:id
 * Detailed interview information including candidate profile and multi-round timeline
 */
exports.getInterviewById = async (req, res, next) => {
  try {
    const isEmployer = req.user.role === "employer" || req.user.userType === "employer";
    const interview = await Interview.findById(req.params.id)
      .populate("candidateId", "fullName email phone profileImage userType location skills experience")
      .populate("jobId", "title department location type description requirements")
      .populate("internshipId", "title department location type companyName description")
      .populate("employerId", "companyName logo officialEmail mobile location website")
      .populate("applicationId")
      .populate("interviewerId", "fullName email department");

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    // Authorization check
    if (isEmployer) {
      const employerProfileId = await getEmployerProfileId(req.user);
      if (!interview.employerId._id.equals(employerProfileId) && !interview.employerId._id.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this interview record" });
      }
    } else {
      if (!interview.candidateId._id.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this interview record" });
      }
    }

    // Fetch all rounds for this application for timeline display
    const roundTimeline = await Interview.find({ applicationId: interview.applicationId?._id })
      .sort({ roundNumber: 1 })
      .select("roundNumber roundName interviewType scheduledDate startTime duration status result scorecard.overallScore");

    const interviewData = interview.toObject();

    // Sanitize for candidate
    if (!isEmployer && interviewData.status !== "completed") {
      delete interviewData.scorecard;
      delete interviewData.feedback;
      delete interviewData.interviewerFeedback;
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
      meetingLink,
      location,
      instructions,
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
    const isStageInterview =
      application.currentStageType?.toLowerCase().includes("interview") ||
      application.stage?.toLowerCase().includes("interview") ||
      application.overallStatus === "In Progress";

    if (roundNum === 1) {
      // First round requires candidate to be Shortlisted, in interview stage, Approved, or in pipeline
      if (
        !isStageInterview &&
        application.status !== "Shortlisted" &&
        application.status !== "Approved" &&
        application.status !== "Interview" &&
        application.status !== "Interview Scheduled" &&
        application.status !== "In Progress"
      ) {
        return res.status(400).json({
          success: false,
          message: "Only eligible or shortlisted candidates can be scheduled for an interview.",
        });
      }
    } else {
      // Round 2+ check: if a previous interview round exists in DB, ensure it's completed
      const previousRound = await Interview.findOne({
        applicationId: application._id,
        roundNumber: roundNum - 1,
      });

      if (previousRound) {
        const prevStatus = (previousRound.status || "").toLowerCase();
        const prevResult = (previousRound.result || "").toLowerCase();

        if (prevStatus !== "completed" || (prevResult !== "passed" && prevResult !== "next_round")) {
          return res.status(400).json({
            success: false,
            message: `Cannot schedule Round ${roundNum}. Round ${roundNum - 1} must be completed with result 'Passed' first.`,
          });
        }
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

    // 5. Validate mode specifics
    const finalType = interviewType || "Online";
    if (finalType === "Online" && !meetingLink) {
      return res.status(400).json({
        success: false,
        message: "Meeting link is required for Online interviews.",
      });
    }
    if (finalType === "Offline" && !location) {
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

    // 7. Create Interview
    const interview = await Interview.create({
      employerId: employerProfileId,
      candidateId: application.candidateId,
      jobId: application.jobId || jobId || null,
      internshipId: application.internshipId || internshipId || null,
      applicationId: application._id,
      title: title || `${roundName || `Round ${roundNum} Interview`}`,
      roundNumber: roundNum,
      roundName: roundName || `Round ${roundNum} - ${finalType}`,
      interviewType: finalType,
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
      meetingMode: finalType,
      meetingLink: meetingLink || "",
      location: location || "",
      instructions: instructions || notes || "",
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
        message: `Your interview has been scheduled. ${interview.roundName || `Round ${roundNum}`} for ${oppTitle} at ${compName} has been scheduled for ${scheduledDate} at ${finalTime}.`,
        notificationType: "INTERVIEW_SCHEDULED",
        relatedInterviewId: interview._id,
        relatedApplicationId: application._id,
        actionUrl: "/student/dashboard?tab=interviews",
        metadata: {
          roundNumber: roundNum,
          scheduledDate,
          scheduledTime: finalTime,
          meetingMode: finalType,
          meetingLink: interview.meetingLink,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to dispatch schedule notification:", notifErr.message);
    }

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
      duration,
      durationMinutes,
      meetingMode,
      meetingLink,
      location,
      rescheduledReason,
    } = req.body;

    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.status === "cancelled" || interview.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule a cancelled interview. Please schedule a new interview instead.",
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
    if (duration || durationMinutes) {
      const dur = Number(duration || durationMinutes);
      interview.duration = dur;
      interview.durationMinutes = dur;
    }
    if (meetingMode) interview.meetingMode = meetingMode;
    if (meetingLink) interview.meetingLink = meetingLink;
    if (location) interview.location = location;
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
        message: `Your interview has been rescheduled. ${interview.roundName || `Round ${interview.roundNumber}`} for ${oppTitle} has been moved from ${prevDate} (${prevTime}) to ${scheduledDate} (${newTime}). Reason: ${finalReason}`,
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

    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
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
        message: `Your interview has been cancelled. ${interview.roundName || `Round ${interview.roundNumber}`} for ${oppTitle} scheduled for ${interview.scheduledDate} at ${interview.scheduledTime} has been cancelled. Reason: ${finalReason}.${finalMessage ? ` Note: ${finalMessage}` : ""}`,
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
    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

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
    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    interview.status = "completed";
    await interview.save();

    await Application.findByIdAndUpdate(interview.applicationId, {
      status: "Interview Completed",
    });

    return res.status(200).json({
      success: true,
      message: "Interview marked as completed.",
      interview,
    });
  } catch (error) {
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
    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    const {
      scorecard = {},
      strengths = "",
      areasForImprovement = "",
      feedback = "",
      overallFeedback = "",
      recommendation = "Hire",
      result,
      isFinalRound = false,
      markSelected = false,
    } = req.body;

    const technical = Number(scorecard.technicalSkills || req.body.technicalSkills || req.body.technicalScore || 0);
    const problemSolving = Number(scorecard.problemSolving || req.body.problemSolving || req.body.problemSolvingScore || 0);
    const communication = Number(scorecard.communication || req.body.communication || req.body.communicationScore || 0);
    const roleKnowledge = Number(scorecard.roleKnowledge || req.body.roleKnowledge || 0);
    const cultureFit = Number(scorecard.cultureFit || req.body.cultureFit || 0);
    const overallPerformance = Number(scorecard.overallPerformance || req.body.overallPerformance || 0);

    // Compute average overall score
    const criteriaScores = [technical, problemSolving, communication, roleKnowledge, cultureFit, overallPerformance].filter(
      (v) => v > 0
    );
    const overallScore =
      criteriaScores.length > 0
        ? Number((criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length).toFixed(1))
        : Number(req.body.rating || 0);

    const finalFeedbackText = overallFeedback || feedback || scorecard.overallFeedback || scorecard.feedback || req.body.comments || "";

    // Normalize result (selected | rejected | next_round | pending | passed | failed)
    let rawResult = (result || "").toLowerCase().trim();
    if (rawResult === "next round") rawResult = "next_round";
    
    let finalResult = rawResult || "pending";
    if (!rawResult) {
      if (markSelected || isFinalRound || recommendation === "Strong Hire") {
        finalResult = "selected";
      } else if (recommendation === "No Hire" || overallScore < 2.5) {
        finalResult = "rejected";
      } else if (recommendation === "Hire" || overallScore >= 3.0) {
        finalResult = "next_round";
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
      overallPerformance,
      overallScore,
      strengths: strengths || scorecard.strengths || "",
      areasForImprovement: areasForImprovement || scorecard.areasForImprovement || "",
      feedback: finalFeedbackText,
      overallFeedback: finalFeedbackText,
      recommendation,
      submittedAt: new Date(),
      submittedBy: req.user._id,
    };

    // Backward compatibility for feedback field
    interview.feedback = {
      rating: overallScore,
      technicalScore: technical,
      communicationScore: communication,
      problemSolvingScore: problemSolving,
      overallPerformance,
      overallFeedback: finalFeedbackText,
      comments: finalFeedbackText,
      recommendation,
      submittedAt: new Date(),
    };

    interview.interviewerFeedback = finalFeedbackText;
    interview.status = "completed";
    interview.result = finalResult;

    await interview.save();

    // Advance Application Status based on finalResult
    const shouldSelect = finalResult === "selected" || Boolean(markSelected);
    const shouldReject = finalResult === "rejected";

    if (shouldSelect) {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Selected",
        stage: "Selected / Eligible for Offer",
        $push: {
          notes: {
            text: `Candidate cleared ${interview.roundName} with score ${overallScore}/5.0 and has been SELECTED. Result: SELECTED.`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else if (shouldReject) {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Rejected",
        stage: "Rejected",
        $push: {
          notes: {
            text: `Interview evaluation completed for ${interview.roundName}. Result: REJECTED.`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else if (finalResult === "next_round") {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Interview Completed",
        stage: `Cleared ${interview.roundName} - Ready for Next Round`,
        $push: {
          notes: {
            text: `Candidate cleared ${interview.roundName} with score ${overallScore}/5.0. Recommended for Next Round.`,
            addedBy: req.user._id,
            createdAt: new Date(),
          },
        },
      });
    } else {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: "Interview Completed",
        stage: `${interview.roundName} - Completed`,
        $push: {
          notes: {
            text: `Feedback submitted for ${interview.roundName}. Score: ${overallScore}/5.0 | Result: ${finalResult.toUpperCase()}`,
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

      await notificationService.createNotification({
        recipientId: interview.candidateId || app?.candidateId,
        senderId: req.user._id,
        title: "Interview Result Updated 📝",
        message: `Your interview result has been updated. Result: ${finalResult.toUpperCase().replace("_", " ")} for ${interview.roundName || `Round ${interview.roundNumber}`} (${oppTitle}).`,
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

    return res.status(200).json({
      success: true,
      message: shouldSelect
        ? "Evaluation recorded! Candidate has cleared the interview and is now SELECTED."
        : `Interview feedback and result (${finalResult.toUpperCase().replace("_", " ")}) recorded successfully.`,
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

    const interview = await Interview.findOne({
      _id: req.params.id,
      employerId: employerProfileId,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
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
