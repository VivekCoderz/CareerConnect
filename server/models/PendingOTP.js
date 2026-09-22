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
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, default: null, select: false },
    attempts: { type: Number, default: 0 },
    purpose: {
      type: String,
      default: "verification",
    },
  },
  { timestamps: true }
);

// Auto delete after expire
pendingOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingOTP", pendingOTPSchema);
