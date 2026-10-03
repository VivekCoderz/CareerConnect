/**
 * Returns the URL only when it is an http(s) link, so values like "javascript:..." saved
 * by an employer can never run as a link. Use for every href built from user data.
 * @param {string} url
 * @returns {string|undefined}
 */
export const safeHttpUrl = (url) => (typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined);
