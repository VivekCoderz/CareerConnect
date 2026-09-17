const mongoose = require("mongoose");

const otpRateLimitSchema = new mongoose.Schema({
  _id: String,
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

otpRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpRateLimit", otpRateLimitSchema);
