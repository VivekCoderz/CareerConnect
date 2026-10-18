const crypto = require("crypto");
const CampusAttempt = require("../models/CampusAttempt");
const CampusAssessment = require("../models/CampusAssessment");
const CampusGradingJob = require("../models/CampusGradingJob");
const { mcqMarks, recompute } = require("./scoring");

// Attempt lifecycle on the server (architecture section 7): one attempt, server deadline,
// automatic submission, and grading set-up at submission.

const GRACE_MS = 5000; // answers in flight when time runs out
const COUNTED_EVENTS = ["fullscreen_exit", "tab_hidden", "window_blur", "camera_lost"];
const EVENT_DEDUP_MS = 2000; // blur and visibility change fire together; count them once

const shuffled = (items) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Sections keep their order; questions inside a section and MCQ options are shuffled. */
const orderFor = (assessment) => {
  const sectionKeys = assessment.sections.map((s) => s.key);
  const questionOrder = sectionKeys.flatMap((key) =>
    shuffled(assessment.questions.filter((q) => q.section === key).map((q) => q.id))
  );
  const optionOrder = {};
  assessment.questions
    .filter((q) => q.type === "mcq")
    .forEach((q) => { optionOrder[q.id] = shuffled(q.options.map((o) => o.id)); });
  return { questionOrder, optionOrder };
};

/** Returns the student's attempt, creating it on first start (PRD R9). */
const startAttempt = async (assessment, member, now = new Date()) => {
  const existing = await CampusAttempt.findOne({ assessmentId: assessment._id, userId: member.userId });
  if (existing) return { attempt: existing, created: false };
  if (assessment.windowState(now) !== "open") return { error: "NOT_OPEN" };
  const deadlineAt = new Date(Math.min(now.getTime() + assessment.timeLimitMinutes * 60000, assessment.closesAt.getTime()));
  try {
    const attempt = await CampusAttempt.create({
      assessmentId: assessment._id,
      institutionId: assessment.institutionId,
      memberId: member._id,
      userId: member.userId,
      startedAt: now,
      deadlineAt,
      ...orderFor(assessment),
    });
    return { attempt, created: true };
  } catch (error) {
    if (error.code === 11000) {
      return { attempt: await CampusAttempt.findOne({ assessmentId: assessment._id, userId: member.userId }), created: false };
    }
    throw error;
  }
};

const acceptsAnswers = (attempt, now = new Date()) =>
  attempt.status === "in_progress" && now.getTime() <= attempt.deadlineAt.getTime() + GRACE_MS;

/**
 * Ends an attempt once (a concurrent second call finds it already ended), marks multiple choice,
 * queues written answers for the AI and leaves speaking for the reviewer.
 */
const finalizeAttempt = async (attemptId, reason) => {
  const status = reason === "student" ? "submitted" : "auto_submitted";
  const attempt = await CampusAttempt.findOneAndUpdate(
    { _id: attemptId, status: "in_progress" },
    { $set: { status, submitReason: reason, submittedAt: new Date() } },
    { new: true }
  );
  if (!attempt) return CampusAttempt.findById(attemptId);
  const assessment = await CampusAssessment.findById(attempt.assessmentId);

  const marks = mcqMarks(assessment, attempt);
  const jobs = [];
  for (const q of assessment.questions.filter((x) => x.type !== "mcq")) {
    const answer = attempt.answers.find((a) => a.questionId === q.id);
    const answered = q.type === "written" ? Boolean(answer?.text?.trim()) : Boolean(answer?.audioFileId);
    if (!answered) {
      marks.push({ questionId: q.id, score: 0, maxScore: q.points, source: "key", status: "done", reason: "Not answered." });
    } else if (q.type === "written") {
      marks.push({ questionId: q.id, score: null, maxScore: q.points, source: "ai", status: "pending" });
      jobs.push({ attemptId: attempt._id, assessmentId: assessment._id, questionId: q.id });
    } else {
      marks.push({ questionId: q.id, score: null, maxScore: q.points, source: "reviewer", status: "pending" });
    }
  }
  attempt.marks = marks;
  recompute(assessment, attempt);
  await attempt.save();
  if (jobs.length) await CampusGradingJob.insertMany(jobs, { ordered: false }).catch((e) => { if (e.code !== 11000) throw e; });
  return attempt;
};

/** Records a fair-test event; the configured count of counted events submits the attempt (R10). */
const recordEvent = async (attempt, assessment, type, now = new Date()) => {
  const counted = COUNTED_EVENTS.includes(type);
  const last = [...attempt.proctor.events].reverse().find((e) => e.counted);
  const duplicate = counted && last && now - last.at < EVENT_DEDUP_MS;
  attempt.proctor.events.push({ type, at: now, counted: counted && !duplicate });
  if (counted && !duplicate) attempt.proctor.countedEvents += 1;
  await attempt.save();
  if (attempt.proctor.countedEvents >= assessment.maxTabEvents) {
    return { attempt: await finalizeAttempt(attempt._id, "tab_switching"), autoSubmitted: true };
  }
  return { attempt, autoSubmitted: false };
};

/** Ends every attempt whose time is up, even if the browser was closed. */
const sweepExpired = async (now = new Date()) => {
  const expired = await CampusAttempt.find({ status: "in_progress", deadlineAt: { $lt: new Date(now - GRACE_MS) } }).select("_id").lean();
  for (const { _id } of expired) await finalizeAttempt(_id, "time_up");
  return expired.length;
};

module.exports = { startAttempt, finalizeAttempt, recordEvent, sweepExpired, acceptsAnswers, orderFor, COUNTED_EVENTS, GRACE_MS };
