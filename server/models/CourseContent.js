const mongoose = require("mongoose");

// ==========================================
// COURSE CONTENT SCHEMA
// ==========================================

const courseContentSchema = new mongoose.Schema(
  {
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
    // CONTENT TYPE
    // ==========================================

    type: {
      type: String,
      enum: {
        values: ["video", "pdf", "notes"],
        message: "Invalid content type",
      },
      required: [true, "Content type is required"],
    },

    // ==========================================
    // CONTENT BASIC INFORMATION
    // ==========================================

    title: {
      type: String,
      required: [true, "Content title is required"],
      trim: true,
      minlength: [2, "Content title must contain at least 2 characters"],
      maxlength: [200, "Content title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Content description cannot exceed 1000 characters"],
      default: "",
    },

    // ==========================================
    // VIDEO / PDF URL
    // ==========================================

    url: {
      type: String,
      trim: true,
      default: "",
    },
    // Cloudinary public ID
  publicId: {
  type: String,
  trim: true,
  default: "",
},

// Cloudinary resource type
resourceType: {
  type: String,
  enum: ["video", "image", "raw"],
  default: null,
},

    // ==========================================
    // TEXT NOTES
    // ==========================================

    content: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // VIDEO DURATION
    // ==========================================

    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
      default: 0,
    },

    // ==========================================
    // SECTION / CHAPTER
    // ==========================================

    section: {
      type: String,
      trim: true,
      maxlength: [150, "Section name cannot exceed 150 characters"],
      default: "General",
    },

    // ==========================================
    // CONTENT ORDER
    // ==========================================

    order: {
      type: Number,
      min: [1, "Order must be at least 1"],
      default: 1,
    },

    // ==========================================
    // CONTENT CREATOR
    // ==========================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Content creator is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

courseContentSchema.index({
  course: 1,
  order: 1,
});

courseContentSchema.index({
  course: 1,
  section: 1,
});

// ==========================================
// MODEL
// ==========================================

const CourseContent = mongoose.model(
  "CourseContent",
  courseContentSchema
);

module.exports = CourseContent;