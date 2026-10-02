const mongoose = require("mongoose");

// One document per day (IST) and kind, counting emails sent through Brevo.
// Used by services/emailBudget.js so signup OTPs always have quota left.
const emailUsageSchema = new mongoose.Schema({
  day: { type: String, required: true }, // "YYYY-MM-DD" in IST
  kind: { type: String, enum: ["otp", "notification"], required: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });

emailUsageSchema.index({ day: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model("EmailUsage", emailUsageSchema);
