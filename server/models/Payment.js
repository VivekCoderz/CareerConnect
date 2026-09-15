const mongoose = require("mongoose");

// ==========================================
// PAYMENT / ORDER SCHEMA (RAZORPAY)
// ==========================================

const paymentSchema = new mongoose.Schema(
  {
    // Candidate who made the payment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Candidate type at purchase time
    userType: {
      type: String,
      enum: ["student", "fresher", "professional", "employer", "user"],
      default: "student",
    },

    // Course purchased
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },

    // Amount in INR (Rupees)
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    // Razorpay Order ID (e.g. order_O1234567890)
    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay Order ID is required"],
      unique: true,
      index: true,
    },

    // Razorpay Payment ID (e.g. pay_P1234567890)
    razorpayPaymentId: {
      type: String,
      default: "",
      sparse: true,
      index: true,
    },

    // Cryptographic signature received from Razorpay Checkout
    razorpaySignature: {
      type: String,
      default: "",
    },

    // Payment lifecycle status
    status: {
      type: String,
      enum: ["created", "processing", "completed", "failed", "refunded"],
      default: "created",
      index: true,
    },

    // Internal receipt reference (e.g. rcpt_...)
    receipt: {
      type: String,
      default: "",
    },

    paymentMethod: {
      type: String,
      default: "", // card, netbanking, upi, wallet
    },

    failureReason: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ user: 1, course: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
