const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

// ==========================================
// COURSE PAYMENT & ENROLLMENT ROUTES
// ==========================================

// Create a Razorpay order (or instantly enroll if free ₹0)
// POST /api/payment/create-order
router.post("/create-order", protect, paymentController.createOrder);

// Verify cryptographic Razorpay signature and unlock course
// POST /api/payment/verify
router.post("/verify", protect, paymentController.verifyPayment);

// Get student / candidate's orders & transaction receipts
// GET /api/payment/my-orders
router.get("/my-orders", protect, paymentController.getMyOrders);

// Get specific payment receipt by paymentId or orderId
// GET /api/payment/receipt/:paymentId
router.get("/receipt/:paymentId", protect, paymentController.getPaymentReceipt);

module.exports = router;
