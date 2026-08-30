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
    companyName: { type: String, default: "", trim: true },
    title: {
      type: String,
      required: [true, "Internship title is required"],
      trim: true,
      maxlength: 150,
    },
    department: { type: String, default: "General", trim: true },
    workMode: {
      type: String,
      enum: ["On-site", "Hybrid", "Remote"],
      default: "Hybrid",
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
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
      enum: ["CareerConnect", "Adzuna", "Remotive", "Jooble", "Other"],
      default: "CareerConnect",
      index: true,
    },
    isExternal: { type: Boolean, default: false, index: true },
    externalId: { type: String, default: null },
    applyUrl: { type: String, default: "", trim: true },
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