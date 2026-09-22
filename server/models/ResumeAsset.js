const mongoose = require("mongoose");

const resumeAssetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  publicId: { type: String, required: true, unique: true },
  url: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model("ResumeAsset", resumeAssetSchema);
