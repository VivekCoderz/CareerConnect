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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    reason: {
      type: String,
      required: [true, "Reason for using CareerConnect is required"],
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
