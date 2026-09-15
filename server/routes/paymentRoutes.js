const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createCourseOrder,
  verifyCoursePayment,
  getMyOrders,
  getPaymentReceipt,
} = require("../controllers/paymentController");

const router = express.Router();

// All payment routes require valid authentication
router.use(protect);

// Create order for course purchase
router.post("/create-order", createCourseOrder);

// Verify payment signature and complete enrollment
router.post("/verify", verifyCoursePayment);

// Fetch candidate's orders / transaction history
router.get("/my-orders", getMyOrders);

// Fetch specific receipt
router.get("/receipt/:paymentId", getPaymentReceipt);

module.exports = router;
