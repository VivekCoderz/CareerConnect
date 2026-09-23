const { consumeWindow } = require("../services/otpService");

const publicReadLimit = (scope, minuteLimit, dayLimit) => async (req, res, next) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const [minuteAllowed, dayAllowed] = await Promise.all([
      consumeWindow(`${scope}:minute`, ip, minuteLimit, 60 * 1000),
      consumeWindow(`${scope}:day`, ip, dayLimit, 24 * 60 * 60 * 1000),
    ]);
    if (!minuteAllowed || !dayAllowed) {
      return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = publicReadLimit;
