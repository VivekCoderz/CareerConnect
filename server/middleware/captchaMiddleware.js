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
    return res.status(400).json({
      success: false,
      message: "CAPTCHA verification is required",
    });
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

    if (!data.success || data.score < 0.5) {
      return res.status(403).json({
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      });
    }

    // Attach score to req for optional logging
    req.captchaScore = data.score;
    return next();
  } catch (err) {
    console.error("[CAPTCHA] Verification error:", err.message);
    // Fail open in case of network issues — log but don't block users
    return next();
  }
};

module.exports = verifyCaptcha;
