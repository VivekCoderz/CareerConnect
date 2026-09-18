const axios = require("axios");

const verifyCaptcha = (expectedAction) => async (req, res, next) => {
  if (process.env.NODE_ENV !== "production" && process.env.RENDER !== "true") return next();

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("reCAPTCHA secret is missing");
    return res.status(503).json({ success: false, message: "Human verification is unavailable." });
  }

  const token = req.body?.captchaToken;
  if (typeof token !== "string" || !token || token.length > 4096) {
    return res.status(403).json({ success: false, message: "Human verification is required." });
  }

  try {
    const { data } = await axios.post("https://www.recaptcha.net/recaptcha/api/siteverify", null, {
      params: { secret, response: token, remoteip: req.ip },
      timeout: 5000,
    });
    const allowedHostnames = (process.env.CLIENT_URL || "")
      .split(",")
      .map((value) => {
        try { return new URL(value.trim()).hostname; } catch (_) { return null; }
      })
      .filter(Boolean);
    if (!data?.success || data.action !== expectedAction ||
        typeof data.score !== "number" || data.score < 0.5 ||
        !allowedHostnames.includes(data.hostname)) {
      return res.status(403).json({ success: false, message: "Human verification failed. Please try again." });
    }
    req.captchaScore = data.score;
    next();
  } catch (error) {
    console.error("reCAPTCHA verification error:", error.message);
    res.status(503).json({ success: false, message: "Human verification is temporarily unavailable." });
  }
};

module.exports = verifyCaptcha;
