// Which deployment this process is: production (default) or staging (APP_ENV=staging).
// Staging runs with NODE_ENV=production too, so it behaves like production; APP_ENV is what
// keeps it on its own database and stops it from emailing real people. See docs/staging.md.

const STAGING_DB_MARKER = "staging";
const STAGING_EMAIL_DOMAIN = "staging.invalid";

const isStaging = () => String(process.env.APP_ENV || "").trim().toLowerCase() === "staging";

/** Database name from a MongoDB connection string ("" when the URI has none). */
const databaseName = (uri) => {
  const match = String(uri || "").match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

/**
 * Throws when the database does not match the deployment: staging must use a database whose
 * name contains "staging", and production must never use one.
 */
const assertDatabaseMatchesEnvironment = (uri) => {
  const name = databaseName(uri).toLowerCase();
  const stagingDb = name.includes(STAGING_DB_MARKER);
  if (isStaging() && !stagingDb) {
    throw new Error(`APP_ENV=staging needs a database whose name contains "${STAGING_DB_MARKER}" in MONGODB_URI (got "${name || "none"}"). Refusing to start.`);
  }
  if (!isStaging() && process.env.NODE_ENV === "production" && stagingDb) {
    throw new Error(`Production is pointed at the staging database "${name}". Set APP_ENV=staging or fix MONGODB_URI. Refusing to start.`);
  }
};

/**
 * Staging only emails the addresses in STAGING_EMAIL_ALLOWLIST (comma-separated addresses or
 * @domains). Everything else, including every scrubbed @staging.invalid address, is dropped.
 */
const isEmailAllowed = (email) => {
  if (!isStaging()) return true;
  const address = String(email || "").trim().toLowerCase();
  const allowed = String(process.env.STAGING_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.some((entry) => (entry.startsWith("@") ? address.endsWith(entry) : address === entry));
};

module.exports = {
  STAGING_DB_MARKER,
  STAGING_EMAIL_DOMAIN,
  isStaging,
  databaseName,
  assertDatabaseMatchesEnvironment,
  isEmailAllowed,
};
