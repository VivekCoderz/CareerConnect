const mongoose = require("mongoose");

// ==========================================
// COURSE ORDER SCHEMA
// ==========================================

const courseOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "completed", "failed"],
      default: "created",
      index: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: "",
    },
    receipt: {
      type: String,
      default: "",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

courseOrderSchema.index({ user: 1, course: 1 });

const CourseOrder = mongoose.model("CourseOrder", courseOrderSchema);

module.exports = CourseOrder;
