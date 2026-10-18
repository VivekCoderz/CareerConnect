const CampusGradingJob = require("../models/CampusGradingJob");
const CampusAttempt = require("../models/CampusAttempt");
const CampusAssessment = require("../models/CampusAssessment");
const grader = require("./grader");
const { recompute } = require("./scoring");
const { sweepExpired } = require("./attempts");

// AI marking queue (architecture section 8). Jobs are claimed atomically, so a restart or a
// second server instance never double-marks; failures retry with backoff, then wait for a person.

const BACKOFF_MS = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000];
const MAX_TRIES = BACKOFF_MS.length + 1;
const LOCK_MS = 2 * 60 * 1000;
const CONCURRENCY = 2;

const claimJob = (now = new Date()) =>
  CampusGradingJob.findOneAndUpdate(
    {
      status: { $in: ["queued", "running"] },
      nextRunAt: { $lte: now },
      $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
    },
    { $set: { status: "running", lockedUntil: new Date(now.getTime() + LOCK_MS) }, $inc: { tries: 1 } },
    { sort: { nextRunAt: 1 }, returnDocument: "after" }
  );

/** Writes a mark into the attempt and recomputes its totals. */
const applyMark = async (job, patch) => {
  const attempt = await CampusAttempt.findById(job.attemptId);
  if (!attempt) return;
  const mark = attempt.marks.find((m) => m.questionId === job.questionId);
  if (!mark || mark.source === "reviewer") return; // a reviewer's mark always wins
  Object.assign(mark, patch);
  const assessment = await CampusAssessment.findById(attempt.assessmentId);
  recompute(assessment, attempt);
  attempt.markModified("marks");
  await attempt.save();
};

const processJob = async (job) => {
  try {
    const assessment = await CampusAssessment.findById(job.assessmentId).lean();
    const attempt = await CampusAttempt.findById(job.attemptId).lean();
    const question = assessment?.questions.find((q) => q.id === job.questionId);
    const answer = attempt?.answers.find((a) => a.questionId === job.questionId);
    if (!question || !answer) throw new Error("Question or answer not found");
    const result = await grader.gradeWritten({
      prompt: question.prompt,
      rubric: question.rubric,
      maxScore: question.points,
      answer: answer.text,
    });
    await CampusGradingJob.updateOne(
      { _id: job._id },
      { $set: { status: "done", lockedUntil: null, result: { ...result, maxScore: question.points }, error: "" } }
    );
    await applyMark(job, { score: result.score, reason: result.reason, status: "done", source: "ai" });
  } catch (error) {
    const failed = job.tries >= MAX_TRIES;
    await CampusGradingJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: failed ? "failed" : "queued",
          lockedUntil: null,
          nextRunAt: new Date(Date.now() + (BACKOFF_MS[job.tries - 1] || 0)),
          error: String(error.message || error).slice(0, 500),
        },
      }
    );
    if (failed) await applyMark(job, { status: "failed", reason: "AI marking failed; please mark by hand." });
  }
};

/** One pass: claim up to CONCURRENCY jobs and mark them. Returns how many were processed. */
const runOnce = async () => {
  const jobs = [];
  for (let i = 0; i < CONCURRENCY; i += 1) {
    const job = await claimJob();
    if (!job) break;
    jobs.push(job);
  }
  await Promise.all(jobs.map(processJob));
  return jobs.length;
};

let timers = [];
const start = () => {
  if (timers.length) return;
  let busy = false;
  timers.push(setInterval(async () => {
    if (busy) return;
    busy = true;
    try { while (await runOnce()); } catch (e) { console.warn("[campus] grading worker:", e.message); } finally { busy = false; }
  }, 5000));
  timers.push(setInterval(() => {
    sweepExpired().catch((e) => console.warn("[campus] expiry sweep:", e.message));
  }, 60 * 1000));
  timers.forEach((t) => t.unref?.());
};
const stop = () => { timers.forEach(clearInterval); timers = []; };

module.exports = { runOnce, processJob, claimJob, start, stop, MAX_TRIES };
