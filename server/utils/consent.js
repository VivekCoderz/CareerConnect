// Terms and Privacy Policy consent collected at signup (G05, DPDP Act). Signup forms send
// { acceptedTerms: true, termsVersion }; the server must not rely on the UI checkbox alone.

const CONSENT_REQUIRED = {
  success: false,
  code: "CONSENT_REQUIRED",
  field: "acceptedTerms",
  message: "Please agree to the Terms and Privacy Policy to create your account.",
};

/**
 * Reads signup consent from a request body.
 * @param {object} body - req.body
 * @returns {{ termsVersion: string, acceptedAt: Date } | null} null when consent is missing
 */
const readConsent = (body = {}) => {
  if (body.acceptedTerms !== true) return null;
  const termsVersion = typeof body.termsVersion === "string" ? body.termsVersion.trim() : "";
  if (!termsVersion || termsVersion.length > 32) return null;
  return { termsVersion, acceptedAt: new Date() };
};

module.exports = { CONSENT_REQUIRED, readConsent };
