const mongoose = require("mongoose");

// Emails sent per category per IST day. Stored in the database so the daily cap holds
// across restarts and multiple server instances.
const emailDailyCountSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // YYYY-MM-DD in Asia/Kolkata
    category: { type: String, required: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

emailDailyCountSchema.index({ day: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("EmailDailyCount", emailDailyCountSchema);
