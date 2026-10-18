const CampusAttempt = require("../models/CampusAttempt");
const CampusAssessment = require("../models/CampusAssessment");

// Flags written answers that are too similar to another student's (PRD R11).
const THRESHOLD = 0.6;
const MIN_WORDS = 15;

const shingles = (text) => {
  const words = String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + 2 < words.length; i += 1) set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return { set, words: words.length };
};

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const s of a) if (b.has(s)) common += 1;
  return common / (a.size + b.size - common);
};

/** Recomputes "possible_copy:<questionId>" flags on every submitted attempt of an assessment. */
const flagSimilarAnswers = async (assessmentId) => {
  const assessment = await CampusAssessment.findById(assessmentId).lean();
  const written = assessment.questions.filter((q) => q.type === "written").map((q) => q.id);
  const attempts = await CampusAttempt.find({ assessmentId, status: { $ne: "in_progress" } });
  const flags = new Map(attempts.map((a) => [String(a._id), new Set()]));
  for (const qid of written) {
    const items = attempts
      .map((a) => ({ id: String(a._id), ...shingles(a.answers.find((x) => x.questionId === qid)?.text) }))
      .filter((x) => x.words >= MIN_WORDS);
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (jaccard(items[i].set, items[j].set) >= THRESHOLD) {
          flags.get(items[i].id).add(`possible_copy:${qid}`);
          flags.get(items[j].id).add(`possible_copy:${qid}`);
        }
      }
    }
  }
  let flagged = 0;
  for (const attempt of attempts) {
    const other = attempt.proctor.flags.filter((f) => !f.startsWith("possible_copy:"));
    const copy = [...flags.get(String(attempt._id))];
    if (copy.length) flagged += 1;
    attempt.proctor.flags = [...other, ...copy];
    await attempt.save();
  }
  return flagged;
};

module.exports = { flagSimilarAnswers, jaccard, shingles, THRESHOLD };
