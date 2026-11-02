// Shared origin rules for HTTP CORS (app.js) and Socket.IO (services/socketService.js).

// CLIENT_URL may hold several comma-separated origins; trailing slashes are ignored.
const parseClientUrls = (value = process.env.CLIENT_URL) =>
  String(value || "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const isLocalDevOrigin = (origin) =>
  /^http:\/\/localhost:[0-9]+$/.test(origin) || /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin);

module.exports = { parseClientUrls, isLocalDevOrigin };
