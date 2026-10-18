const Institution = require("../models/Institution");

const isProduction = () => process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const hostOf = (value) => {
  try {
    return new URL(String(value)).hostname.toLowerCase();
  } catch {
    return "";
  }
};

/**
 * Finds the institution for this request (architecture section 3). In production only the
 * browser's Origin decides, so a client cannot pick another university. Outside production a
 * slug in ?campus= or the X-Campus-Tenant header is accepted for local development and tests.
 */
const resolveTenant = async (req, res, next) => {
  try {
    const slug = isProduction() ? "" : String(req.query.campus || req.get("x-campus-tenant") || "").trim().toLowerCase();
    const host = hostOf(req.get("origin") || req.get("referer") || "");
    let institution = null;
    if (slug) institution = await Institution.findOne({ slug, status: "active" });
    else if (host) institution = await Institution.findOne({ domains: host, status: "active" });
    if (!institution) {
      return res.status(404).json({ success: false, code: "CAMPUS_NOT_FOUND", message: "This portal was not found." });
    }
    req.institution = institution;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { resolveTenant, isProduction };
