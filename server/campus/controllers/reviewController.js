const AuditLog = require("../../models/AuditLog");
const CampusAssessment = require("../models/CampusAssessment");
const CampusAttempt = require("../models/CampusAttempt");
const CampusMember = require("../models/CampusMember");
const CampusFile = require("../models/CampusFile");
const { recompute, pendingItems } = require("../services/scoring");
const { flagSimilarAnswers } = require("../services/similarity");
const { fileLink } = require("../services/files");

// E2Job review of marks before results go out (PRD R11). Reviewers see flagged and pending items
// first, can change any mark with a note, then publish once nothing is pending.

const apiBase = (req) => `${req.protocol}://${req.get("host")}/api/campus`;

const findAssessment = (req) => CampusAssessment.findOne({ _id: req.params.id, institutionId: req.institution._id });

// GET /api/campus/ops/assessments
exports.listAssessments = async (req, res, next) => {
  try {
    const assessments = await CampusAssessment.find({ institutionId: req.institution._id }).sort({ opensAt: -1 }).lean();
    const counts = await CampusAttempt.aggregate([
      { $match: { institutionId: req.institution._id } },
      { $group: { _id: { a: "$assessmentId", s: "$status" }, n: { $sum: 1 } } },
    ]);
    const byA = {};
    counts.forEach((c) => { byA[String(c._id.a)] = { ...(byA[String(c._id.a)] || {}), [c._id.s]: c.n }; });
    return res.status(200).json({
      success: true,
      assessments: assessments.map((a) => ({
        id: a._id, title: a.title, opensAt: a.opensAt, closesAt: a.closesAt, timeLimitMinutes: a.timeLimitMinutes,
        questionCount: a.questions.length, resultsPublishedAt: a.resultsPublishedAt, attempts: byA[String(a._id)] || {},
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/campus/ops/assessments/:id { opensAt, closesAt }
exports.schedule = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    const opensAt = new Date(req.body?.opensAt);
    const closesAt = new Date(req.body?.closesAt);
    if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime()) || closesAt <= opensAt) {
      return res.status(400).json({ success: false, message: "Enter a valid opening and closing time." });
    }
    Object.assign(assessment, { opensAt, closesAt });
    await assessment.save();
    return res.status(200).json({ success: true, opensAt, closesAt });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/ops/assessments/:id/review
exports.review = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    await flagSimilarAnswers(assessment._id);
    const attempts = await CampusAttempt.find({ assessmentId: assessment._id }).lean();
    const members = await CampusMember.find({ _id: { $in: attempts.map((a) => a.memberId) } }).select("fullName email rollNo band").lean();
    const byMember = new Map(members.map((m) => [String(m._id), m]));
    const rows = attempts.map((a) => {
      const pending = pendingItems(a);
      return {
        id: a._id,
        student: byMember.get(String(a.memberId)) || null,
        status: a.status,
        submitReason: a.submitReason,
        total: a.scores?.total || 0,
        max: a.scores?.max || 0,
        countedEvents: a.proctor?.countedEvents || 0,
        flags: a.proctor?.flags || [],
        pending: pending.map((m) => ({ questionId: m.questionId, status: m.status, source: m.source })),
        snapshotCount: a.proctor?.snapshots?.length || 0,
      };
    });
    const weight = (r) => (r.pending.length ? 2 : 0) + (r.flags.length || r.countedEvents ? 1 : 0);
    rows.sort((x, y) => weight(y) - weight(x) || String(x.student?.fullName).localeCompare(String(y.student?.fullName)));
    return res.status(200).json({
      success: true,
      assessment: { id: assessment._id, title: assessment.title, resultsPublishedAt: assessment.resultsPublishedAt, closesAt: assessment.closesAt },
      attempts: rows,
      summary: {
        attempts: rows.length,
        inProgress: rows.filter((r) => r.status === "in_progress").length,
        needsAttention: rows.filter((r) => r.pending.length).length,
        flagged: rows.filter((r) => r.flags.length || r.countedEvents).length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/ops/attempts/:id
exports.attemptDetail = async (req, res, next) => {
  try {
    const attempt = await CampusAttempt.findOne({ _id: req.params.id, institutionId: req.institution._id });
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    const assessment = await CampusAssessment.findById(attempt.assessmentId).lean();
    const member = await CampusMember.findById(attempt.memberId).select("fullName email rollNo band").lean();
    const files = await CampusFile.find({ attemptId: attempt._id }).lean();
    const fileById = new Map(files.map((f) => [String(f._id), f]));
    const link = (id) => (id && fileById.get(String(id)) ? fileLink(fileById.get(String(id)), apiBase(req)) : null);
    const questions = assessment.questions.filter((q) => q.type !== "mcq").map((q) => {
      const answer = attempt.answers.find((a) => a.questionId === q.id);
      const mark = attempt.marks.find((m) => m.questionId === q.id);
      return {
        id: q.id, type: q.type, prompt: q.prompt, rubric: q.rubric, points: q.points,
        answerText: answer?.text || "", audioUrl: link(answer?.audioFileId), mark: mark || null,
      };
    });
    return res.status(200).json({
      success: true,
      attempt: {
        id: attempt._id, status: attempt.status, submitReason: attempt.submitReason, startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt, scores: attempt.scores, events: attempt.proctor.events, flags: attempt.proctor.flags,
        snapshots: attempt.proctor.snapshots.map((s) => ({ at: s.at, url: link(s.fileId) })), changes: attempt.review.changes,
      },
      student: member,
      questions,
      mcq: { score: attempt.marks.filter((m) => m.source === "key" && assessment.questions.find((q) => q.id === m.questionId)?.type === "mcq").reduce((s, m) => s + (m.score || 0), 0) },
    });
  } catch (error) {
    return next(error);
  }
};

// PATCH /api/campus/ops/attempts/:id/marks/:qid { score, note }
exports.setMark = async (req, res, next) => {
  try {
    const attempt = await CampusAttempt.findOne({ _id: req.params.id, institutionId: req.institution._id });
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found." });
    if (attempt.status === "in_progress") return res.status(409).json({ success: false, message: "The test is still in progress." });
    const assessment = await CampusAssessment.findById(attempt.assessmentId);
    const question = assessment.questions.find((q) => q.id === req.params.qid);
    const mark = attempt.marks.find((m) => m.questionId === req.params.qid);
    if (!question || !mark) return res.status(404).json({ success: false, message: "Question not found." });
    const score = Number(req.body?.score);
    if (!Number.isFinite(score) || score < 0 || score > question.points) {
      return res.status(400).json({ success: false, message: `Score must be from 0 to ${question.points}.` });
    }
    const note = String(req.body?.note || "").trim().slice(0, 500);
    const previous = mark.score;
    attempt.review.changes.push({ questionId: question.id, from: previous, to: score, note, by: req.user._id, at: new Date() });
    Object.assign(mark, { score, status: "done", source: "reviewer", reason: note || mark.reason });
    attempt.markModified("marks");
    recompute(assessment, attempt);
    await attempt.save();
    AuditLog.create({
      actorId: req.user._id, actorName: req.user.fullName || "", actorEmail: req.user.email || "",
      action: "CAMPUS_MARK_CHANGED", module: "Campus", target: String(attempt._id),
      details: { questionId: question.id, from: previous, to: score },
    }).catch(() => null);
    return res.status(200).json({ success: true, scores: attempt.scores });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/assessments/:id/publish
exports.publish = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    const attempts = await CampusAttempt.find({ assessmentId: assessment._id });
    const inProgress = attempts.filter((a) => a.status === "in_progress").length;
    const pending = attempts.filter((a) => pendingItems(a).length).length;
    if (inProgress || pending) {
      return res.status(409).json({
        success: false,
        code: "NOT_READY",
        message: `Not ready: ${inProgress} test(s) still in progress, ${pending} with marks still pending.`,
        inProgress,
        pending,
      });
    }
    for (const attempt of attempts) {
      recompute(assessment, attempt);
      attempt.review.status = "reviewed";
      await attempt.save();
    }
    assessment.resultsPublishedAt = new Date();
    await assessment.save();
    AuditLog.create({
      actorId: req.user._id, actorName: req.user.fullName || "", actorEmail: req.user.email || "",
      action: "CAMPUS_RESULTS_PUBLISHED", module: "Campus", target: String(assessment._id), details: { attempts: attempts.length },
    }).catch(() => null);
    return res.status(200).json({ success: true, resultsPublishedAt: assessment.resultsPublishedAt, attempts: attempts.length });
  } catch (error) {
    return next(error);
  }
};
