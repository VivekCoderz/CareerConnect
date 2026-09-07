const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamRole",
      required: true,
    },
    department: {
      type: String,
      default: "Engineering",
    },
    accessScope: {
      type: String,
      enum: ["All Jobs", "Department Jobs", "Assigned Jobs", "Own Jobs"],
      default: "All Jobs",
    },
    status: {
      type: String,
      enum: ["Active", "Suspended", "Pending", "Expired"],
      default: "Active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

teamMemberSchema.index({ employerId: 1, email: 1 });

module.exports = mongoose.model("TeamMember", teamMemberSchema);
