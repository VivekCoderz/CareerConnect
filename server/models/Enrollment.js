const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    enrolledRole: {
      type: String,
      enum: ["student", "fresher", "professional", "employer", "employee"],
      default: "employer",
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedLessons: {
      type: [String],
      default: [],
    },
    quizScores: [
      {
        quizTitle: String,
        score: Number,
        passed: Boolean,
        date: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["Enrolled", "In Progress", "Completed"],
      default: "In Progress",
      index: true,
    },
    certificateId: {
      type: String,
      default: "",
    },
    certificateUrl: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
