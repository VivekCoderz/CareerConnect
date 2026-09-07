const mongoose = require("mongoose");

const teamRoleSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["system", "custom"],
      default: "custom",
    },
    baseTemplate: {
      type: String,
      default: "Custom",
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

teamRoleSchema.index({ employerId: 1, name: 1 });

module.exports = mongoose.model("TeamRole", teamRoleSchema);
