const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      default: null,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
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
      enum: ["Jobs", "Opportunities", "Internships", "Candidates", "Interviews", "Offers", "Roles", "Team", "Training", "Settings", "Reports"],
      default: "Opportunities",
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
