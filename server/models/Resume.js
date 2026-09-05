const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rawData: {
      type: Object,
      required: true,
    },
    generatedData: {
      type: Object,
      default: null,
    },
    selectedTemplate: {
      type: String,
      enum: ["professional", "modern", "minimal"],
      default: "professional",
    },
  },
  { timestamps: true }
);

resumeSchema.index({ user: 1 }, { unique: true });

const Resume = mongoose.model("Resume", resumeSchema);
module.exports = Resume;