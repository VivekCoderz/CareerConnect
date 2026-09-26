const mongoose = require("mongoose");

// ─── MCQ Question Sub-Schema ────────────────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "short_answer"],
      default: "multiple_choice",
    },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: "" },
    points: { type: Number, default: 10 },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
  },
  { _id: true }
);

// ─── Coding Test Case Sub-Schema ────────────────────────────────────────────
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    isHidden: { type: Boolean, default: false }, // hidden test cases not shown to candidates
    points: { type: Number, default: 10 },
  },
  { _id: true }
);

// ─── Coding Problem Sub-Schema ───────────────────────────────────────────────
const codingProblemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    problemStatement: { type: String, required: true },
    starterCode: { type: String, default: "" },
    solutionCode: { type: String, default: "" }, // stored only for employer reference, hidden from candidates
    supportedLanguages: {
      type: [String],
      default: ["javascript", "python", "java", "cpp"],
    },
    defaultLanguage: { type: String, default: "javascript" },
    testCases: [testCaseSchema],
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    points: { type: Number, default: 50 },
    timeComplexityHint: { type: String, default: "" },
  },
  { _id: true }
);

// ─── Communication Prompt Sub-Schema ────────────────────────────────────────
const communicationPromptSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    maxDurationSeconds: { type: Number, default: 120 },
    preparationTimeSeconds: { type: Number, default: 30 },
    points: { type: Number, default: 20 },
    category: {
      type: String,
      enum: ["Introduction", "Situational", "Behavioral", "Technical", "Closing"],
      default: "Behavioral",
    },
  },
  { _id: true }
);

// ─── Main Assessment Schema ──────────────────────────────────────────────────
const assessmentSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
      index: true,
    },

    // Identification
    title: {
      type: String,
      required: [true, "Assessment title is required"],
      trim: true,
    },
    description: { type: String, default: "" },
    instructions: { type: String, default: "" },
    skillCategory: { type: String, default: "Technical" },

    // Round & Type
    assessmentType: {
      type: String,
      enum: ["MCQ", "Coding", "Communication"],
      default: "MCQ",
      index: true,
    },
    round: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
      index: true,
    },
    roundLabel: { type: String, default: "" }, // e.g. "Technical Screening", "Aptitude Round"

    // Timing
    timeLimitMinutes: { type: Number, default: 30, min: 5 },
    passingScorePercentage: { type: Number, default: 70, min: 0, max: 100 },

    // Scheduling
    scheduledAt: { type: Date, default: null },
    deadline: { type: Date, default: null },
    isScheduled: { type: Boolean, default: false },

    // Type-specific content
    questions: [questionSchema],           // MCQ
    codingProblems: [codingProblemSchema], // Coding
    communicationPrompts: [communicationPromptSchema], // Communication

    // Meta
    status: {
      type: String,
      enum: ["Draft", "Active", "Scheduled", "Completed", "Archived"],
      default: "Draft",
      index: true,
    },
    allowRetake: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1, min: 1, max: 5 },
    shuffleQuestions: { type: Boolean, default: false },
    showResultsToCandidate: { type: Boolean, default: true },
    notifyOnSubmission: { type: Boolean, default: true },
    enableProctoring: { type: Boolean, default: true },
    enforceFullscreen: { type: Boolean, default: true },
    trackTabSwitches: { type: Boolean, default: true },
    preventCopyPaste: { type: Boolean, default: true },
    maxTabSwitches: { type: Number, default: 3, min: 0, max: 20 },
  },
  {
    timestamps: true,
  }
);

// Compound index: one assessment per round per job
assessmentSchema.index({ employerId: 1, jobId: 1, round: 1 });

module.exports = mongoose.model("Assessment", assessmentSchema);
