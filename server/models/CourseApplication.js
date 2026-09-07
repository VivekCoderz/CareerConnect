const mongoose = require("mongoose");

// ==========================================
// COURSE APPLICATION SCHEMA
// ==========================================

const courseApplicationSchema = new mongoose.Schema(
  {
    // ==========================================
    // STUDENT REFERENCE
    // ==========================================

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      index: true,
    },

    // ==========================================
    // COURSE REFERENCE
    // ==========================================

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },

    // ==========================================
    // APPLICATION STATUS
    // ==========================================

    status: {
      type: String,
      enum: {
        values: ["Applied", "Enrolled", "Completed", "Rejected"],
        message: "Invalid application status",
      },
      default: "Applied",
      index: true,
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

// ==========================================
// MODEL
// ==========================================

const CourseApplication = mongoose.model(
  "CourseApplication",
  courseApplicationSchema
);

module.exports = CourseApplication;