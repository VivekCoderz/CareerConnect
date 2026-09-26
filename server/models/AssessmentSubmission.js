const mongoose = require("mongoose");

// ─── MCQ Answer Sub-Schema ───────────────────────────────────────────────────
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

// ─── Coding Submission Sub-Schema ────────────────────────────────────────────
const testCaseResultSchema = new mongoose.Schema(
  {
    testCaseId: mongoose.Schema.Types.ObjectId,
    input: String,
    expectedOutput: String,
    actualOutput: String,
    passed: { type: Boolean, default: false },
    reviewStatus: {
      type: String,
      enum: ["InProgress", "PendingReview", "Evaluated"],
      default: "InProgress",
      index: true,
    },
    executionTimeMs: { type: Number, default: 0 },
    error: { type: String, default: "" },
    pointsAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const codeSubmissionSchema = new mongoose.Schema(
  {
    problemId: mongoose.Schema.Types.ObjectId,
    problemTitle: String,
    code: { type: String, default: "" },
    language: { type: String, default: "javascript" },
    testCaseResults: [testCaseResultSchema],
    totalTestCases: { type: Number, default: 0 },
    passedTestCases: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalPossibleScore: { type: Number, default: 0 },
    executionStatus: {
      type: String,
      enum: ["pending", "running", "completed", "error", "timeout"],
      default: "pending",
    },
  },
  { _id: false }
);

// ─── Communication Response Sub-Schema ──────────────────────────────────────
const communicationResponseSchema = new mongoose.Schema(
  {
    promptId: mongoose.Schema.Types.ObjectId,
    promptText: String,
    responseText: { type: String, default: "", maxlength: 10000 },
    recordingUrl: { type: String, default: "" },
    durationSeconds: { type: Number, default: 0 },
    aiScore: { type: Number, default: null },       // AI-evaluated score (0-100)
    aiFeedback: { type: String, default: "" },
    manualScore: { type: Number, default: null },    // Employer-reviewed score
    manualFeedback: { type: String, default: "" },
    pointsAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

// ─── Main Assessment Submission Schema ──────────────────────────────────────
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

    // Assessment type & round snapshot (denormalized for fast querying)
    assessmentType: {
      type: String,
      enum: ["MCQ", "Coding", "Communication"],
      default: "MCQ",
    },
    roundNumber: { type: Number, default: 1 },

    // MCQ answers
    answers: [submissionAnswerSchema],

    // Coding submissions
    codeSubmissions: [codeSubmissionSchema],

    // Communication responses
    communicationResponses: [communicationResponseSchema],

    // Scoring
    totalQuestions: { type: Number, default: 0 },
    correctAnswersCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    totalPossibleScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },

    // Timing
    timeTakenSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now },

    // Proctoring
    proctorFlags: { type: [String], default: [] }, // e.g. ["tab_switched", "copy_paste_detected"]
    tabSwitchCount: { type: Number, default: 0 },
    fullscreenExitCount: { type: Number, default: 0 },
    focusLossCount: { type: Number, default: 0 },
    copyPasteCount: { type: Number, default: 0 },
    integrityScore: { type: Number, default: 100, min: 0, max: 100 },
    autoSubmitted: { type: Boolean, default: false },

    attemptVersion: { type: Number, default: 1 },

    // Employer review
    reviewedByEmployer: { type: Boolean, default: false },
    employerNotes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

assessmentSubmissionSchema.index({ assessmentId: 1, candidateId: 1 });
assessmentSubmissionSchema.index(
  { assessmentId: 1, candidateId: 1 },
  {
    unique: true,
    partialFilterExpression: { attemptVersion: 1 },
    name: "one_current_attempt_per_candidate",
  }
);
assessmentSubmissionSchema.index(
  { assessmentId: 1, candidateId: 1, attemptVersion: 1 },
  { unique: true, name: "unique_assessment_attempt" }
);
// Quickly fetch all submissions for a job across all rounds
assessmentSubmissionSchema.index({ jobId: 1, roundNumber: 1 });

module.exports = mongoose.model("AssessmentSubmission", assessmentSubmissionSchema);
