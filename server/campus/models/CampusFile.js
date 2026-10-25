const mongoose = require("mongoose");

// Speaking recordings, camera snapshots, profile photos and resumes. Stored as private Cloudinary files when Cloudinary is
// configured, otherwise (local / QA) in this document's `data`. Never publicly reachable: access
// goes through a short-lived signed link (services/files.js).
const campusFileSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    // Test files belong to an attempt; profile files (photo, resume) to a member.
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusAttempt", default: null, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusMember", default: null, index: true },
    kind: { type: String, enum: ["audio", "snapshot", "photo", "resume"], required: true },
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
