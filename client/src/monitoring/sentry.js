// Sentry error monitoring for the React app (I08). Imported first in main.jsx.
// With no VITE_SENTRY_DSN set, Sentry stays off and nothing is sent.
//
// Captured: React render errors (ErrorBoundary), uncaught exceptions and unhandled promise
// rejections (default integrations), and API calls that fail with 5xx or no response (api.jsx).
// Never sent: IP addresses, cookies, console output, or token-like values in URLs.
import * as Sentry from "@sentry/react";

const OBJECT_ID = /\b[a-f0-9]{24}\b/gi;

// Query strings are dropped entirely: besides tokens they carry search text (names, emails).
const scrubUrl = (url) => (typeof url === "string" ? url.split("?")[0] : url);

/** Removes token-like URL values and personal data from an event before it is sent. */
export const scrubEvent = (event) => {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url);
    delete event.request.cookies;
    if (event.request.headers) {
      // Keep only harmless headers (the browser SDK sends User-Agent and Referer).
      const { "User-Agent": userAgent } = event.request.headers;
      event.request.headers = userAgent ? { "User-Agent": userAgent } : {};
    }
  }
  if (event.user) event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  return event;
};

/** Drops console breadcrumbs (they can echo profile data) and filters URLs in the rest. */
export const scrubBreadcrumb = (crumb) => {
  if (crumb.category === "console") return null;
  if (crumb.data) {
    for (const field of ["url", "from", "to"]) {
      if (crumb.data[field]) crumb.data[field] = scrubUrl(crumb.data[field]);
    }
  }
  return crumb;
};

const dsn = import.meta.env.VITE_SENTRY_DSN;
export const sentryEnabled = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    // Performance tracing and session replay are off: they record more than error monitoring needs.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    ignoreErrors: [
      // Browser noise, not application bugs
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
  });
}

/**
 * Reports a failed API call: server errors (5xx) and requests that got no response.
 * One Sentry issue per method + endpoint (ids collapsed), not one per user.
 */
// Each failing endpoint is reported once per page load: during an outage or a Render cold
// start every user would otherwise send an event per call and use up the free monthly quota.
const reportedApiErrors = new Set();

export const reportApiError = (error) => {
  if (!dsn || error?.code === "ERR_CANCELED") return;
  const status = error?.response?.status;
  if (status && status < 500) return;
  // The user's own connection dropped: not our bug.
  if (!status && typeof navigator !== "undefined" && navigator.onLine === false) return;
  const method = (error?.config?.method || "get").toUpperCase();
  const endpoint = String(error?.config?.url || "unknown").split("?")[0].replace(OBJECT_ID, ":id");
  const kind = status ? `HTTP ${status}` : "no response";
  const key = `${method} ${endpoint} ${kind}`;
  if (reportedApiErrors.has(key)) return;
  reportedApiErrors.add(key);
  Sentry.withScope((scope) => {
    scope.setFingerprint(["api-error", method, endpoint, kind]);
    scope.setTags({ api_endpoint: endpoint, api_status: status || "none" });
    scope.setLevel(status ? "error" : "warning");
    Sentry.captureException(new Error(`API ${method} ${endpoint} failed: ${kind}`));
  });
};

export { Sentry };
