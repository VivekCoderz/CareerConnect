const Interview = require("../models/Interview");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");

const getEmployerProfileId = async (user) => {
  let profile = await EmployerProfile.findOne({ userId: user._id });
  if (!profile) {
    profile = await EmployerProfile.create({
      userId: user._id,
      companyName: user.fullName || "Company",
    });
  }
  return profile._id;
};

// GET /api/interviews (List interviews for employer or candidate)
exports.getInterviews = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === "employer" || req.user.userType === "employer") {
      const employerId = await getEmployerProfileId(req.user);
      query.employerId = employerId;
    } else {
      query.candidateId = req.user._id;
    }

    const { status, jobId } = req.query;
    if (status && status !== "All") query.status = status;
    if (jobId) query.jobId = jobId;

    const interviews = await Interview.find(query)
      .populate("candidateId", "fullName email phone profileImage userType")
      .populate("jobId", "title department location")
      .populate("employerId", "companyName logo")
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/interviews (Schedule an interview)
exports.scheduleInterview = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const {
      candidateId,
      jobId,
      applicationId,
      title,
      interviewType,
      interviewerName,
      interviewerEmail,
      scheduledDate,
      scheduledTime,
      durationMinutes,
      meetingMode,
      meetingLink,
      location,
      notes,
    } = req.body;

    if (!candidateId || !jobId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Candidate, Job, Scheduled Date and Time are required",
      });
    }

    const interview = await Interview.create({
      employerId,
      candidateId,
      jobId,
      applicationId: applicationId || null,
      title: title || `${interviewType || "Technical"} Round`,
      interviewType: interviewType || "Technical",
      interviewerName: interviewerName || req.user.fullName || "Hiring Lead",
      interviewerEmail: interviewerEmail || req.user.email || "",
      scheduledDate,
      scheduledTime,
      durationMinutes: durationMinutes || 45,
      meetingMode: meetingMode || "Google Meet",
      meetingLink: meetingLink || "https://meet.google.com/new",
      location: location || "",
      notes: notes || "",
      status: "Scheduled",
    });

    // Update application stage if applicationId exists
    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
        status: "Interview",
        $push: {
          stageHistory: {
            stage: "Interview",
            notes: `Interview scheduled on ${scheduledDate} at ${scheduledTime}`,
            changedBy: req.user._id,
            changedAt: new Date(),
          },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/interviews/:id/feedback (Submit interview evaluation)
exports.submitInterviewFeedback = async (req, res, next) => {
  try {
    const { rating, technicalScore, communicationScore, comments, recommendation, status } = req.body;
    const employerId = await getEmployerProfileId(req.user);

    const interview = await Interview.findOne({ _id: req.params.id, employerId });
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    interview.feedback = {
      rating: Number(rating) || 0,
      technicalScore: Number(technicalScore) || 0,
      communicationScore: Number(communicationScore) || 0,
      comments: comments || "",
      recommendation: recommendation || "Hire",
      submittedAt: new Date(),
    };

    if (status) interview.status = status;
    else interview.status = "Completed";

    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Interview feedback submitted",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/interviews/:id/status (Reschedule / Cancel)
exports.updateInterviewStatus = async (req, res, next) => {
  try {
    const { status, scheduledDate, scheduledTime } = req.body;
    const employerId = await getEmployerProfileId(req.user);

    const interview = await Interview.findOne({ _id: req.params.id, employerId });
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (status) interview.status = status;
    if (scheduledDate) interview.scheduledDate = scheduledDate;
    if (scheduledTime) interview.scheduledTime = scheduledTime;

    await interview.save();

    return res.status(200).json({
      success: true,
      message: `Interview status updated to ${interview.status}`,
      interview,
    });
  } catch (error) {
    next(error);
  }
};
