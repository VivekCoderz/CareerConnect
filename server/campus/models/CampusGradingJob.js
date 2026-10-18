const mongoose = require("mongoose");

// Queue of written answers waiting for AI marking (PRD R11). Kept in MongoDB so a restart or a
// second server instance never loses or double-marks an answer.
const campusGradingJobSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusAttempt", required: true, index: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusAssessment", required: true, index: true },
    questionId: { type: String, required: true },
    status: { type: String, enum: ["queued", "running", "done", "failed"], default: "queued", index: true },
    tries: { type: Number, default: 0 },
    nextRunAt: { type: Date, default: Date.now, index: true },
    lockedUntil: { type: Date, default: null },
    result: {
      score: { type: Number, default: null },
      maxScore: { type: Number, default: null },
      reason: { type: String, default: "" },
      model: { type: String, default: "" },
    },
    error: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

campusGradingJobSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

module.exports =
  mongoose.models.CampusGradingJob || mongoose.model("CampusGradingJob", campusGradingJobSchema);
