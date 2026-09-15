const Razorpay = require("razorpay");
const crypto = require("crypto");

/**
 * Razorpay Client Singleton
 * Initialized with API Key ID & Secret from environment variables.
 */
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("CRITICAL: Razorpay credentials are missing in environment variables!");
  }

  return new Razorpay({
    key_id: keyId || "rzp_test_TbSS4kb8G70xwq",
    key_secret: keySecret || "1H85VDA2KxKTpE1MMa8Rs26w",
  });
};

const razorpayInstance = getRazorpayInstance();

/**
 * Verify Razorpay HMAC-SHA256 signature securely using constant-time comparison
 * @param {Object} params
 * @param {string} params.orderId - Razorpay Order ID (e.g. order_O12345)
 * @param {string} params.paymentId - Razorpay Payment ID (e.g. pay_P12345)
 * @param {string} params.signature - Razorpay signature sent from client
 * @returns {boolean} true if valid, false otherwise
 */
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET || "1H85VDA2KxKTpE1MMa8Rs26w";

  try {
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(generatedSignature, "utf-8");
    const receivedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
};

module.exports = {
  razorpay: razorpayInstance,
  verifyRazorpaySignature,
};
