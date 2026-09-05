const mongoose = require("mongoose");

// ==========================================
// COURSE PROGRESS SCHEMA
// ==========================================

const courseProgressSchema = new mongoose.Schema(
  {
    // Student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // Completed content
    completedContents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseContent",
      },
    ],

    // Overall progress percentage
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// One progress record per student per course
courseProgressSchema.index(
  { student: 1, course: 1 },
  { unique: true }
);

const CourseProgress = mongoose.model(
  "CourseProgress",
  courseProgressSchema
);

module.exports = CourseProgress;