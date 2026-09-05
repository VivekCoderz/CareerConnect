// models/Job.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null, // null allowed for external API jobs
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ---------- Basic ----------
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Web Development",
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: "Full Stack Development",
    },
    department: {
      type: String,
      trim: true,
      default: "General",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Trainee"],
      default: "Full-time",
      index: true,
    },
    workMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Hybrid",
      index: true,
    },
    location: {
      type: String,
      required: [true, "Job location is required"],
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: "Bangalore",
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: "Karnataka",
    },
    country: {
      type: String,
      trim: true,
      default: "India",
      index: true,
    },
    isInternational: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPaid: {
      type: Boolean,
      default: true,
      index: true,
    },
    hasJobOffer: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ---------- Compensation ----------
    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      isNegotiable: { type: Boolean, default: false },
    },
    // Internship-specific
    stipend: {
      type: String,
      default: "",
      trim: true, // e.g. "₹15,000/month" | "Unpaid"
    },
    duration: {
      type: String,
      default: "",
      trim: true, // e.g. "3 months"
    },

    // ---------- Experience & Education ----------
    experience: {
      minYears: { type: Number, default: 0 },
      maxYears: { type: Number, default: 2 },
      level: {
        type: String,
        enum: [
          "Fresher / Entry-Level",
          "Junior (1-3 yrs)",
          "Mid-Level (3-5 yrs)",
          "Senior (5+ yrs)",
        ],
        default: "Fresher / Entry-Level",
      },
    },
    education: {
      type: String,
      default: "Any Graduate / B.Tech / BCA / MCA",
    },
    eligibility: {
      type: String,
      default: "",
      trim: true,
    },

    // ---------- Description ----------
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    bonusSkills: {
      type: [String],
      default: [],
    },

    // ---------- Meta ----------
    openings: {
      type: Number,
      default: 1,
      min: 1,
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Published", "Paused", "Closed"],
      default: "Published",
      index: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    applicantsCount: {
      type: Number,
      default: 0,
    },

    // ---------- External API source ----------
    source: {
      type: String,
      enum: ["CareerConnect", "Adzuna", "Remotive", "Jooble", "Other"],
      default: "CareerConnect",
      index: true,
    },
    isExternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    externalId: {
      type: String,
      default: null,
    },
    applyUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ---------- Indexes (no duplicates) ----------
jobSchema.index({ employerId: 1, status: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ city: 1, status: 1 });
jobSchema.index({ workMode: 1, status: 1 });
jobSchema.index({ employmentType: 1, status: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ isExternal: 1, employmentType: 1, status: 1 });
jobSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { isExternal: true } }
);

// Optional: readable salary / stipend for UI
jobSchema.virtual("compensationLabel").get(function () {
  if (this.employmentType === "Internship" || this.employmentType === "Trainee") {
    if (this.stipend) return this.stipend;
    if (this.salaryRange?.min) {
      return `₹${this.salaryRange.min.toLocaleString("en-IN")}/month`;
    }
    return "Stipend not disclosed";
  }

  const { min, max, isNegotiable } = this.salaryRange || {};
  if (min && max) {
    const base = `₹${(min / 100000).toFixed(1)}–${(max / 100000).toFixed(1)} LPA`;
    return isNegotiable ? `${base} (Negotiable)` : base;
  }
  if (min) return `₹${(min / 100000).toFixed(1)}+ LPA`;
  return "Not disclosed";
});

jobSchema.set("toJSON", { virtuals: true });
jobSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Job", jobSchema);