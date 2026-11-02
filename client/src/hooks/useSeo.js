import { useEffect } from "react";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE, SITE_NAME, SITE_URL } from "../config/site";

const MAX_DESCRIPTION = 160;

/** Collapses whitespace and trims to a search-snippet length on a word boundary. */
export const toDescription = (text, max = MAX_DESCRIPTION) => {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length)}…`;
};

// Updates the tag index.html already has (or adds one) and returns a function that
// puts the previous value back, so a page without SEO data never shows stale tags.
const setTag = (selector, create, attr, value) => {
  let el = document.head.querySelector(selector);
  const created = !el;
  if (created) {
    el = create();
    document.head.appendChild(el);
  }
  const previous = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => {
    if (created) el.remove();
    else if (previous === null) el.removeAttribute(attr);
    else el.setAttribute(attr, previous);
  };
};

const meta = (key, keyAttr, value) =>
  setTag(`meta[${keyAttr}="${key}"]`, () => {
    const el = document.createElement("meta");
    el.setAttribute(keyAttr, key);
    return el;
  }, "content", value);

/**
 * Sets the page title, description, canonical URL and Open Graph / Twitter tags (G02).
 * Google renders JavaScript, so it sees these per-page values; WhatsApp and LinkedIn
 * previews use the defaults in index.html.
 * @param {object} seo
 * @param {string} [seo.title] - page title without the site name; omit for the default
 * @param {string} [seo.description] - trimmed to 160 characters
 * @param {string} [seo.path] - path for the canonical URL, e.g. "/jobs/123"
 * @param {string} [seo.image] - absolute image URL for share previews
 * @param {string} [seo.type] - og:type, "website" or "article"
 * @param {boolean} [seo.noindex] - keep the page out of search results
 * @param {boolean} [seo.enabled] - false to leave the tags alone (e.g. an embedded view)
 */
export default function useSeo({ title, description, path, image, type = "website", noindex = false, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const desc = toDescription(description || DEFAULT_DESCRIPTION);
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = image || OG_IMAGE;

    const previousTitle = document.title;
    document.title = fullTitle;
    const restore = [
      meta("description", "name", desc),
      meta("robots", "name", noindex ? "noindex, nofollow" : "index, follow"),
      meta("og:title", "property", fullTitle),
      meta("og:description", "property", desc),
      meta("og:url", "property", url),
      meta("og:type", "property", type),
      meta("og:image", "property", img),
      meta("twitter:title", "name", fullTitle),
      meta("twitter:description", "name", desc),
      meta("twitter:image", "name", img),
      setTag('link[rel="canonical"]', () => {
        const el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        return el;
      }, "href", url),
    ];
    return () => {
      document.title = previousTitle;
      restore.reverse().forEach((undo) => undo());
    };
  }, [title, description, path, image, type, noindex, enabled]);
}
