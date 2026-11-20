const mongoose = require("mongoose");

// One-time codes for account settings (changing email), one per user and purpose.
// Signup and forgot-password codes live in PendingOTP.
const otpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: {
      type: String,
      enum: ["verify_old_email", "verify_new_email"],
      required: true,
    },
    // The address the code was sent to.
    target: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ user: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
