/**
 * Input Sanitization & Email Verification Middleware
 *
 * 1. Strips HTML tags and dangerous characters to prevent XSS.
 * 2. Validates email formats and blocks disposable/temporary email providers.
 * 3. Records security violations for abusive temporary email attempts.
 */

const { validateEmail, maskEmail } = require("../services/emailValidationService");
const { recordViolation } = require("./rateLimitMiddleware");

// Strip HTML tags and trim whitespace from a string
const stripHtml = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/<[^>]*>/g, "")        // Remove HTML tags
    .replace(/javascript:/gi, "")    // Remove JS protocol
    .replace(/on\w+\s*=/gi, "")      // Remove inline event handlers
    .trim();
};

// Recursively sanitize all string values in an object
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") {
      obj[key] = stripHtml(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

/**
 * General-purpose body sanitizer.
 * Sanitizes req.body, req.query, and req.params.
 */
const sanitizeInputs = (req, res, next) => {
  try {
    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);
  } catch (err) {
    console.error("[Sanitizer] Error sanitizing input:", err.message);
  }
  next();
};

/**
 * Validates that email is properly formatted after sanitization.
 */
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  return emailRegex.test(email);
};

/**
 * Validates that phone number is a valid Indian mobile number.
 */
const validatePhoneFormat = (phone) => {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

/**
 * Disposable Email Protection Middleware
 *
 * Runs disposable domain detection, syntax checks, and MX record resolution.
 * If a temporary email address or invalid domain is detected, it logs a privacy-masked
 * security event, penalizes the IP address, and aborts with HTTP 400.
 */
const validateEmailMiddleware = async (req, res, next) => {
  const email = req.body?.email || req.body?.emailOrUsername;

  // If endpoint called without email (e.g. username login), let downstream controller handle
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return next();
  }

  try {
    const result = await validateEmail(email);

    if (!result.isValid) {
      const masked = maskEmail(email);

      if (result.isDisposable) {
        console.warn(`🚫 [Security Alert] Blocked signup attempt with disposable email: ${masked} from IP: ${req.ip}`);
        recordViolation(req, "Disposable email signup attempt");

        return res.status(400).json({
          success: false,
          code: "DISPOSABLE_EMAIL_REJECTED",
          field: "email",
          message: "Temporary or disposable email addresses are not permitted. Please use a permanent personal or institutional email address.",
        });
      }

      console.warn(`⚠️ [Security Alert] Blocked signup with invalid email domain: ${masked} (${result.reason})`);
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL_DOMAIN",
        field: "email",
        message: result.reason || "Invalid email address or domain.",
      });
    }

    // Attach normalized email to request body for consistency
    if (req.body.email) {
      req.body.email = result.normalizedEmail;
    }

    next();
  } catch (err) {
    console.error("[validateEmailMiddleware] Unexpected error:", err);
    // Fail safe to not lock out users on unexpected code exception
    next();
  }
};

module.exports = {
  sanitizeInputs,
  stripHtml,
  validateEmailFormat,
  validatePhoneFormat,
  validateEmailMiddleware,
};
