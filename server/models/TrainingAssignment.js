const mongoose = require("mongoose");

const trainingAssignmentSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployerProfile",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    assignedToType: {
      type: String,
      enum: ["Employee", "Department", "Team"],
      default: "Employee",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    departmentName: {
      type: String,
      default: "",
    },
    teamName: {
      type: String,
      default: "",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: [true, "Completion deadline is required"],
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["Assigned", "In Progress", "Completed", "Overdue"],
      default: "Assigned",
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    certificateEarned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TrainingAssignment", trainingAssignmentSchema);
