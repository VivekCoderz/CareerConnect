/**
 * Reads the ?redirect= path a page sent the user to /login with, so they can be sent
 * back after signing in (e.g. a shared job link → Apply → login → back to the job).
 * Only same-site paths are allowed, which blocks open redirects like "//evil.com".
 * @param {URLSearchParams|string} search - searchParams or location.search
 * @returns {string|null}
 */
export const getSafeRedirect = (search) => {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const target = params?.get("redirect");
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return null;
  }
  // Don't bounce back into the auth pages themselves.
  if (/^\/(login|register|set-password|forgot-password)(\/|$|\?)/.test(target)) return null;
  return target;
};
