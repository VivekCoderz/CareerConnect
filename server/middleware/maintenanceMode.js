const { getPlatformSettings } = require("../services/platformSettings");

const READ_METHODS = ["GET", "HEAD", "OPTIONS"];

// Writes that stay available during maintenance: the admin API (which has its own
// admin-only auth), signing in/out, and confirming a payment the user already made.
const EXEMPT_PATHS = [
  /^\/api\/admin(\/|$)/,
  /^\/api\/auth\/(login|logout)$/,
  /^\/api\/payment\/verify$/,
];

/**
 * When the maintenanceMode platform setting is on, rejects non-admin write
 * requests with 503. Reads are unaffected. Settings reads are cached.
 */
const maintenanceMode = async (req, res, next) => {
  if (READ_METHODS.includes(req.method)) return next();

  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  if (EXEMPT_PATHS.some((pattern) => pattern.test(path))) return next();

  try {
    const { maintenanceMode: enabled } = await getPlatformSettings();
    if (!enabled) return next();
  } catch {
    return next();
  }

  res.set("Retry-After", "600");
  return res.status(503).json({
    success: false,
    code: "MAINTENANCE_MODE",
    message: "CareerConnect is undergoing maintenance. Please try again shortly.",
  });
};

module.exports = maintenanceMode;
