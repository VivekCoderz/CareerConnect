const mongoose = require("mongoose");

const platformSettingSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: "CareerConnect",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@careerconnect.com",
      trim: true,
      lowercase: true,
    },
    allowStudentRegistration: {
      type: Boolean,
      default: true,
    },
    allowEmployerRegistration: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    autoApproveJobs: {
      type: Boolean,
      default: false,
    },
    autoApproveEmployers: {
      type: Boolean,
      default: false,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    sessionTimeoutHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PlatformSetting", platformSettingSchema);
