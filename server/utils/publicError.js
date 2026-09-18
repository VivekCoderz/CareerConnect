const isProduction = () => process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const publicError = (error) => isProduction() ? undefined : error.message;
const publicErrorMessage = (error, fallback = "Internal server error") =>
  isProduction() ? fallback : error.message || fallback;

module.exports = { publicError, publicErrorMessage };
