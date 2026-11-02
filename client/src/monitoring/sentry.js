// Sentry error monitoring for the React app (I08). Imported first in main.jsx.
// With no VITE_SENTRY_DSN set, Sentry stays off and nothing is sent.

const OBJECT_ID = /\b[a-f0-9]{24}\b/gi;

// Query strings are dropped entirely: besides tokens they carry search text (names, emails).
const scrubUrl = (url) => (typeof url === "string" ? url.split("?")[0] : url);

/** Removes token-like URL values and personal data from an event before it is sent. */
export const scrubEvent = (event) => {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url);
    delete event.request.cookies;
    if (event.request.headers) {
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

export const Sentry = {
  init: (config = {}) => {
    if (dsn && typeof window !== "undefined") {
      window.__SENTRY_CONFIG__ = config;
    }
  },
  captureException: (error, context = {}) => {
    if (!dsn) return;
    if (typeof console !== "undefined") {
      console.warn("[Sentry Exception]", error, context);
    }
  },
  captureMessage: (msg, level = "info") => {
    if (!dsn) return;
    if (typeof console !== "undefined") {
      console.info(`[Sentry ${level}]`, msg);
    }
  },
  withScope: (callback) => {
    const scope = {
      setFingerprint: () => {},
      setTags: () => {},
      setLevel: () => {},
      setExtra: () => {},
    };
    if (typeof callback === "function") {
      callback(scope);
    }
  },
};

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

const reportedApiErrors = new Set();

export const reportApiError = (error) => {
  if (!dsn || error?.code === "ERR_CANCELED") return;
  const status = error?.response?.status;
  if (status && status < 500) return;
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
