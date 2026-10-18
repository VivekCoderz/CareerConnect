const mongoose = require("mongoose");
const { bandFor } = require("../utils/bands");

// A student or university manager of one institution. Points to a normal E2Job User, so the
// student is an E2Job user too; campus-only fields live here.
const verificationSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["pending", "verified"], default: "pending" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: null },
  },
  { _id: false }
);

const campusMemberSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["student", "manager"], default: "student", index: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    rollNo: { type: String, trim: true, maxlength: 40, default: "" },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    cgpa: { type: Number, min: 0, max: 10, default: null },
    // Set from cgpa in the pre-validate hook below; never accepted from a client.
    band: { type: Number, default: null, index: true },
    verification: { type: verificationSchema, default: () => ({}) },
    consentAt: { type: Date, default: null },
    lastSignInAt: { type: Date, default: null },
    importedAt: { type: Date, default: null },
    status: { type: String, enum: ["active", "removed"], default: "active", index: true },
  },
  { timestamps: true }
);

campusMemberSchema.index({ institutionId: 1, email: 1 }, { unique: true });
campusMemberSchema.index(
  { institutionId: 1, rollNo: 1 },
  { unique: true, partialFilterExpression: { rollNo: { $type: "string", $gt: "" } } }
);

campusMemberSchema.pre("validate", function setBand() {
  this.band = this.role === "student" ? bandFor(this.cgpa) : null;
});

module.exports = mongoose.models.CampusMember || mongoose.model("CampusMember", campusMemberSchema);
