const mongoose = require("mongoose");

const internshipSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    companyName: { type: String, default: "", trim: true },
    title: {
      type: String,
      required: [true, "Internship title is required"],
      trim: true,
      maxlength: 150,
    },
    department: { type: String, default: "General", trim: true },
    category: { type: String, default: "Web Development", trim: true, index: true },
    subCategory: { type: String, default: "Full Stack Development", trim: true },
    workMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Hybrid",
      index: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    city: { type: String, default: "Bangalore", trim: true, index: true },
    state: { type: String, default: "Karnataka", trim: true },
    country: { type: String, default: "India", trim: true, index: true },
    isPaid: { type: Boolean, default: true, index: true },
    hasJobOffer: { type: Boolean, default: false, index: true },
    isInternational: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    stipend: { type: String, default: "Not disclosed", trim: true },
    stipendAmount: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },
    duration: { type: String, default: "", trim: true },
    openings: { type: Number, default: 1, min: 1 },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    responsibilities: { type: [String], default: [] },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    education: {
      type: String,
      default: "Any Graduate / B.Tech / BCA / MCA",
    },
    eligibility: { type: String, default: "", trim: true },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Published", "Paused", "Closed"],
      default: "Published",
      index: true,
    },
    viewsCount: { type: Number, default: 0 },
    applicantsCount: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["CareerConnect", "LinkedIn", "Internshala", "Remotive", "Arbeitnow", "GU Drives", "Jooble", "Other"],
      default: "CareerConnect",
      index: true,
    },
    isExternal: { type: Boolean, default: false, index: true },
    externalId: { type: String, default: null },
    applyUrl: { type: String, default: "", trim: true },

    // ---------- Dynamic Recruitment Pipeline Stages ----------
    recruitmentStages: [
      {
        name: {
          type: String,
          required: [true, "Stage name is required"],
          trim: true,
        },
        type: {
          type: String,
          enum: [
            "Resume Screening",
            "Online Test",
            "Coding Test",
            "Aptitude Test",
            "Technical Interview",
            "HR Interview",
            "Group Discussion",
            "Final Interview",
            "Custom",
          ],
          default: "Resume Screening",
        },
        order: {
          type: Number,
          default: 0,
        },
        description: {
          type: String,
          default: "",
          trim: true,
        },
        configuration: {
          interviewType: {
            type: String,
            enum: ["Online", "Offline", ""],
            default: "Online",
          },
          durationMinutes: {
            type: Number,
            default: 45,
          },
          instructions: {
            type: String,
            default: "",
            trim: true,
          },
          testLink: {
            type: String,
            default: "",
            trim: true,
          },
          passingCriteria: {
            type: String,
            default: "",
            trim: true,
          },
          deadlineDays: {
            type: Number,
            default: 0,
          },
        },
      },
    ],
  },
  { timestamps: true }
);

internshipSchema.index({ employerId: 1, status: 1 });
internshipSchema.index({ status: 1, isExternal: 1 });
internshipSchema.index({ requiredSkills: 1 });
internshipSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } }
);

module.exports = mongoose.model("Internship", internshipSchema);