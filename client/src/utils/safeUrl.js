/**
 * Returns the URL only when it is an http(s) link, so values like "javascript:..." saved
 * by an employer can never run as a link. Use for every href built from user data.
 * @param {string} url
 * @returns {string|undefined}
 */
export const safeHttpUrl = (url) => (typeof url === "string" && /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined);

const DOMAIN_LIKE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

/**
 * For profile links (GitHub, LinkedIn, live demo): "github.com/x" -> "https://github.com/x".
 * Returns undefined for anything that isn't a web address (e.g. the word "GitHub"), so the
 * link isn't clickable instead of opening our own 404 page.
 * @param {string} url
 * @returns {string|undefined}
 */
export const externalHref = (url) => {
  const text = typeof url === "string" ? url.trim() : "";
  if (!text || /\s/.test(text) || !DOMAIN_LIKE.test(text)) return undefined;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};
