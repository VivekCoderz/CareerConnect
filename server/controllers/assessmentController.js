const Assessment = require("../models/Assessment");
const AssessmentSubmission = require("../models/AssessmentSubmission");
const Job = require("../models/Job");
const EmployerProfile = require("../models/EmployerProfile");
const Application = require("../models/Application");
const Job = require("../models/Job");

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

// GET /api/assessments (List assessments created by employer)
exports.getAssessments = async (req, res, next) => {
  try {
    const employerProfile = await EmployerProfile.findOne({ userId: req.user._id });
    const myJobs = await Job.find(
      {
        $or: [
          { createdBy: req.user._id },
          ...(employerProfile ? [{ employerId: employerProfile._id }] : []),
        ],
      },
      "_id"
    );
    const jobIds = myJobs.map((j) => j._id);
    const orCond = [{ createdBy: req.user._id }];
    if (jobIds.length > 0) orCond.push({ jobId: { $in: jobIds } });
    if (employerProfile) orCond.push({ employerId: employerProfile._id });

    const assessments = await Assessment.find({ $or: orCond })
      .populate("jobId", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assessments.length,
      assessments,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/assessments (Create assessment)
exports.createAssessment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    const { title, description, skillCategory, timeLimitMinutes, passingScorePercentage, questions, jobId } = req.body;

    if (!title || !questions || !questions.length) {
      return res.status(400).json({
        success: false,
        message: "Title and at least one question are required",
      });
    }

    if (jobId && !(await Job.exists({ _id: jobId, $or: [
      { employerId }, { createdBy: req.user._id },
    ] }))) {
      return res.status(403).json({ success: false, message: "You cannot attach another employer's job." });
    }

    const assessment = await Assessment.create({
      employerId,
      createdBy: req.user._id,
      jobId: jobId || null,
      title: title.trim(),
      description: description || "",
      skillCategory: skillCategory || "Technical",
      timeLimitMinutes: Number(timeLimitMinutes) || 30,
      passingScorePercentage: Number(passingScorePercentage) || 70,
      questions,
      status: "Active",
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

// GET /api/assessments/:id
exports.getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const employer = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
    const isOwner = employer && String(assessment.employerId) === String(employer._id);
    if (!isOwner) {
      if (assessment.status !== "Active" ||
          (assessment.jobId && !(await Application.exists({
            candidateId: req.user._id, jobId: assessment.jobId,
          })))) {
        return res.status(404).json({ success: false, message: "Assessment not found" });
      }
    }
    const view = assessment.toObject();
    if (!isOwner) {
      view.questions = view.questions.map(({ correctAnswer, ...question }) => question);
    }
    return res.status(200).json({
      success: true,
      assessment: view,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/assessments/:id/submit (Candidate submits test answers)
exports.submitAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment || assessment.status !== "Active") {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const { answers, timeTakenSeconds } = req.body;
    const candidateId = req.user._id;
    if (req.user.role === "employer") {
      return res.status(403).json({ success: false, message: "Candidates only" });
    }
    if (!Array.isArray(answers) || answers.length > assessment.questions.length ||
        answers.some((answer) => !answer || !answer.questionId || typeof answer.selectedAnswer !== "string")) {
      return res.status(400).json({ success: false, message: "Invalid answers" });
    }
    const application = assessment.jobId
      ? await Application.findOne({ candidateId, jobId: assessment.jobId })
      : null;
    if (assessment.jobId && !application) {
      return res.status(403).json({ success: false, message: "An application to this job is required" });
    }
    if (await AssessmentSubmission.exists({ assessmentId: assessment._id, candidateId })) {
      return res.status(409).json({ success: false, message: "Assessment already submitted" });
    }

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;

    const evaluatedAnswers = (assessment.questions || []).map((q) => {
      const submitted = answers.find((a) => String(a.questionId) === String(q._id));
      const selected = submitted?.selectedAnswer || "";
      const isCorrect = selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      const pointsAwarded = isCorrect ? q.points || 10 : 0;

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

    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const passed = percentage >= assessment.passingScorePercentage;

    const submission = await AssessmentSubmission.create({
      assessmentId: assessment._id,
      candidateId,
      jobId: assessment.jobId || null,
      applicationId: application?._id || null,
      answers: evaluatedAnswers,
      totalQuestions: assessment.questions.length,
      correctAnswersCount: correctCount,
      score: totalScore,
      totalPossibleScore: totalPossible,
      percentage,
      passed,
      timeTakenSeconds: Number.isFinite(Number(timeTakenSeconds))
        ? Math.max(0, Math.min(Number(timeTakenSeconds), assessment.timeLimitMinutes * 60)) : 0,
      attemptVersion: 1,
    });

    const view = submission.toObject();
    view.answers = view.answers.map(({ correctAnswer, ...answer }) => answer);

    return res.status(201).json({
      success: true,
      message: passed ? "Congratulations, you passed the assessment!" : "Assessment submitted.",
      submission: view,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Assessment already submitted" });
    }
    next(error);
  }
};

// GET /api/assessments/:id/results (Employer views candidate submissions)
exports.getAssessmentResults = async (req, res, next) => {
  try {
    const employer = await EmployerProfile.findOne({ userId: req.user._id }).select("_id").lean();
    if (!employer || !(await Assessment.exists({ _id: req.params.id, employerId: employer._id }))) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
    const submissions = await AssessmentSubmission.find({ assessmentId: req.params.id })
      .populate("candidateId", "fullName email profileImage userType")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await AssessmentSubmission.countDocuments({ assessmentId: req.params.id });

    return res.status(200).json({
      success: true,
      count: total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/assessments/:id
exports.deleteAssessment = async (req, res, next) => {
  try {
    const employerId = await getEmployerProfileId(req.user);
    await Assessment.findOneAndDelete({ _id: req.params.id, employerId });

    return res.status(200).json({
      success: true,
      message: "Assessment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
