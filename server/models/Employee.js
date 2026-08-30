const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
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
      required: [true, "Employee name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Work email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },
    department: {
      type: String,
      default: "Engineering",
    },
    team: {
      type: String,
      default: "Frontend",
    },
    roleInCompany: {
      type: String,
      enum: ["Employee", "Team Lead", "Manager", "HR Admin", "Trainer"],
      default: "Employee",
    },
    skills: {
      type: [String],
      default: [],
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Invited", "On Leave", "Inactive"],
      default: "Active",
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ employerId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);
