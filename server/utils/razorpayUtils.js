const crypto = require("crypto");
const axios = require("axios");

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

function paymentsNotConfigured(res) {
  return res.status(503).json({
    success: false,
    message: "Payments are not configured",
  });
}

function isValidRazorpaySignature(orderId, paymentId, signature, secret) {
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  );
  const received = Buffer.from(String(signature));
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function verifyWebhookSignature(rawBody, signature, secret) {
  const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(String(signature));
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function callRazorpayCreateOrder(config, amountInPaise, currency = "INR", receipt, notes = {}) {
  try {
    const authHeader =
      "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");

    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: amountInPaise,
        currency,
        receipt,
        notes,
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        timeout: 9000,
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.warn("Razorpay API Call Warning:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = {
  getRazorpayConfig,
  paymentsNotConfigured,
  isValidRazorpaySignature,
  verifyWebhookSignature,
  callRazorpayCreateOrder,
};
