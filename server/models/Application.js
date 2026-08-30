const mongoose = require("mongoose");

// ==========================================
// COURSE APPLICATION SCHEMA
// ==========================================

const courseApplicationSchema = new mongoose.Schema(
  {
    // Student who applied
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      index: true,
    },

    // Course applied for
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },

    // Application status
    status: {
      type: String,
      enum: {
        values: ["Applied", "Enrolled", "Completed", "Rejected"],
        message: "Invalid application status",
      },
      default: "Applied",
      index: true,
    },

    // Date of application
    appliedAt: {
      type: Date,
      default: Date.now,
    },

    // Course completion percentage
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PREVENT DUPLICATE APPLICATION
// ==========================================

courseApplicationSchema.index(
  {
    student: 1,
    course: 1,
  },
  {
    unique: true,
  }
);

const CourseApplication = mongoose.model(
  "CourseApplication",
  courseApplicationSchema
);

module.exports = CourseApplication;