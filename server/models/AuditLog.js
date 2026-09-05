const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      default: "System Admin",
    },
    actorEmail: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      enum: ["Jobs", "Candidates", "Interviews", "Offers", "Roles", "Team", "Training", "Settings"],
      default: "Team",
    },
    target: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ employerId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
