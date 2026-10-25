const Batch = require("../models/Batch");
const CampusAssessment = require("../models/CampusAssessment");
const CampusAttempt = require("../models/CampusAttempt");
const { parseQuestions, questionsWorkbook } = require("../services/questionImport");
const { audit } = require("./membersController");

// Staff create tests from an Excel sheet, download the sample format, replace questions before
// anyone starts, and turn negative marking on or off. Scoring settings lock once a test is started.

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const sendXlsx = async (res, name, buffer) => {
  res.set("Content-Type", XLSX);
  res.set("Content-Disposition", `attachment; filename="${name}"`);
  return res.send(Buffer.from(buffer));
};

/** Standard instructions, so they always match the test's settings. */
const buildInstructions = ({ count, minutes, maxTabEvents = 3, negative, compulsory }) =>
  [
    `${count} questions in ${minutes} minutes. You have one attempt.`,
    "Your answers are saved as you go. If your connection drops, open the test again to continue; the timer keeps running.",
    `The test runs in full screen with your camera and microphone on. Leaving full screen or switching tabs is recorded; after ${maxTabEvents} times the test is submitted automatically.`,
    "Copy and paste are turned off.",
    negative ? `Negative marking: a wrong multiple-choice answer loses marks (${negative} by default, shown on each question). A blank answer loses nothing.` : "There is no negative marking.",
    compulsory ? `${compulsory} question${compulsory === 1 ? " is" : "s are"} compulsory and marked with *; answer ${compulsory === 1 ? "it" : "them"} before submitting.` : "",
    "Multiple-choice answers are checked automatically. Written and speaking answers are reviewed by the assessment team.",
    "The test is submitted automatically when the time is up.",
  ].filter(Boolean).join("\n");

const negativeFrom = (body) => {
  const enabled = body?.negativeEnabled === true || body?.negativeEnabled === "true";
  const defaultMarks = Number(body?.negativeDefault ?? 0);
  if (enabled && (!Number.isFinite(defaultMarks) || defaultMarks < 0 || defaultMarks > 10)) return { error: "Default negative marks must be from 0 to 10." };
  return { value: { enabled, defaultMarks: enabled ? defaultMarks : 0 } };
};

const findAssessment = (req) => CampusAssessment.findOne({ _id: req.params.id, institutionId: req.institution._id });
const hasAttempts = (assessment) => CampusAttempt.exists({ assessmentId: assessment._id });
const locked = (res) => res.status(409).json({ success: false, code: "HAS_ATTEMPTS", message: "Students have already started this test, so its questions and marking cannot change." });

const sheetResult = async (req) => {
  if (!req.file) throw Object.assign(new Error("Attach the questions sheet (.xlsx)."), { status: 400 });
  return parseQuestions(req.file);
};
const fail = (res, error, next) => (error.status ? res.status(error.status).json({ success: false, message: error.message }) : next(error));
const notValid = (res, result) =>
  res.status(400).json({ success: false, code: "SHEET_ERRORS", message: result.missingColumns.length ? `Missing columns: ${result.missingColumns.join(", ")}` : "Fix the rows with errors and upload again.", ...result, questions: undefined });

// GET /api/campus/ops/questions/template.xlsx
exports.template = async (req, res, next) => {
  try {
    return sendXlsx(res, "questions-sample-format.xlsx", await questionsWorkbook());
  } catch (error) {
    return next(error);
  }
};

// GET /api/campus/ops/assessments/:id/questions.xlsx
exports.exportQuestions = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    return sendXlsx(res, "questions.xlsx", await questionsWorkbook({ questions: assessment.questions, sections: assessment.sections, title: assessment.title }));
  } catch (error) {
    return next(error);
  }
};

// POST /api/campus/ops/questions/preview (multipart "file"): nothing is saved.
exports.preview = async (req, res, next) => {
  try {
    const result = await sheetResult(req);
    const counts = { mcq: 0, written: 0, speaking: 0 };
    result.questions.forEach((q) => { counts[q.type] += 1; });
    return res.status(200).json({
      success: true, ...result, questions: undefined, counts,
      totalMarks: result.questions.reduce((s, q) => s + q.points, 0),
      compulsory: result.questions.filter((q) => q.compulsory).length,
    });
  } catch (error) {
    return fail(res, error, next);
  }
};

// POST /api/campus/ops/assessments (multipart "file" + title, batchId, opensAt, closesAt, timeLimitMinutes, negativeEnabled, negativeDefault)
exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    const title = String(b.title || "").trim().slice(0, 160);
    const minutes = Number(b.timeLimitMinutes || 60);
    const opensAt = new Date(b.opensAt);
    const closesAt = new Date(b.closesAt);
    const batch = await Batch.findOne({ _id: b.batchId, institutionId: req.institution._id }).catch(() => null);
    const negative = negativeFrom(b);
    const problems = [];
    if (!title) problems.push("Enter the test name.");
    if (!batch) problems.push("Choose the batch.");
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 300) problems.push("Duration must be 5 to 300 minutes.");
    if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime()) || closesAt <= opensAt) problems.push("Enter a valid opening and closing time.");
    if (negative.error) problems.push(negative.error);
    if (problems.length) return res.status(400).json({ success: false, message: problems.join(" ") });

    const result = await sheetResult(req);
    if (!result.valid) return notValid(res, result);
    const compulsory = result.questions.filter((q) => q.compulsory).length;
    const assessment = await CampusAssessment.create({
      institutionId: req.institution._id,
      batchId: batch._id,
      title,
      opensAt,
      closesAt,
      timeLimitMinutes: minutes,
      sections: result.sections,
      questions: result.questions,
      negativeMarking: negative.value,
      instructions: buildInstructions({ count: result.questions.length, minutes, negative: negative.value.enabled && negative.value.defaultMarks, compulsory }),
      status: "scheduled",
    });
    await audit(req, "CAMPUS_TEST_CREATE", { assessmentId: String(assessment._id), questions: result.questions.length });
    return res.status(201).json({ success: true, assessment: { id: assessment._id, title, questionCount: result.questions.length } });
  } catch (error) {
    return fail(res, error, next);
  }
};

// PUT /api/campus/ops/assessments/:id/questions (multipart "file")
exports.replaceQuestions = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    if (await hasAttempts(assessment)) return locked(res);
    const result = await sheetResult(req);
    if (!result.valid) return notValid(res, result);
    Object.assign(assessment, { sections: result.sections, questions: result.questions });
    assessment.instructions = buildInstructions({
      count: result.questions.length, minutes: assessment.timeLimitMinutes, maxTabEvents: assessment.maxTabEvents,
      negative: assessment.negativeMarking?.enabled && assessment.negativeMarking.defaultMarks, compulsory: result.questions.filter((q) => q.compulsory).length,
    });
    await assessment.save();
    await audit(req, "CAMPUS_TEST_QUESTIONS", { assessmentId: String(assessment._id), questions: result.questions.length });
    return res.status(200).json({ success: true, questionCount: result.questions.length });
  } catch (error) {
    return fail(res, error, next);
  }
};

// PATCH /api/campus/ops/assessments/:id/marking { negativeEnabled, negativeDefault }
exports.setMarking = async (req, res, next) => {
  try {
    const assessment = await findAssessment(req);
    if (!assessment) return res.status(404).json({ success: false, message: "Assessment not found." });
    if (await hasAttempts(assessment)) return locked(res);
    const negative = negativeFrom(req.body);
    if (negative.error) return res.status(400).json({ success: false, message: negative.error });
    assessment.negativeMarking = negative.value;
    assessment.instructions = buildInstructions({
      count: assessment.questions.length, minutes: assessment.timeLimitMinutes, maxTabEvents: assessment.maxTabEvents,
      negative: negative.value.enabled && negative.value.defaultMarks, compulsory: assessment.questions.filter((q) => q.compulsory).length,
    });
    await assessment.save();
    await audit(req, "CAMPUS_TEST_MARKING", { assessmentId: String(assessment._id), ...negative.value });
    return res.status(200).json({ success: true, negativeMarking: assessment.negativeMarking });
  } catch (error) {
    return next(error);
  }
};
