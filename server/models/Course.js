const mongoose = require("mongoose");

// ==========================================
// COURSE SCHEMA
// ==========================================

const courseSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC COURSE INFORMATION
    // ==========================================

    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      minlength: [3, "Course title must contain at least 3 characters"],
      maxlength: [150, "Course title cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
      minlength: [10, "Course description must contain at least 10 characters"],
      maxlength: [3000, "Course description cannot exceed 3000 characters"],
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // COURSE CLASSIFICATION
    // ==========================================

    domain: {
      type: String,
      required: [true, "Course domain is required"],
      trim: true,
      maxlength: [100, "Domain cannot exceed 100 characters"],
      index: true,
    },

    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
      index: true,
    },

    level: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Invalid course level",
      },
      default: "beginner",
    },

    // ==========================================
    // COURSE DURATION
    // ==========================================

    duration: {
      type: Number,
      required: [true, "Course duration is required"],
      min: [1, "Course duration must be at least 1"],
    },

    durationUnit: {
      type: String,
      enum: {
        values: ["hours", "days", "weeks"],
        message: "Invalid duration unit",
      },
      default: "hours",
    },

    // ==========================================
    // SKILLS
    // ==========================================

    skills: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Skill cannot exceed 50 characters"],
      },
    ],

    // ==========================================
    // COURSE PRICE
    // ==========================================

    price: {
      type: Number,
      default: 0,
      min: [0, "Course price cannot be negative"],
    },

    // ==========================================
    // COURSE STATUS
    // ==========================================

    status: {
      type: String,
      enum: {
        values: ["Draft", "Published", "Archived"],
        message: "Invalid course status",
      },
      default: "Draft",
      index: true,
    },

    // ==========================================
    // COURSE CREATOR
    // ==========================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Course creator is required"],
      index: true,
    },

    // ==========================================
    // PUBLISH INFORMATION
    // ==========================================

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

courseSchema.index({
  createdBy: 1,
  status: 1,
});

courseSchema.index({
  domain: 1,
  category: 1,
  status: 1,
});

// ==========================================
// MODEL
// ==========================================

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;