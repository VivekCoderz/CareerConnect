const mongoose = require("mongoose");

// A live training class on Google Meet (PRD R13). band null = whole batch.
const campusSessionSchema = new mongoose.Schema(
  {
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true, index: true },
    band: { type: Number, enum: [1, 2, 3, null], default: null },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    trainerName: { type: String, trim: true, maxlength: 120, default: "" },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    meetUrl: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled" },
  },
  { timestamps: true }
);

const campusAttendanceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusSession", required: true, index: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "CampusMember", required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
campusAttendanceSchema.index({ sessionId: 1, memberId: 1 }, { unique: true });

const CampusSession = mongoose.models.CampusSession || mongoose.model("CampusSession", campusSessionSchema);
const CampusAttendance =
  mongoose.models.CampusAttendance || mongoose.model("CampusAttendance", campusAttendanceSchema);

module.exports = { CampusSession, CampusAttendance };
