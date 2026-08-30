const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "short_answer"],
      default: "multiple_choice",
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 10,
    },
  },
  { _id: true }
);

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
    },
    title: {
      type: String,
      required: [true, "Assessment title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    skillCategory: {
      type: String,
      default: "Technical",
    },
    timeLimitMinutes: {
      type: Number,
      default: 30,
      min: 5,
    },
    passingScorePercentage: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    questions: [questionSchema],
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Assessment", assessmentSchema);
