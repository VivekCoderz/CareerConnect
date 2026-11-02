// Page-view analytics with Umami Cloud (I08): free, cookieless, no personal data.
// The tracker follows React Router navigation by itself (it watches history.pushState), so
// every route change is a page view. With no VITE_UMAMI_WEBSITE_ID set, nothing loads.
//
// Privacy: query strings and hashes are stripped before sending (links such as
// /set-password?token=... never reach Umami), and browsers with Do Not Track are skipped.

const DEFAULT_SCRIPT_URL = "https://cloud.umami.is/script.js";

export const initAnalytics = () => {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!websiteId || typeof document === "undefined") return false;
  if (document.querySelector("script[data-website-id]")) return true;

  const script = document.createElement("script");
  script.defer = true;
  script.src = import.meta.env.VITE_UMAMI_SCRIPT_URL || DEFAULT_SCRIPT_URL;
  script.dataset.websiteId = websiteId;
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";
  script.dataset.doNotTrack = "true";
  // Optional: only count visits on these hostnames (e.g. the production domain, not previews).
  if (import.meta.env.VITE_UMAMI_DOMAINS) script.dataset.domains = import.meta.env.VITE_UMAMI_DOMAINS;
  // Optional: a different collector (self-hosted Umami).
  if (import.meta.env.VITE_UMAMI_HOST_URL) script.dataset.hostUrl = import.meta.env.VITE_UMAMI_HOST_URL;
  document.head.appendChild(script);
  return true;
};
