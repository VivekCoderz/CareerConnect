const mongoose = require("mongoose");

const submissionAnswerSchema = new mongoose.Schema(
  {
    questionId: mongoose.Schema.Types.ObjectId,
    questionText: String,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    pointsAwarded: Number,
  },
  { _id: false }
);

const assessmentSubmissionSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    answers: [submissionAnswerSchema],
    totalQuestions: { type: Number, default: 0 },
    correctAnswersCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalPossibleScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    timeTakenSeconds: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
    attemptVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

assessmentSubmissionSchema.index({ assessmentId: 1, candidateId: 1 });
// Legacy submissions lack attemptVersion, so the new unique index can be built
// without deleting historical attempts.
assessmentSubmissionSchema.index(
  { assessmentId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { attemptVersion: 1 }, name: "one_current_attempt_per_candidate" }
);

module.exports = mongoose.model("AssessmentSubmission", assessmentSubmissionSchema);
