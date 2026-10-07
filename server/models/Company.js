const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      trim: true,
      default: "",
    },
    companyType: {
      type: String,
      default: "Private",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      // "deleted" is a soft delete (ADM-12): the company and its data stay, but it is hidden
      // and its users lose the company context.
      enum: ["active", "inactive", "suspended", "pending", "deleted", "ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"],
      default: "active",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    settings: {
      allowedDomains: {
        type: [String],
        default: [],
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      autoShortlist: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ name: "text", description: "text", industry: "text" });

module.exports = mongoose.model("Company", companySchema);
