// server/models/JobVisibility.js
const mongoose = require("mongoose");

const jobVisibilitySchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job reference is required"],
      unique: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 1. Hiring Scope: "On-Campus" or "Open / Off-Campus"
    hiringScope: {
      type: String,
      enum: ["On-Campus", "Open / Off-Campus"],
      default: "On-Campus",
      index: true,
    },

    // 2. Institution association for On-Campus
    targetInstitution: {
      type: String,
      trim: true,
      default: "Geeta University",
      index: true,
    },
    allowedInstitutions: {
      type: [String],
      default: ["Geeta University"],
    },

    // 3. Required & Preferred Skills
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },

    // 4. Eligibility Requirements
    eligibilityCriteria: {
      degrees: {
        type: [String],
        default: [], // e.g. ["B.Tech", "BCA", "MCA"] - empty means any
      },
      branches: {
        type: [String],
        default: [], // e.g. ["Computer Science", "Information Technology"] - empty means any
      },
      graduationYears: {
        type: [Number],
        default: [], // e.g. [2024, 2025, 2026] - empty means any
      },
      minCgpa: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
      experienceLevel: {
        type: String,
        enum: [
          "Any",
          "Fresher / Entry-Level",
          "Junior (1-3 yrs)",
          "Mid-Level (3-5 yrs)",
          "Senior (5+ yrs)",
        ],
        default: "Fresher / Entry-Level",
      },
      minExperienceYears: {
        type: Number,
        default: 0,
      },
      maxExperienceYears: {
        type: Number,
        default: 2,
      },
      additionalNotes: {
        type: String,
        trim: true,
        default: "",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

jobVisibilitySchema.index({ hiringScope: 1, targetInstitution: 1 });
jobVisibilitySchema.index({ requiredSkills: 1 });

module.exports = mongoose.model("JobVisibility", jobVisibilitySchema);
