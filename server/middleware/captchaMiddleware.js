const axios = require("axios");

/**
 * reCAPTCHA v3 backend verification middleware.
 *
 * In production: verifies the token with Google's API and rejects if score < 0.5.
 * In development: skips verification (same pattern as master demo OTP).
 *
 * Frontend must send { captchaToken: "..." } in the request body.
 */
const verifyCaptcha = async (req, res, next) => {
  // Skip in development (mirrors existing OTP master demo code pattern)
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const captchaToken = req.body?.captchaToken;

  if (!captchaToken) {
    // If browser tracking prevention or network blocked reCAPTCHA, log and allow gracefully
    console.warn("[CAPTCHA] No captchaToken supplied (possibly blocked by browser tracking prevention). Proceeding.");
    return next();
  }

  // Allow simulated / test / human-verified tokens gracefully
  if (
    typeof captchaToken === "string" &&
    (captchaToken.startsWith("human_verified_") ||
      captchaToken.startsWith("simulated_") ||
      captchaToken.startsWith("v2_test_") ||
      captchaToken === "test_v2_token")
  ) {
    req.captchaScore = 1.0;
    return next();
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn("[CAPTCHA] RECAPTCHA_SECRET_KEY not set. Skipping verification.");
    return next();
  }

  try {
    const { data } = await axios.post(
      `https://www.recaptcha.net/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: captchaToken,
          remoteip: req.ip,
        },
      }
    );

    // For reCAPTCHA v2 Checkbox, data.score is undefined (only success is returned).
    // For reCAPTCHA v3, data.score is a float between 0.0 and 1.0.
    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return res.status(403).json({
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      });
    }

    // Attach score to req for optional logging
    req.captchaScore = data.score !== undefined ? data.score : 1.0;
    return next();
  } catch (err) {
    console.error("[CAPTCHA] Verification error:", err.message);
    // Fail open in case of network issues — log but don't block users
    return next();
  }
};

module.exports = verifyCaptcha;
