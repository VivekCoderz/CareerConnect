const Assessment = require("../models/Assessment");
const AssessmentSubmission = require("../models/AssessmentSubmission");
const EmployerProfile = require("../models/EmployerProfile");

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
    const employerId = await getEmployerProfileId(req.user);
    const assessments = await Assessment.find({ employerId })
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

    const assessment = await Assessment.create({
      employerId,
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

    return res.status(200).json({
      success: true,
      assessment,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/assessments/:id/submit (Candidate submits test answers)
exports.submitAssessment = async (req, res, next) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const { answers, timeTakenSeconds, jobId, applicationId } = req.body;
    const candidateId = req.user._id;

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;

    const evaluatedAnswers = (assessment.questions || []).map((q) => {
      const submitted = (answers || []).find((a) => a.questionId.toString() === q._id.toString());
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
      jobId: jobId || assessment.jobId || null,
      applicationId: applicationId || null,
      answers: evaluatedAnswers,
      totalQuestions: assessment.questions.length,
      correctAnswersCount: correctCount,
      score: totalScore,
      totalPossibleScore: totalPossible,
      percentage,
      passed,
      timeTakenSeconds: timeTakenSeconds || 0,
    });

    return res.status(201).json({
      success: true,
      message: passed ? "Congratulations, you passed the assessment!" : "Assessment submitted.",
      submission,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/assessments/:id/results (Employer views candidate submissions)
exports.getAssessmentResults = async (req, res, next) => {
  try {
    const submissions = await AssessmentSubmission.find({ assessmentId: req.params.id })
      .populate("candidateId", "fullName email profileImage userType")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
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
