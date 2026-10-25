const mongoose = require("mongoose");

// CGPA bands are the same for every batch for now (utils/bands.js); per-batch cut-offs are P2.
const batchSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 }, // e.g. MBA 2025-27
    status: { type: String, enum: ["active", "archived"], default: "active" },
    // Current semester, set by staff for the whole batch and shown on each student's profile.
    semester: { type: Number, min: 1, max: 12, default: null },
  },
  { timestamps: true }
);

batchSchema.index({ institutionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Batch || mongoose.model("Batch", batchSchema);
