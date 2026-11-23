// Cookie options shared by user and admin auth. The client and API share a site
// (www.e2job.com with api.e2job.com, staging.e2job.com with api-staging.e2job.com),
// so production cookies are SameSite=Lax (H08). AUTH_COOKIE_SAMESITE=none switches
// back to cross-site cookies without a code change, if a client on another site
// ever has to log in again.

const isProductionEnv = () => process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const SAME_SITE_VALUES = ["lax", "strict", "none"];

const authCookieSameSite = () => {
  const configured = String(process.env.AUTH_COOKIE_SAMESITE || "").trim().toLowerCase();
  return SAME_SITE_VALUES.includes(configured) ? configured : "lax";
};

/**
 * Options for clearing an auth cookie. Browsers only delete a cookie when path,
 * sameSite and secure match the ones it was set with.
 */
const authCookieBaseOptions = () => {
  const production = isProductionEnv();
  const sameSite = authCookieSameSite();
  return {
    httpOnly: true,
    // Browsers drop SameSite=None cookies that aren't Secure.
    secure: production || sameSite === "none",
    sameSite,
    path: "/",
  };
};

/**
 * Options for setting an auth cookie that expires after maxAge milliseconds.
 */
const authCookieOptions = (maxAge) => ({ ...authCookieBaseOptions(), maxAge });

module.exports = { isProductionEnv, authCookieBaseOptions, authCookieOptions };
