const CampusAssessment = require("../models/CampusAssessment");
const CampusAttempt = require("../models/CampusAttempt");
const CampusMember = require("../models/CampusMember");
const CampusFile = require("../models/CampusFile");
const { pickAssessment, pct } = require("../services/reportData");
const { pendingItems } = require("../services/scoring");
const { publishState, publishResults } = require("../services/publish");
const { fileLink } = require("../services/files");

// Test analysis for the university admin (and staff): section-wise attempted, correct, wrong and
// skipped, every student's breakdown, their answer sheet, and the publish button. Shown as soon
// as tests are submitted, so the university can look before publishing.

const apiBase = (req) => `${req.protocol}://${req.get("host")}/api/campus`;

const answered = (q, a) => (q.type === "mcq" ? Boolean(a?.optionId) : q.type === "written" ? Boolean(a?.text?.trim()) : Boolean(a?.audioFileId));

/** One student's counts per section. */
const breakdown = (assessment, attempt) => {
  const bySection = attempt.scores?.bySection instanceof Map ? Object.fromEntries(attempt.scores.bySection) : attempt.scores?.bySection || {};
  return assessment.sections.map((s) => {
    const qs = assessment.questions.filter((q) => q.section === s.key);
    const counts = { attempted: 0, correct: 0, wrong: 0, skipped: 0 };
    qs.forEach((q) => {
      const a = attempt.answers.find((x) => x.questionId === q.id);
      if (!answered(q, a)) { counts.skipped += 1; return; }
      counts.attempted += 1;
      if (q.type === "mcq") counts[a.optionId === q.correctOptionId ? "correct" : "wrong"] += 1;
    });
    const sec = bySection[s.key] || { score: 0, max: qs.reduce((t, q) => t + q.points, 0) };
    return { key: s.key, title: s.title, questions: qs.length, mcq: qs.filter((q) => q.type === "mcq").length, ...counts, score: sec.score, max: sec.max };
  });
};

// GET /api/campus/manager/analysis?assessmentId=
exports.analysis = async (req, res, next) => {
  try {
    const assessment = await pickAssessment(req.institution._id, req.query.assessmentId);
    if (!assessment) return res.status(200).json({ success: true, assessment: null });
    const attempts = await CampusAttempt.find({ assessmentId: assessment._id, status: { $ne: "in_progress" } }).lean();
    const members = await CampusMember.find({ _id: { $in: attempts.map((a) => a.memberId) } }).select("fullName rollNo band email").lean();
    const memberById = new Map(members.map((m) => [String(m._id), m]));

    const students = attempts.map((a) => {
      const m = memberById.get(String(a.memberId)) || {};
      const pending = pendingItems(a).length;
      return {
        memberId: a.memberId, fullName: m.fullName || "-", rollNo: m.rollNo || "", band: m.band ?? null,
        status: a.status, submitReason: a.submitReason, submittedAt: a.submittedAt, released: Boolean(a.releasedAt), pendingMarks: pending,
        total: a.scores.total, max: a.scores.max, percentage: pct(a.scores.total, a.scores.max), sections: breakdown(assessment, a),
      };
    }).sort((x, y) => (y.percentage ?? -1) - (x.percentage ?? -1) || String(x.fullName).localeCompare(String(y.fullName)));

    const sections = assessment.sections.map((s) => {
      const rows = students.map((st) => st.sections.find((x) => x.key === s.key));
      const sum = (k) => rows.reduce((t, r) => t + (r?.[k] || 0), 0);
      const n = rows.length || 1;
      const questions = rows[0]?.questions ?? assessment.questions.filter((q) => q.section === s.key).length;
      const mcqAnswered = sum("correct") + sum("wrong");
      return {
        key: s.key, title: s.title, questions,
        avgAttempted: Math.round((sum("attempted") / n) * 10) / 10,
        attemptRate: rows.length ? pct(sum("attempted"), questions * rows.length) : null,
        accuracy: mcqAnswered ? pct(sum("correct"), mcqAnswered) : null,
        correct: sum("correct"), wrong: sum("wrong"), skipped: sum("skipped"),
        averagePercentage: rows.length && sum("max") ? pct(sum("score"), sum("max")) : null,
      };
    });

    const state = await publishState(assessment);
    return res.status(200).json({
      success: true,
      assessment: { id: assessment._id, title: assessment.title, totalMarks: assessment.questions.reduce((t, q) => t + q.points, 0), resultsPublishedAt: assessment.resultsPublishedAt },
      publish: { toRelease: state.toRelease, pendingMarking: state.pending, inProgress: state.inProgress, released: students.filter((s) => s.released).length, submitted: students.length },
      sections,
      students,
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/manager/attempts/:memberId/answers?assessmentId=
exports.answerSheet = async (req, res, next) => {
  try {
    const assessment = await pickAssessment(req.institution._id, req.query.assessmentId);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    const attempt = await CampusAttempt.findOne({ assessmentId: assessment._id, memberId: req.params.memberId, institutionId: req.institution._id }).lean();
    if (!attempt || attempt.status === "in_progress") return res.status(404).json({ success: false, message: "No submitted test for this student." });
    const member = await CampusMember.findById(attempt.memberId).select("fullName rollNo email band").lean();
    const audioIds = attempt.answers.map((a) => a.audioFileId).filter(Boolean);
    const files = await CampusFile.find({ _id: { $in: audioIds }, institutionId: req.institution._id }).lean();
    const fileById = new Map(files.map((f) => [String(f._id), f]));
    const title = new Map(assessment.sections.map((s) => [s.key, s.title]));

    const questions = assessment.questions.map((q, i) => {
      const a = attempt.answers.find((x) => x.questionId === q.id);
      const mark = attempt.marks.find((m) => m.questionId === q.id) || null;
      const file = a?.audioFileId && fileById.get(String(a.audioFileId));
      return {
        number: i + 1, id: q.id, section: title.get(q.section) || q.section, type: q.type, prompt: q.prompt, context: q.context || "", points: q.points,
        options: q.type === "mcq" ? q.options : [], correctOptionId: q.type === "mcq" ? q.correctOptionId : null,
        chosenOptionId: a?.optionId || null, answerText: q.type === "written" ? a?.text || "" : "", audioUrl: file ? fileLink(file, apiBase(req)) : null,
        answered: answered(q, a), correct: q.type === "mcq" && answered(q, a) ? a.optionId === q.correctOptionId : null,
        bookmarked: (attempt.bookmarks || []).includes(q.id), compulsory: Boolean(q.compulsory),
        mark: mark && { score: mark.score, max: mark.maxScore, status: mark.status, source: mark.source, reason: mark.reason },
      };
    });
    return res.status(200).json({
      success: true,
      student: member,
      attempt: { status: attempt.status, submitReason: attempt.submitReason, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, released: Boolean(attempt.releasedAt), total: attempt.scores.total, max: attempt.scores.max },
      sections: breakdown(assessment, attempt),
      questions,
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/manager/publish { assessmentId? }: the university admin releases results.
exports.publish = async (req, res, next) => {
  try {
    const lean = await pickAssessment(req.institution._id, req.body?.assessmentId);
    if (!lean) return res.status(404).json({ success: false, message: "Assessment not found." });
    const assessment = await CampusAssessment.findById(lean._id);
    const { status, body } = await publishResults(assessment, req.user);
    return res.status(status).json(body);
  } catch (error) {
    return next(error);
  }
};
