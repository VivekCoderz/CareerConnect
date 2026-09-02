const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
    },
    head: {
      type: String,
      default: "",
    },
    teams: {
      type: [String],
      default: ["Core Team", "Operations"],
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ employerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Department", departmentSchema);
