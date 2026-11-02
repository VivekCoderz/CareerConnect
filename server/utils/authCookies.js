// Cookie options shared by user and admin auth. The client (Vercel) and API (Render)
// are on different sites, so production cookies must be SameSite=None + Secure to be sent.

const isProductionEnv = () => process.env.NODE_ENV === "production" || process.env.RENDER === "true";

/**
 * Options for clearing an auth cookie. Browsers only delete a cookie when path,
 * sameSite and secure match the ones it was set with.
 */
const authCookieBaseOptions = () => {
  const production = isProductionEnv();
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
  };
};

/**
 * Options for setting an auth cookie that expires after maxAge milliseconds.
 */
const authCookieOptions = (maxAge) => ({ ...authCookieBaseOptions(), maxAge });

module.exports = { isProductionEnv, authCookieBaseOptions, authCookieOptions };
