const Assessment = require("../models/Assessment");
const AssessmentSubmission = require("../models/AssessmentSubmission");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");
const Notification = require("../models/Notification");

const CANDIDATE_ROLES = new Set(["user", "student", "fresher", "professional"]);
const PROCTOR_FLAGS = new Set([
  "tab_switched",
  "fullscreen_exited",
  "window_blurred",
  "copy_attempted",
  "paste_attempted",
  "context_menu_opened",
  "time_limit_exceeded",
]);

const isCandidate = (user) => user && user.role !== "employer" && CANDIDATE_ROLES.has(user.userType || user.role || "user");

const availabilityError = (assessment, now = new Date()) => {
  if (!["Active", "Scheduled"].includes(assessment.status)) return "Assessment is not available";
  if (assessment.scheduledAt && now < new Date(assessment.scheduledAt)) return "Assessment has not started yet";
  if (assessment.deadline && now > new Date(assessment.deadline)) return "Assessment deadline has passed";
  return null;
};

const sanitizeForCandidate = (assessment) => {
  const view = typeof assessment.toObject === "function" ? assessment.toObject() : { ...assessment };
  delete view.employerId;
  view.questions = (view.questions || []).map(({ correctAnswer, explanation, ...q }) => q);
  view.codingProblems = (view.codingProblems || []).map((problem) => ({
    ...problem,
    solutionCode: undefined,
    testCases: (problem.testCases || [])
      .filter((testCase) => !testCase.isHidden)
      .map(({ expectedOutput, points, ...testCase }) => testCase),
  }));
  return view;
};

const getCandidateApplication = (assessment, candidateId) => (
  assessment.jobId
    ? Application.findOne({ candidateId, jobId: assessment.jobId, status: { $nin: ["Withdrawn", "withdrawn"] } })
    : Promise.resolve(null)
);

const normalizeIntegrity = (body = {}) => {
  const clampCount = (value) => Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));
  const flags = Array.isArray(body.proctorFlags)
    ? [...new Set(body.proctorFlags.filter((flag) => PROCTOR_FLAGS.has(flag)))].slice(0, 20)
    : [];
  const tabSwitchCount = clampCount(body.tabSwitchCount);
  const fullscreenExitCount = clampCount(body.fullscreenExitCount);
  const focusLossCount = clampCount(body.focusLossCount);
  const copyPasteCount = clampCount(body.copyPasteCount);
  const penalty = tabSwitchCount * 8 + fullscreenExitCount * 10 + focusLossCount * 3 + copyPasteCount * 10;
  return {
    proctorFlags: flags,
    tabSwitchCount,
    fullscreenExitCount,
    focusLossCount,
    copyPasteCount,
    integrityScore: Math.max(0, 100 - penalty),
  };
};

// ─── Utility: resolve employer profile ID ───────────────────────────────────
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

// ─── GET /api/assessments ────────────────────────────────────────────────────
// List all assessments created by this employer (optionally filter by jobId)
exports.getAssessments = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const filter = { employerId };
    if (req.query.jobId) filter.jobId = req.query.jobId;
    if (req.query.assessmentType) filter.assessmentType = req.query.assessmentType;
    if (req.query.status) filter.status = req.query.status;

    const assessments = await Assessment.find(filter)
      .populate("jobId", "title employmentType status")
      .sort({ jobId: 1, round: 1, createdAt: -1 });

    // Attach submission counts per assessment
    const assessmentIds = assessments.map((a) => a._id);
    const submissionCounts = await AssessmentSubmission.aggregate([
      { $match: { assessmentId: { $in: assessmentIds } } },
      { $group: { _id: "$assessmentId", total: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } } } },
    ]);
    const countMap = {};
    submissionCounts.forEach((s) => { countMap[s._id.toString()] = { total: s.total, passed: s.passed }; });

    const data = assessments.map((a) => ({
      ...a.toObject(),
      submissionStats: countMap[a._id.toString()] || { total: 0, passed: 0 },
    }));

    return res.status(200).json({ success: true, count: assessments.length, assessments: data });
  } catch (error) {
    next(error);
  }
};

// Candidate inbox: assessments attached to jobs the signed-in candidate applied for.
exports.getCandidateAssessments = async (req, res, next) => {
  try {
    if (!isCandidate(req.user)) {
      return res.status(403).json({ success: false, message: "Candidates only" });
    }
    const applications = await Application.find({
      candidateId: req.user._id,
      jobId: { $ne: null },
      status: { $nin: ["Withdrawn", "withdrawn"] },
    }).select("jobId opportunityTitle companyName status").lean();
    const jobIds = applications.map((item) => item.jobId).filter(Boolean);
    const assessments = await Assessment.find({
      jobId: { $in: jobIds },
      status: { $in: ["Active", "Scheduled"] },
    }).populate("jobId", "title companyName").sort({ scheduledAt: 1, round: 1 }).lean();
    const submissions = await AssessmentSubmission.find({
      candidateId: req.user._id,
      assessmentId: { $in: assessments.map((item) => item._id) },
    }).sort({ attemptVersion: -1 }).lean();
    const byAssessment = new Map();
    submissions.forEach((submission) => {
      const key = String(submission.assessmentId);
      if (!byAssessment.has(key)) byAssessment.set(key, []);
      byAssessment.get(key).push(submission);
    });
    const now = new Date();
    const items = assessments.map((assessment) => {
      const attempts = byAssessment.get(String(assessment._id)) || [];
      const latest = attempts[0] || null;
      const unavailableReason = availabilityError(assessment, now);
      return {
        _id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        assessmentType: assessment.assessmentType,
        skillCategory: assessment.skillCategory,
        round: assessment.round,
        roundLabel: assessment.roundLabel,
        timeLimitMinutes: assessment.timeLimitMinutes,
        passingScorePercentage: assessment.passingScorePercentage,
        scheduledAt: assessment.scheduledAt,
        deadline: assessment.deadline,
        jobId: assessment.jobId,
        attemptsUsed: attempts.filter((item) => item.reviewStatus !== "InProgress").length,
        maxAttempts: assessment.allowRetake ? assessment.maxAttempts : 1,
        latestSubmission: latest ? {
          _id: latest._id,
          reviewStatus: latest.reviewStatus,
          percentage: assessment.showResultsToCandidate && latest.reviewStatus === "Evaluated" ? latest.percentage : null,
          passed: assessment.showResultsToCandidate && latest.reviewStatus === "Evaluated" ? latest.passed : null,
          submittedAt: latest.submittedAt,
        } : null,
        available: !unavailableReason,
        unavailableReason,
      };
    });
    return res.status(200).json({ success: true, assessments: items });
  } catch (error) {
    next(error);
  }
};

exports.startAssessment = async (req, res, next) => {
  try {
    if (!isCandidate(req.user)) {
      return res.status(403).json({ success: false, message: "Candidates only" });
    }
    const assessment = await Assessment.findById(req.params.id).populate("jobId", "title companyName");
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
    const unavailableReason = availabilityError(assessment);
    if (unavailableReason) return res.status(403).json({ success: false, message: unavailableReason });
    const application = await getCandidateApplication(assessment, req.user._id);
    if (assessment.jobId && !application) {
      return res.status(403).json({ success: false, message: "An active application to this job is required" });
    }

    let attempt = await AssessmentSubmission.findOne({
      assessmentId: assessment._id,
      candidateId: req.user._id,
      reviewStatus: "InProgress",
    }).sort({ attemptVersion: -1 });
    const completedAttempts = await AssessmentSubmission.countDocuments({
      assessmentId: assessment._id,
      candidateId: req.user._id,
      reviewStatus: { $ne: "InProgress" },
    });
    const maxAttempts = assessment.allowRetake ? assessment.maxAttempts : 1;
    if (!attempt && completedAttempts >= maxAttempts) {
      return res.status(409).json({ success: false, message: "No assessment attempts remaining" });
    }
    if (!attempt) {
      attempt = await AssessmentSubmission.create({
        assessmentId: assessment._id,
        candidateId: req.user._id,
        jobId: assessment.jobId?._id || assessment.jobId || null,
        applicationId: application?._id || null,
        assessmentType: assessment.assessmentType,
        roundNumber: assessment.round,
        startedAt: new Date(),
        submittedAt: null,
        reviewStatus: "InProgress",
        attemptVersion: completedAttempts + 1,
      });
    }

    const startedAt = new Date(attempt.startedAt || attempt.createdAt);
    const timerEnd = new Date(startedAt.getTime() + assessment.timeLimitMinutes * 60 * 1000);
    const expiresAt = assessment.deadline && new Date(assessment.deadline) < timerEnd
      ? new Date(assessment.deadline)
      : timerEnd;
    const candidateView = sanitizeForCandidate(assessment);
    if (assessment.shuffleQuestions && candidateView.questions?.length > 1) {
      candidateView.questions = [...candidateView.questions].sort(() => Math.random() - 0.5);
    }
    return res.status(200).json({
      success: true,
      assessment: candidateView,
      attempt: { _id: attempt._id, attemptVersion: attempt.attemptVersion, startedAt, expiresAt },
      serverNow: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Assessment attempt already started" });
    }
    next(error);
  }
};

// ─── POST /api/assessments ───────────────────────────────────────────────────
// Create a new assessment (MCQ / Coding / Communication)
exports.createAssessment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const {
      title, description, instructions, skillCategory,
      assessmentType, round, roundLabel,
      timeLimitMinutes, passingScorePercentage,
      jobId, status, scheduledAt, deadline,
      allowRetake, maxAttempts, shuffleQuestions, showResultsToCandidate, notifyOnSubmission,
      enableProctoring, enforceFullscreen, trackTabSwitches, preventCopyPaste, maxTabSwitches,
      // Type-specific
      questions, codingProblems, communicationPrompts,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Assessment title is required" });
    }

    const type = assessmentType || "MCQ";
    if (!["MCQ", "Coding", "Communication"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid assessment type" });
    }

    // Validate type-specific content
    if (type === "MCQ" && (!questions || questions.length === 0)) {
      return res.status(400).json({ success: false, message: "At least one question is required for MCQ assessments" });
    }
    if (type === "Coding" && (!codingProblems || codingProblems.length === 0)) {
      return res.status(400).json({ success: false, message: "At least one coding problem is required" });
    }
    if (type === "Communication" && (!communicationPrompts || communicationPrompts.length === 0)) {
      return res.status(400).json({ success: false, message: "At least one communication prompt is required" });
    }

    const startDate = scheduledAt ? new Date(scheduledAt) : null;
    const deadlineDate = deadline ? new Date(deadline) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid scheduled start date" });
    }
    if (deadlineDate && Number.isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid deadline" });
    }
    if (startDate && deadlineDate && deadlineDate <= startDate) {
      return res.status(400).json({ success: false, message: "Deadline must be after the scheduled start" });
    }

    // Ownership check on jobId
    if (jobId) {
      const jobExists = await Job.exists({
        _id: jobId,
        $or: [{ employerId }, { createdBy: req.user._id }],
      });
      if (!jobExists) {
        return res.status(403).json({ success: false, message: "You cannot attach another employer's job" });
      }
    }

    const assessment = await Assessment.create({
      employerId,
      jobId: jobId || null,
      title: title.trim(),
      description: description || "",
      instructions: instructions || "",
      skillCategory: skillCategory || "Technical",
      assessmentType: type,
      round: Number(round) || 1,
      roundLabel: roundLabel || "",
      timeLimitMinutes: Number(timeLimitMinutes) || 30,
      passingScorePercentage: passingScorePercentage === undefined ? 70 : Number(passingScorePercentage),
      questions: type === "MCQ" ? (questions || []) : [],
      codingProblems: type === "Coding" ? (codingProblems || []) : [],
      communicationPrompts: type === "Communication" ? (communicationPrompts || []) : [],
      status: status || "Active",
      scheduledAt: startDate,
      deadline: deadlineDate,
      isScheduled: Boolean(startDate),
      allowRetake: allowRetake ?? false,
      maxAttempts: allowRetake ? Math.max(2, Math.min(5, Number(maxAttempts) || 2)) : 1,
      shuffleQuestions: shuffleQuestions ?? false,
      showResultsToCandidate: showResultsToCandidate ?? true,
      notifyOnSubmission: notifyOnSubmission ?? true,
      enableProctoring: enableProctoring ?? true,
      enforceFullscreen: enforceFullscreen ?? true,
      trackTabSwitches: trackTabSwitches ?? true,
      preventCopyPaste: preventCopyPaste ?? true,
      maxTabSwitches: Math.max(0, Math.min(20, Number(maxTabSwitches) || 3)),
    });

    return res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      assessment,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/assessments/:id ────────────────────────────────────────────────
exports.getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate("jobId", "title");
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const employer = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
    const isOwner = employer && String(assessment.employerId) === String(employer._id);

    if (!isOwner) {
      if (!isCandidate(req.user)) return res.status(403).json({ success: false, message: "Candidates only" });
      const unavailableReason = availabilityError(assessment);
      if (unavailableReason) return res.status(403).json({ success: false, message: unavailableReason });
      if (assessment.jobId && !(await Application.exists({ candidateId: req.user._id, jobId: assessment.jobId }))) {
        return res.status(404).json({ success: false, message: "Assessment not found" });
      }
    }

    const view = assessment.toObject();
    if (!isOwner) {
      Object.assign(view, sanitizeForCandidate(view));
    }

    return res.status(200).json({ success: true, assessment: view });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/assessments/:id ────────────────────────────────────────────────
// Full update of an assessment (employer only)
exports.updateAssessment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const assessment = await Assessment.findOne({ _id: req.params.id, employerId });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const allowedFields = [
      "title", "description", "instructions", "skillCategory",
      "round", "roundLabel", "timeLimitMinutes", "passingScorePercentage",
      "questions", "codingProblems", "communicationPrompts",
      "status", "scheduledAt", "deadline", "allowRetake", "maxAttempts", "shuffleQuestions",
      "showResultsToCandidate", "notifyOnSubmission", "enableProctoring", "enforceFullscreen",
      "trackTabSwitches", "preventCopyPaste", "maxTabSwitches",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        assessment[field] = req.body[field];
      }
    });

    if (assessment.scheduledAt && assessment.deadline && assessment.deadline <= assessment.scheduledAt) {
      return res.status(400).json({ success: false, message: "Deadline must be after the scheduled start" });
    }
    assessment.isScheduled = Boolean(assessment.scheduledAt);
    assessment.maxAttempts = assessment.allowRetake ? Math.max(2, assessment.maxAttempts || 2) : 1;

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Assessment updated successfully",
      assessment,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/assessments/:id/schedule ────────────────────────────────────
// Schedule a round: set scheduledAt, deadline, and transition status
exports.scheduleRound = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const assessment = await Assessment.findOne({ _id: req.params.id, employerId });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const { scheduledAt, deadline } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: "scheduledAt date is required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid scheduledAt date" });
    }

    assessment.scheduledAt = scheduledDate;
    assessment.isScheduled = true;
    assessment.status = "Scheduled";

    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid deadline" });
      }
      if (deadlineDate <= scheduledDate) {
        return res.status(400).json({ success: false, message: "Deadline must be after the scheduled start" });
      }
      assessment.deadline = deadlineDate;
    } else {
      assessment.deadline = null;
    }

    await assessment.save();

    return res.status(200).json({
      success: true,
      message: "Assessment round scheduled successfully",
      assessment,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/assessments/job/:jobId/results ────────────────────────────────
// All submissions for all rounds of a job (employer view)
exports.getResultsByJob = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { jobId } = req.params;

    // Verify job belongs to employer
    const jobExists = await Job.exists({
      _id: jobId,
      $or: [{ employerId }, { createdBy: req.user._id }],
    });
    if (!jobExists) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Get all assessments for this job
    const assessments = await Assessment.find({ employerId, jobId }).sort({ round: 1 }).lean();
    const assessmentIds = assessments.map((a) => a._id);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50));

    const [submissions, total, stats] = await Promise.all([
      AssessmentSubmission.find({ assessmentId: { $in: assessmentIds } })
        .populate("candidateId", "fullName email profileImage userType")
        .populate("assessmentId", "title assessmentType round roundLabel")
        .sort({ roundNumber: 1, percentage: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AssessmentSubmission.countDocuments({ assessmentId: { $in: assessmentIds } }),
      AssessmentSubmission.aggregate([
        { $match: { assessmentId: { $in: assessmentIds }, reviewStatus: "Evaluated" } },
        { $group: { _id: null, evaluated: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } }, average: { $avg: "$percentage" } } },
      ]),
    ]);

    // Summary stats
    const passedCount = stats[0]?.passed || 0;
    const avgScore = Math.round(stats[0]?.average || 0);

    return res.status(200).json({
      success: true,
      jobId,
      assessments,
      submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      summary: {
        totalSubmissions: total,
        passedCount,
        passRate: stats[0]?.evaluated ? Math.round((passedCount / stats[0].evaluated) * 100) : 0,
        averageScore: avgScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/assessments/:id/results ───────────────────────────────────────
// Per-assessment submissions (employer view)
exports.getAssessmentResults = async (req, res, next) => {
  try {
    const employer = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
    if (!employer || !(await Assessment.exists({ _id: req.params.id, employerId: employer._id }))) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));

    const assessment = await Assessment.findOne({ _id: req.params.id, employerId: employer._id })
      .populate("jobId", "title companyName")
      .lean();
    const [submissions, total, stats] = await Promise.all([
      AssessmentSubmission.find({ assessmentId: req.params.id })
        .populate("candidateId", "fullName email profileImage userType")
        .sort({ percentage: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AssessmentSubmission.countDocuments({ assessmentId: req.params.id }),
      AssessmentSubmission.aggregate([
        { $match: { assessmentId: assessment._id, reviewStatus: "Evaluated" } },
        { $group: { _id: null, evaluated: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } }, average: { $avg: "$percentage" } } },
      ]),
    ]);

    const passedCount = stats[0]?.passed || 0;
    const avgScore = Math.round(stats[0]?.average || 0);

    return res.status(200).json({
      success: true,
      count: total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      assessment,
      submissions,
      summary: {
        totalSubmissions: total,
        passedCount,
        passRate: stats[0]?.evaluated ? Math.round((passedCount / stats[0].evaluated) * 100) : 0,
        averageScore: avgScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/assessments/:id/submit ───────────────────────────────────────
// Candidate submits test answers
exports.submitAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found" });
    const candidateId = req.user._id;
    if (!isCandidate(req.user)) return res.status(403).json({ success: false, message: "Candidates only" });
    const unavailableReason = availabilityError(assessment);
    if (unavailableReason) return res.status(403).json({ success: false, message: unavailableReason });

    const { answers, codeSubmissions, communicationResponses, attemptId, autoSubmitted } = req.body;
    const application = await getCandidateApplication(assessment, candidateId);
    if (assessment.jobId && !application) {
      return res.status(403).json({ success: false, message: "An active application to this job is required" });
    }

    let attempt = attemptId
      ? await AssessmentSubmission.findOne({ _id: attemptId, assessmentId: assessment._id, candidateId, reviewStatus: "InProgress" })
      : await AssessmentSubmission.findOne({ assessmentId: assessment._id, candidateId, reviewStatus: "InProgress" }).sort({ attemptVersion: -1 });
    const completedAttempts = await AssessmentSubmission.countDocuments({
      assessmentId: assessment._id,
      candidateId,
      reviewStatus: { $ne: "InProgress" },
    });
    const maxAttempts = assessment.allowRetake ? assessment.maxAttempts : 1;
    if (!attempt && completedAttempts >= maxAttempts) {
      return res.status(409).json({ success: false, message: "No assessment attempts remaining" });
    }
    if (!attempt) {
      attempt = new AssessmentSubmission({
        assessmentId: assessment._id,
        candidateId,
        jobId: assessment.jobId || null,
        applicationId: application?._id || null,
        assessmentType: assessment.assessmentType,
        roundNumber: assessment.round,
        startedAt: new Date(),
        attemptVersion: completedAttempts + 1,
      });
    }

    const now = new Date();
    const startedAt = new Date(attempt.startedAt || now);
    const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
    const graceSeconds = 120;
    if (elapsedSeconds > assessment.timeLimitMinutes * 60 + graceSeconds) {
      return res.status(410).json({ success: false, message: "Assessment time limit has expired" });
    }

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;
    let evaluatedAnswers = [];

    // ── MCQ Evaluation ──────────────────────────────────────────────────────
    if (assessment.assessmentType === "MCQ") {
      if (!Array.isArray(answers) || (answers.length === 0 && !autoSubmitted)) {
        return res.status(400).json({ success: false, message: "Answers are required for MCQ" });
      }

      evaluatedAnswers = (assessment.questions || []).map((q) => {
        const submitted = answers.find((a) => String(a.questionId) === String(q._id));
        const selected = submitted?.selectedAnswer || "";
        const isCorrect = selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        const pointsAwarded = isCorrect ? (q.points || 10) : 0;
        totalPossible += q.points || 10;
        totalScore += pointsAwarded;
        if (isCorrect) correctCount++;
        return {
          questionId: q._id,
          questionText: q.question,
          selectedAnswer: selected,
          correctAnswer: q.correctAnswer,
          isCorrect,
          pointsAwarded,
        };
      });
    }

    // ── Coding Evaluation (client-evaluated; server records submissions) ────
    if (assessment.assessmentType === "Coding") {
      const codeSubs = Array.isArray(codeSubmissions) ? codeSubmissions : [];
      attempt.codeSubmissions = (assessment.codingProblems || []).map((prob) => {
        totalPossible += prob.points || 50;
        const sub = codeSubs.find((c) => String(c.problemId) === String(prob._id));
        const language = prob.supportedLanguages.includes(sub?.language) ? sub.language : prob.defaultLanguage;
        return {
          problemId: prob._id,
          problemTitle: prob.title,
          code: String(sub?.code || "").slice(0, 50000),
          language,
          totalPossibleScore: prob.points || 50,
          executionStatus: "pending",
          score: 0,
        };
      });
    }

    // ── Communication (scores set later by employer/AI) ─────────────────────
    if (assessment.assessmentType === "Communication") {
      const responses = Array.isArray(communicationResponses) ? communicationResponses : [];
      attempt.communicationResponses = (assessment.communicationPrompts || []).map((prompt) => {
        totalPossible += prompt.points || 20;
        const response = responses.find((item) => String(item.promptId) === String(prompt._id));
        return {
          promptId: prompt._id,
          promptText: prompt.prompt,
          responseText: String(response?.responseText || "").slice(0, 10000),
          recordingUrl: "",
          durationSeconds: Math.max(0, Math.min(prompt.maxDurationSeconds, Number(response?.durationSeconds) || 0)),
        };
      });
    }

    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const needsReview = assessment.assessmentType !== "MCQ";
    const passed = !needsReview && percentage >= assessment.passingScorePercentage;
    const integrity = normalizeIntegrity(req.body);
    if (elapsedSeconds > assessment.timeLimitMinutes * 60) integrity.proctorFlags.push("time_limit_exceeded");
    Object.assign(attempt, {
      answers: evaluatedAnswers,
      totalQuestions: assessment.assessmentType === "MCQ" ? assessment.questions.length : (assessment.codingProblems.length || assessment.communicationPrompts.length),
      correctAnswersCount: correctCount,
      score: totalScore,
      totalPossibleScore: totalPossible,
      percentage,
      passed,
      timeTakenSeconds: Math.min(elapsedSeconds, assessment.timeLimitMinutes * 60),
      submittedAt: now,
      reviewStatus: needsReview ? "PendingReview" : "Evaluated",
      autoSubmitted: Boolean(autoSubmitted),
      ...integrity,
    });
    await attempt.save();

    if (assessment.notifyOnSubmission) {
      EmployerProfile.findById(assessment.employerId).select("userId").lean().then((profile) => {
        if (!profile?.userId) return null;
        return Notification.create({
          recipient: profile.userId,
          recipientId: profile.userId,
          sender: "CareerConnect Assessments",
          senderRole: "system",
          title: `New submission: ${assessment.title}`,
          preview: `${req.user.fullName || "A candidate"} completed the assessment.`,
          category: "assessment",
          actionUrl: "/employer/dashboard",
          relatedId: String(assessment._id),
          metadata: { employerId: String(assessment.employerId), candidateId: String(candidateId) },
        });
      }).catch(() => {});
    }

    // Strip answers from response to candidate
    const view = attempt.toObject();
    if (assessment.showResultsToCandidate && !needsReview) {
      view.answers = (view.answers || []).map(({ correctAnswer, ...a }) => a);
    } else {
      view.answers = [];
      delete view.score;
      delete view.percentage;
      delete view.passed;
    }

    return res.status(201).json({
      success: true,
      message: needsReview
        ? "Assessment submitted for employer review."
        : assessment.showResultsToCandidate
          ? (passed ? "Congratulations, you passed the assessment!" : "Assessment submitted successfully.")
          : "Assessment submitted successfully.",
      submission: view,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Assessment already submitted" });
    }
    next(error);
  }
};

exports.reviewSubmission = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const submission = await AssessmentSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });
    const assessment = await Assessment.findOne({ _id: submission.assessmentId, employerId });
    if (!assessment) return res.status(404).json({ success: false, message: "Submission not found" });
    if (assessment.assessmentType === "MCQ") {
      return res.status(400).json({ success: false, message: "MCQ submissions are graded automatically" });
    }
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0 || score > submission.totalPossibleScore) {
      return res.status(400).json({ success: false, message: `Score must be between 0 and ${submission.totalPossibleScore}` });
    }
    submission.score = score;
    submission.percentage = submission.totalPossibleScore > 0 ? Math.round((score / submission.totalPossibleScore) * 100) : 0;
    submission.passed = submission.percentage >= assessment.passingScorePercentage;
    submission.reviewStatus = "Evaluated";
    submission.reviewedByEmployer = true;
    submission.employerNotes = String(req.body.employerNotes || "").slice(0, 5000);
    await submission.save();
    return res.status(200).json({ success: true, message: "Submission reviewed", submission });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/assessments/:id ─────────────────────────────────────────────
exports.deleteAssessment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const assessment = await Assessment.findOne({ _id: req.params.id, employerId });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }
    const hasSubmissions = await AssessmentSubmission.exists({ assessmentId: assessment._id });
    if (hasSubmissions) {
      assessment.status = "Archived";
      await assessment.save();
      return res.status(200).json({ success: true, archived: true, message: "Assessment archived to preserve candidate results" });
    }
    await assessment.deleteOne();
    return res.status(200).json({ success: true, message: "Assessment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
