const mongoose = require("mongoose");

// Speaking recordings and camera snapshots. Stored as private Cloudinary files when Cloudinary is
// configured, otherwise (local / QA) in this document's `data`. Never publicly reachable: access
// goes through a short-lived signed link (services/files.js).
const campusFileSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusAttempt", required: true, index: true },
    kind: { type: String, enum: ["audio", "snapshot"], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storage: { type: String, enum: ["cloudinary", "mongo"], required: true },
    cloudinaryId: { type: String, default: "" },
    cloudinaryResourceType: { type: String, default: "" },
    data: { type: Buffer, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.CampusFile || mongoose.model("CampusFile", campusFileSchema);
