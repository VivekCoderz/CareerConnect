import api from "../api/api";

/**
 * Payment Service for Razorpay course transactions
 */

/**
 * Create a Razorpay order on backend (or enroll directly if course is ₹0)
 * @param {string} courseId
 */
export const createCourseOrder = async (courseId) => {
  const res = await api.post("/payment/create-order", { courseId });
  return res.data;
};

/**
 * Verify cryptographic signature on backend upon Razorpay checkout completion
 * @param {Object} data
 * @param {string} data.razorpayOrderId
 * @param {string} data.razorpayPaymentId
 * @param {string} data.razorpaySignature
 * @param {string} data.courseId
 */
export const verifyCoursePayment = async (data) => {
  const res = await api.post("/payment/verify", data);
  return res.data;
};

/**
 * Fetch candidate's orders / transaction history
 */
export const getMyOrders = async () => {
  const res = await api.get("/payment/my-orders");
  return res.data;
};

/**
 * Fetch specific payment receipt
 * @param {string} paymentId
 */
export const getPaymentReceipt = async (paymentId) => {
  const res = await api.get(`/payment/receipt/${paymentId}`);
  return res.data;
};

export default {
  createCourseOrder,
  verifyCoursePayment,
  getMyOrders,
  getPaymentReceipt,
};
