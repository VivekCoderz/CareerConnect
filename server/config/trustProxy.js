/**
 * Trust Proxy Configuration
 * Parses TRUST_PROXY_HOPS from env (0-5, default 0).
 * Throws on invalid values. Never use boolean true.
 */

function getTrustProxyHops() {
  const rawHops = process.env.TRUST_PROXY_HOPS;
  if (rawHops === undefined || rawHops === null || String(rawHops).trim() === "") {
    return 0;
  }

  const parsed = Number(rawHops);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
    throw new Error(
      `Invalid TRUST_PROXY_HOPS: "${rawHops}". Must be an integer between 0 and 5.`
    );
  }

  return parsed;
}

function configureTrustProxy(app) {
  const hops = getTrustProxyHops();
  app.set("trust proxy", hops);
  return hops;
}

module.exports = {
  getTrustProxyHops,
  configureTrustProxy,
};
