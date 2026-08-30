const mongoose = require("mongoose");

const pendingOTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    purpose: {
      type: String,
      default: "verification",
    },
    tempData: {
      fullName: String,
      phone: String,
      password: String,
    },
  },
  { timestamps: true }
);

// Auto delete after expire
pendingOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingOTP", pendingOTPSchema);
