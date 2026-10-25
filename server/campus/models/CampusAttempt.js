const mongoose = require("mongoose");

// A student's single attempt at an assessment (PRD R9 to R12). The unique index on
// (assessmentId, userId) is what enforces "one attempt".
const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    optionId: { type: String, default: null },
    text: { type: String, default: "", maxlength: 6000 },
    audioFileId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusFile", default: null },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  { type: { type: String, required: true }, at: { type: Date, default: Date.now }, counted: Boolean },
  { _id: false }
);

const markSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    score: { type: Number, default: null },
    maxScore: { type: Number, default: 0 },
    reason: { type: String, default: "", maxlength: 1000 },
    source: { type: String, enum: ["key", "ai", "reviewer"], default: "key" },
    status: { type: String, enum: ["pending", "done", "failed"], default: "done" },
  },
  { _id: false }
);

const changeSchema = new mongoose.Schema(
  {
    questionId: String,
    from: Number,
    to: Number,
    note: { type: String, maxlength: 500 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const campusAttemptSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusAssessment", required: true, index: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusMember", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted"],
      default: "in_progress",
      index: true,
    },
    submitReason: { type: String, enum: ["", "student", "time_up", "tab_switching"], default: "" },
    startedAt: { type: Date, default: Date.now },
    deadlineAt: { type: Date, required: true, index: true },
    submittedAt: { type: Date, default: null },
    // Set when staff publish results; the student sees their result only after this (PRD R11).
    releasedAt: { type: Date, default: null },
    questionOrder: { type: [String], default: [] },
    optionOrder: { type: Map, of: [String], default: {} },
    answers: { type: [answerSchema], default: [] },
    proctor: {
      events: { type: [eventSchema], default: [] },
      countedEvents: { type: Number, default: 0 },
      snapshots: [{ fileId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusFile" }, at: Date, _id: false }],
      lastSnapshotAt: { type: Date, default: null },
      flags: { type: [String], default: [] },
    },
    marks: { type: [markSchema], default: [] },
    scores: {
      bySection: { type: Map, of: { score: Number, max: Number, _id: false }, default: {} },
      total: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    feedback: {
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
    },
    review: {
      status: { type: String, enum: ["not_ready", "ready", "reviewed"], default: "not_ready" },
      changes: { type: [changeSchema], default: [] },
    },
  },
  { timestamps: true }
);

campusAttemptSchema.index({ assessmentId: 1, userId: 1 }, { unique: true });

campusAttemptSchema.methods.isOpen = function isOpen(now = new Date()) {
  return this.status === "in_progress" && now <= this.deadlineAt;
};

module.exports = mongoose.models.CampusAttempt || mongoose.model("CampusAttempt", campusAttemptSchema);
