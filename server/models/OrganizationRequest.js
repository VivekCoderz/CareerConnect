const mongoose = require("mongoose");

const organizationRequestSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: 150,
      index: true,
    },
    organizationType: {
      type: String,
      enum: ["Private", "Public", "Startup", "Enterprise", "Government", "Non-Profit", "Educational Institution", "Other"],
      default: "Private",
    },
    officialEmail: {
      type: String,
      required: [true, "Official email is required"],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid official email address"],
    },
    website: {
      type: String,
      required: [true, "Official website is required"],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
      maxlength: 100,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
      maxlength: 100,
    },
    industry: {
      type: String,
      trim: true,
      default: "Information Technology",
    },
    companySize: {
      type: String,
      trim: true,
      default: "11-50",
    },
    verificationDocument: {
      type: String,
      trim: true,
      default: "",
    },
    requestingEmployeeName: {
      type: String,
      trim: true,
      default: "",
    },
    employeeDesignation: {
      type: String,
      trim: true,
      default: "",
    },
    officialEmployeeEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    adminInvitationToken: {
      type: String,
      default: null,
    },
    adminInvitationExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

organizationRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("OrganizationRequest", organizationRequestSchema);
