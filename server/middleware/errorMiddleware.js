// Final request handlers. Every error response has one shape:
//   { success: false, message, field?, fields? }
// Controllers pass unexpected failures to next(error) instead of answering themselves,
// so server faults are logged, reported to Sentry, and never leak err.message.
let Sentry;
try {
  Sentry = require("@sentry/node");
} catch {
  Sentry = { captureException: () => {} };
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// 404 handler — must come after all routes so only unmatched requests reach it
const notFound = (req, res) => res.status(404).json({ success: false, message: "Not found" });

const duplicateKeyMessage = (field) => {
  if (field === "phone") return "This mobile number is already registered with another account";
  if (field === "email") return "This email is already registered";
  if (field === "username") return "This username is already taken";
  return "This account is already registered";
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err.code === 11000) {
    const keys = err.keyPattern || err.keyValue || {};
    const field = ["phone", "email", "username"].find((key) => keys[key] !== undefined);
    return res.status(409).json({ success: false, field, message: duplicateKeyMessage(field) });
  }
  // Bad input (wrong type, unknown enum value, malformed ID) is the client's
  // mistake: answer 400 and name the field instead of leaking a Mongoose error.
  if (err.name === "ValidationError") {
    const fields = Object.keys(err.errors || {});
    return res.status(400).json({
      success: false,
      fields,
      message: fields.length ? `Invalid value for: ${fields.join(", ")}` : "Invalid input",
    });
  }
  if (err.name === "CastError") {
    const field = err.path === "_id" ? "id" : err.path;
    return res.status(400).json({ success: false, fields: [field], message: `Invalid value for: ${field}` });
  }
  console.error("Server Global Error:", err);
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.statusCode || err.status || 500;
  // Server faults go to Sentry (a no-op without SENTRY_DSN). Rejected CORS origins are not bugs.
  if (status >= 500 && !String(err.message).startsWith("Not allowed by CORS")) {
    Sentry.captureException(err, { tags: { status_code: status, route: req.route?.path || req.baseUrl || req.path } });
  }
  // 4xx messages were written for the user; 5xx messages are internal unless marked safe.
  const exposed = err.expose ?? status < 500;
  return res.status(status).json({
    success: false,
    message: exposed && err.message ? err.message : GENERIC_MESSAGE,
  });
};

module.exports = { notFound, errorHandler, GENERIC_MESSAGE };
