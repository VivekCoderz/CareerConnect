const cookieOriginMiddleware = (allowedOrigins, enabled) => (req, res, next) => {
  if (!enabled || ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      (!req.cookies?.token && !req.cookies?.sid)) return next();
  let origin = req.get("Origin");
  if (!origin && req.get("Referer")) {
    try { origin = new URL(req.get("Referer")).origin; } catch (_) { /* reject below */ }
  }
  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Untrusted request origin" });
  }
  next();
};

module.exports = cookieOriginMiddleware;
