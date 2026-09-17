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
      default: "Information Technology",
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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
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
