const CampusAssessment = require("../models/CampusAssessment");
const CampusAttempt = require("../models/CampusAttempt");
const { toStudentQuestion } = require("../models/CampusAssessment");
const { startAttempt, finalizeAttempt, recordEvent, acceptsAnswers } = require("../services/attempts");
const { saveFile } = require("../services/files");
const { pendingItems } = require("../services/scoring");

// Student side of the assessment (PRD R8 to R12). The client never sends scores, deadlines or
// question order; the server decides all of them.

const ALLOWED_EVENTS = ["fullscreen_exit", "tab_hidden", "window_blur", "camera_lost", "paste_blocked", "camera_ready"];

const myAssessments = (req) =>
  CampusAssessment.find({
    institutionId: req.institution._id,
    batchId: req.member.batchId,
    status: { $ne: "archived" },
  }).sort({ opensAt: 1 });

/** The caller's attempt, scoped to their institution; ends it first if its time is up. */
const loadOwnAttempt = async (req) => {
  let attempt = await CampusAttempt.findOne({ _id: req.params.id, userId: req.user._id, institutionId: req.institution._id });
  if (attempt && attempt.status === "in_progress" && !acceptsAnswers(attempt)) attempt = await finalizeAttempt(attempt._id, "time_up");
  return attempt;
};

const attemptView = (attempt, assessment) => {
  const remainingSeconds = Math.max(0, Math.round((attempt.deadlineAt - Date.now()) / 1000));
  const base = {
    id: attempt._id,
    assessmentId: assessment._id,
    title: assessment.title,
    status: attempt.status,
    submitReason: attempt.submitReason,
    remainingSeconds: attempt.status === "in_progress" ? remainingSeconds : 0,
    deadlineAt: attempt.deadlineAt,
    countedEvents: attempt.proctor.countedEvents,
    maxTabEvents: assessment.maxTabEvents,
    snapshotEverySeconds: assessment.snapshotEverySeconds,
  };
  if (attempt.status !== "in_progress") return base;
  const byId = new Map(assessment.questions.map((q) => [q.id, q]));
  const optionOrder = attempt.optionOrder || new Map();
  return {
    ...base,
    sections: assessment.sections,
    questions: attempt.questionOrder.map((id) => toStudentQuestion(byId.get(id), optionOrder.get?.(id) || optionOrder[id])).filter(Boolean),
    answers: attempt.answers.map((a) => ({ questionId: a.questionId, optionId: a.optionId, text: a.text, hasAudio: Boolean(a.audioFileId) })),
  };
};

// GET /api/campus/assessments
exports.list = async (req, res, next) => {
  try {
    const assessments = await myAssessments(req);
    const attempts = await CampusAttempt.find({ userId: req.user._id, assessmentId: { $in: assessments.map((a) => a._id) } })
      .select("assessmentId status").lean();
    const byAssessment = new Map(attempts.map((a) => [String(a.assessmentId), a]));
    return res.status(200).json({
      success: true,
      assessments: assessments.map((a) => {
        const attempt = byAssessment.get(String(a._id));
        return {
          id: a._id,
          title: a.title,
          instructions: a.instructions,
          opensAt: a.opensAt,
          closesAt: a.closesAt,
          timeLimitMinutes: a.timeLimitMinutes,
          questionCount: a.questions.length,
          sections: a.sections,
          state: a.windowState(),
          attempt: attempt ? { id: attempt._id, status: attempt.status } : null,
          resultsPublished: Boolean(attempt?.releasedAt),
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/assessments/:id/start
exports.start = async (req, res, next) => {
  try {
    const assessment = await CampusAssessment.findOne({ _id: req.params.id, institutionId: req.institution._id, batchId: req.member.batchId });
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    const { attempt, error } = await startAttempt(assessment, req.member);
    if (error) return res.status(409).json({ success: false, code: "NOT_OPEN", message: "This assessment is not open right now." });
    const current = attempt.status === "in_progress" && !acceptsAnswers(attempt) ? await finalizeAttempt(attempt._id, "time_up") : attempt;
    return res.status(200).json({ success: true, attempt: attemptView(current, assessment) });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/attempts/:id
exports.get = async (req, res, next) => {
  try {
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    const assessment = await CampusAssessment.findById(attempt.assessmentId);
    return res.status(200).json({ success: true, attempt: attemptView(attempt, assessment) });
  } catch (error) {
    return next(error);
  }
};

const closed = (res) => res.status(409).json({ success: false, code: "ATTEMPT_CLOSED", message: "This test has already been submitted." });

const upsertAnswer = (attempt, questionId, patch) => {
  const existing = attempt.answers.find((a) => a.questionId === questionId);
  if (existing) Object.assign(existing, patch, { savedAt: new Date() });
  else attempt.answers.push({ questionId, ...patch, savedAt: new Date() });
};

// PUT /api/campus/attempts/:id/answers/:qid { optionId } | { text }
exports.saveAnswer = async (req, res, next) => {
  try {
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    if (!acceptsAnswers(attempt)) return closed(res);
    const assessment = await CampusAssessment.findById(attempt.assessmentId).lean();
    const question = assessment.questions.find((q) => q.id === req.params.qid);
    if (!question || question.type === "speaking") return res.status(400).json({ success: false, message: "Unknown question." });
    if (question.type === "mcq") {
      const { optionId } = req.body || {};
      if (optionId !== null && !question.options.some((o) => o.id === optionId)) {
        return res.status(400).json({ success: false, message: "Unknown option." });
      }
      upsertAnswer(attempt, question.id, { optionId });
    } else {
      const { text } = req.body || {};
      if (typeof text !== "string" || text.length > 6000) return res.status(400).json({ success: false, message: "Answer is too long." });
      upsertAnswer(attempt, question.id, { text });
    }
    await attempt.save();
    return res.status(200).json({ success: true, savedAt: new Date() });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/attempts/:id/audio/:qid (multipart "audio")
exports.saveAudio = async (req, res, next) => {
  try {
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    if (!acceptsAnswers(attempt)) return closed(res);
    const assessment = await CampusAssessment.findById(attempt.assessmentId).lean();
    const question = assessment.questions.find((q) => q.id === req.params.qid && q.type === "speaking");
    if (!question) return res.status(400).json({ success: false, message: "Unknown question." });
    if (!req.file || !/^audio\//.test(req.file.mimetype)) return res.status(400).json({ success: false, message: "Attach the recording." });
    const file = await saveFile({ institutionId: attempt.institutionId, attemptId: attempt._id, kind: "audio", buffer: req.file.buffer, mimeType: req.file.mimetype });
    upsertAnswer(attempt, question.id, { audioFileId: file._id });
    await attempt.save();
    return res.status(200).json({ success: true, savedAt: new Date() });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/attempts/:id/events { type }
exports.event = async (req, res, next) => {
  try {
    const type = String(req.body?.type || "");
    if (!ALLOWED_EVENTS.includes(type)) return res.status(400).json({ success: false, message: "Unknown event." });
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    if (attempt.status !== "in_progress") return closed(res);
    const assessment = await CampusAssessment.findById(attempt.assessmentId);
    const result = await recordEvent(attempt, assessment, type);
    return res.status(200).json({
      success: true,
      autoSubmitted: result.autoSubmitted,
      countedEvents: result.attempt.proctor.countedEvents,
      maxTabEvents: assessment.maxTabEvents,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/attempts/:id/snapshot (multipart "image")
exports.snapshot = async (req, res, next) => {
  try {
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    if (attempt.status !== "in_progress") return closed(res);
    if (!req.file || !/^image\/(jpeg|png|webp)$/.test(req.file.mimetype)) return res.status(400).json({ success: false, message: "Attach the photo." });
    const file = await saveFile({ institutionId: attempt.institutionId, attemptId: attempt._id, kind: "snapshot", buffer: req.file.buffer, mimeType: req.file.mimetype });
    attempt.proctor.snapshots.push({ fileId: file._id, at: new Date() });
    attempt.proctor.lastSnapshotAt = new Date();
    await attempt.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/attempts/:id/submit
exports.submit = async (req, res, next) => {
  try {
    const attempt = await loadOwnAttempt(req);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    const done = attempt.status === "in_progress" ? await finalizeAttempt(attempt._id, "student") : attempt;
    return res.status(200).json({ success: true, status: done.status, submitReason: done.submitReason });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/results/:assessmentId: only after results are published (PRD R11, R12)
exports.result = async (req, res, next) => {
  try {
    const assessment = await CampusAssessment.findOne({ _id: req.params.assessmentId, institutionId: req.institution._id });
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    const attempt = await CampusAttempt.findOne({ assessmentId: assessment._id, userId: req.user._id });
    if (!attempt) return res.status(200).json({ success: true, status: "not_attempted" });
    // Each test waits until staff publish it, including tests taken after an earlier publish.
    if (!attempt.releasedAt || attempt.status === "in_progress" || pendingItems(attempt).length) {
      return res.status(200).json({ success: true, status: "pending" });
    }
    const sections = assessment.sections.map((s) => {
      const v = attempt.scores.bySection.get(s.key) || { score: 0, max: 0 };
      return { key: s.key, title: s.title, score: v.score, max: v.max };
    });
    return res.status(200).json({
      success: true,
      status: "published",
      result: {
        title: assessment.title,
        total: attempt.scores.total,
        max: attempt.scores.max,
        percentage: attempt.scores.max ? Math.round((attempt.scores.total / attempt.scores.max) * 100) : 0,
        sections,
        strengths: attempt.feedback.strengths,
        improvements: attempt.feedback.improvements,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};
