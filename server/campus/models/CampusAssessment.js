const mongoose = require("mongoose");

// One assessment for a batch (PRD R8). Correct answers and rubrics never leave the server
// through student endpoints; see toStudentQuestion.
const optionSchema = new mongoose.Schema(
  { id: { type: String, required: true }, text: { type: String, required: true, maxlength: 600 } },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // stable id, e.g. "q01"
    section: { type: String, required: true },
    type: { type: String, enum: ["mcq", "written", "speaking"], required: true },
    prompt: { type: String, required: true, maxlength: 3000 },
    // Optional table or data shown with the question (data interpretation), plain text.
    context: { type: String, default: "", maxlength: 3000 },
    options: { type: [optionSchema], default: [] },
    correctOptionId: { type: String, default: null }, // mcq only
    rubric: { type: String, default: "", maxlength: 3000 }, // written and speaking
    explanation: { type: String, default: "", maxlength: 1500 }, // for reviewers only
    points: { type: Number, default: 1, min: 0 },
    minWords: { type: Number, default: 0 },
    maxWords: { type: Number, default: 0 },
    maxSeconds: { type: Number, default: 0 }, // speaking
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  { key: { type: String, required: true }, title: { type: String, required: true } },
  { _id: false }
);

const campusAssessmentSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    instructions: { type: String, default: "", maxlength: 4000 },
    opensAt: { type: Date, required: true },
    closesAt: { type: Date, required: true },
    timeLimitMinutes: { type: Number, default: 60, min: 1, max: 300 },
    maxAttempts: { type: Number, default: 1, min: 1, max: 1 }, // one attempt (PRD R9)
    maxTabEvents: { type: Number, default: 3, min: 1, max: 20 }, // auto-submit on this event (R10)
    snapshotEverySeconds: { type: Number, default: 180, min: 30, max: 900 },
    sections: { type: [sectionSchema], default: [] },
    questions: { type: [questionSchema], default: [] },
    resultsPublishedAt: { type: Date, default: null },
    status: { type: String, enum: ["draft", "scheduled", "archived"], default: "scheduled", index: true },
  },
  { timestamps: true }
);

campusAssessmentSchema.methods.windowState = function windowState(now = new Date()) {
  if (now < this.opensAt) return "upcoming";
  if (now > this.closesAt) return "closed";
  return "open";
};

/** A question as a student may see it: no answer, rubric or explanation. */
const toStudentQuestion = (q, optionOrder) => {
  const options = (q.options || []).map((o) => ({ id: o.id, text: o.text }));
  const ordered = optionOrder
    ? optionOrder.map((id) => options.find((o) => o.id === id)).filter(Boolean)
    : options;
  return {
    id: q.id,
    section: q.section,
    type: q.type,
    prompt: q.prompt,
    context: q.context || "",
    options: q.type === "mcq" ? ordered : [],
    minWords: q.minWords || 0,
    maxWords: q.maxWords || 0,
    maxSeconds: q.maxSeconds || 0,
    points: q.points,
  };
};

const CampusAssessment =
  mongoose.models.CampusAssessment || mongoose.model("CampusAssessment", campusAssessmentSchema);
module.exports = CampusAssessment;
module.exports.toStudentQuestion = toStudentQuestion;
