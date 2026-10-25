// Turns an attempt's marks into section and total scores, and the student's strengths and
// improvements (PRD R11, R12). Pure functions: callers save the attempt.

const { negativeFor } = require("../models/CampusAssessment");

// 70% and above is a strength; anything below is a point to improve (weakest first).
const STRONG = 0.7;

const markFor = (attempt, questionId) => attempt.marks.find((m) => m.questionId === questionId);

/**
 * Marks for every multiple-choice question, straight from the answer key (no AI). With negative
 * marking on, a wrong answer loses marks; a blank answer scores 0.
 */
const mcqMarks = (assessment, attempt) =>
  assessment.questions
    .filter((q) => q.type === "mcq")
    .map((q) => {
      const answer = attempt.answers.find((a) => a.questionId === q.id);
      const answered = Boolean(answer?.optionId);
      const correct = answered && answer.optionId === q.correctOptionId;
      const minus = negativeFor(assessment, q);
      const score = correct ? q.points : answered && minus ? -minus : 0;
      const reason = correct ? "" : !answered ? "Not answered." : minus ? `Wrong answer (-${minus}).` : "Wrong answer.";
      return { questionId: q.id, score, maxScore: q.points, source: "key", status: "done", reason };
    });

/** Recomputes section scores, total, review readiness and feedback. */
const recompute = (assessment, attempt) => {
  const sectionTitle = new Map((assessment.sections || []).map((s) => [s.key, s.title]));
  const bySection = {};
  let total = 0;
  let max = 0;
  for (const q of assessment.questions) {
    const mark = markFor(attempt, q.id);
    const maxScore = mark?.maxScore ?? q.points;
    const score = mark?.status === "done" ? Number(mark.score) || 0 : 0;
    bySection[q.section] = bySection[q.section] || { score: 0, max: 0 };
    bySection[q.section].score += score;
    bySection[q.section].max += maxScore;
    max += maxScore;
  }
  // Negative marks can pull a section below zero; a section (and so the total) never goes below 0.
  Object.values(bySection).forEach((sec) => { sec.score = Math.max(0, Math.round(sec.score * 100) / 100); total += sec.score; });
  attempt.scores = { bySection, total: Math.round(total * 100) / 100, max };

  const pendingAi = attempt.marks.some((m) => m.source === "ai" && m.status === "pending");
  if (attempt.review.status !== "reviewed") attempt.review.status = pendingAi ? "not_ready" : "ready";

  const ranked = Object.entries(bySection)
    .filter(([, s]) => s.max > 0)
    .map(([key, s]) => ({ title: sectionTitle.get(key) || key, ratio: s.score / s.max }))
    .sort((a, b) => b.ratio - a.ratio);
  const pct = (r) => `${Math.round(r * 100)}%`;
  attempt.feedback = {
    strengths: ranked.filter((s) => s.ratio >= STRONG).slice(0, 3).map((s) => `${s.title} (${pct(s.ratio)})`),
    improvements: ranked.filter((s) => s.ratio < STRONG).reverse().slice(0, 3).map((s) => `${s.title} (${pct(s.ratio)})`),
  };
  if (!attempt.feedback.strengths.length && ranked[0]) attempt.feedback.strengths = [`${ranked[0].title} (${pct(ranked[0].ratio)})`];
  return attempt;
};

/** What still needs a person before results can be published. */
const pendingItems = (attempt) =>
  attempt.marks.filter((m) => m.status === "failed" || (m.source !== "key" && m.status === "pending"));

module.exports = { mcqMarks, recompute, pendingItems, markFor };
