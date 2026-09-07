/**
 * Input Sanitization Middleware
 *
 * Strips HTML tags and dangerous characters from string fields
 * to prevent XSS and injection attacks.
 *
 * Usage:
 *   router.post("/register", sanitizeAuthInputs, authControllers.registerUser);
 */

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
 * Should run after sanitizeInputs.
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

module.exports = {
  sanitizeInputs,
  stripHtml,
  validateEmailFormat,
  validatePhoneFormat,
};
