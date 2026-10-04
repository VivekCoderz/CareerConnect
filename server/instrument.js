// Sentry error monitoring (I08). Loaded by server.js before Express so request context is
// recorded. With no SENTRY_DSN set, Sentry stays off and nothing is sent.
//
// Captured: uncaught exceptions, unhandled promise rejections (default integrations) and
// 5xx errors reaching the global error handler in app.js. 4xx responses are not errors.
// Never sent: cookies, Authorization headers, request bodies, IP addresses, or any field
// whose name looks like a password, token, secret or OTP.

const Sentry = require("@sentry/node");

const SENSITIVE_KEY = /pass(word)?|token|secret|otp|authorization|cookie|api[-_]?key|session|signature|credential|dsn/i;
const SENSITIVE_QUERY = /([?&][^=&#]*(?:token|secret|otp|password|code|key|signature)[^=&#]*=)[^&#]*/gi;

const scrubObject = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => scrubObject(item, depth + 1));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[Filtered]" : scrubObject(item, depth + 1);
  }
  return out;
};

const scrubUrl = (url) => (typeof url === "string" ? url.replace(SENSITIVE_QUERY, "$1[Filtered]") : url);

/** Removes credentials and personal data from an event before it leaves the server. */
const scrubEvent = (event) => {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    // Cookie and Authorization headers match SENSITIVE_KEY and are filtered.
    if (event.request.headers) event.request.headers = scrubObject(event.request.headers);
    event.request.url = scrubUrl(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubUrl(`?${event.request.query_string}`).slice(1);
    } else if (event.request.query_string) {
      event.request.query_string = scrubObject(event.request.query_string);
    }
  }
  if (event.user) event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  if (event.extra) event.extra = scrubObject(event.extra);
  if (event.contexts) event.contexts = scrubObject(event.contexts);
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? scrubObject({ ...crumb.data, url: scrubUrl(crumb.data.url) }) : crumb.data,
    }));
  }
  return event;
};

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || undefined,
    sendDefaultPii: false,
    // The global error handler in app.js reports errors itself, because only it knows the
    // final status (a Mongoose CastError becomes a 400, a CORS rejection is not a bug).
    // The Express integration still adds request context to those events.
    integrations: [Sentry.expressIntegration({ shouldHandleError: false })],
    // Performance tracing is off unless a rate is set (the free plan has a small quota).
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
  });
  console.log(`[sentry] error monitoring on (${process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development"})`);
}

module.exports = { Sentry, scrubEvent };
