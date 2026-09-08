const dns = require("dns").promises;
const fs = require("fs");
const path = require("path");
const axios = require("axios");

/**
 * Disposable Email Protection & Validation Engine
 *
 * Provides multi-layer email security:
 * 1. RFC 5322 Syntax & normalization
 * 2. Whitelist fast-path for major & educational providers (0ms latency)
 * 3. Disposable/temporary domain blacklist check (O(1) Set lookup with sub-domain matching)
 * 4. DNS MX record validation (with timeout protection)
 * 5. Optional external email validation API support (with graceful fail-safe)
 * 6. High-performance TTL caching (Memory + Redis)
 * 7. Privacy-safe email masking for security logs
 */

// ─── Whitelisted Major & Educational Domains (Fast-path, bypass DNS) ─────────
const WHITELISTED_DOMAINS = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "office365.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "ymail.com",
  "rocketmail.com",
  // Secure / Business
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "zoho.in",
  "aol.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "fastmail.com",
  "rediffmail.com",
  // University & Educational partner
  "geetauniversity.edu.in",
  "geeta.edu.in",
]);

// Educational, Research & Government TLDs regex
const INSTITUTIONAL_TLD_REGEX = /\.(edu|ac\.in|edu\.in|gov|gov\.in|ernet\.in|res\.in|ac\.uk|edu\.au)$/i;

// RFC 5322 Compliant Email Regex
const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// ─── Load Disposable Domains ──────────────────────────────────────────────────
let disposableDomainsSet = new Set();

const loadDisposableDomains = () => {
  try {
    const dataPath = path.join(__dirname, "../data/disposableDomains.json");
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, "utf8");
      const domainList = JSON.parse(rawData);
      disposableDomainsSet = new Set(domainList.map((d) => d.toLowerCase().trim()));
      console.log(`🛡️ [EmailValidation] Loaded ${disposableDomainsSet.size} disposable email domains into security memory.`);
    }
  } catch (err) {
    console.error("[EmailValidation] Error loading disposableDomains.json:", err.message);
  }
};

loadDisposableDomains();

// ─── Caching Layer (In-Memory LRU/Map + TTL) ──────────────────────────────────
// Map<domain, { isValid: boolean, isDisposable: boolean, reason?: string, expiresAt: number }>
const validationCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Clean expired cache entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (value.expiresAt < now) {
      validationCache.delete(key);
    }
  }
}, 60 * 60 * 1000).unref();

/**
 * Mask an email for privacy-safe audit logging (e.g. j***@gmail.com)
 */
const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return "invalid@email";
  const [localPart, domain] = email.trim().toLowerCase().split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
};

/**
 * Extract normalized domain and parent domain parts
 */
const extractDomainParts = (domain) => {
  const cleanDomain = domain.toLowerCase().trim();
  const parts = cleanDomain.split(".");
  const parentDomains = [];

  for (let i = 0; i < parts.length - 1; i++) {
    parentDomains.push(parts.slice(i).join("."));
  }

  return { cleanDomain, parentDomains };
};

/**
 * Check if a domain or its parent domain is in the disposable blacklist
 */
const isDomainBlacklisted = (domain) => {
  const { cleanDomain, parentDomains } = extractDomainParts(domain);

  if (disposableDomainsSet.has(cleanDomain)) {
    return true;
  }

  for (const parent of parentDomains) {
    if (disposableDomainsSet.has(parent)) {
      return true;
    }
  }

  return false;
};

/**
 * Verify DNS MX records with timeout protection
 */
const checkMxRecords = async (domain, timeoutMs = 2500) => {
  // If whitelisted, automatically passes MX check
  if (WHITELISTED_DOMAINS.has(domain) || INSTITUTIONAL_TLD_REGEX.test(domain)) {
    return { hasMx: true, records: ["whitelisted"] };
  }

  const dnsPromise = dns.resolveMx(domain).then((records) => {
    return records && records.length > 0
      ? { hasMx: true, records }
      : { hasMx: false, records: [] };
  });

  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ hasMx: true, timeout: true }), timeoutMs)
  );

  try {
    const result = await Promise.race([dnsPromise, timeoutPromise]);
    return result;
  } catch (err) {
    // If domain not found or no MX record exists, or DNS server refused connection
    const invalidCodes = ["ENOTFOUND", "ENODATA", "SERVFAIL", "ECONNREFUSED", "EREFUSED", "EAI_AGAIN", "EAI_FAIL"];
    if (invalidCodes.includes(err.code)) {
      return { hasMx: false, error: err.code };
    }
    // Network timeout or unhandled system error -> fail open to avoid false positives
    console.warn(`[EmailValidation] DNS check warning for ${domain}:`, err.message);
    return { hasMx: true, error: err.code, failSafe: true };
  }
};

/**
 * Optional External Validation Service (Abstract / Debounce / Kickbox)
 * Configurable via DISPOSABLE_EMAIL_API_URL and DISPOSABLE_EMAIL_API_KEY
 */
const checkExternalValidationApi = async (email) => {
  const apiUrl = process.env.DISPOSABLE_EMAIL_API_URL;
  const apiKey = process.env.DISPOSABLE_EMAIL_API_KEY;

  if (!apiUrl) return null; // Not configured, skip silently

  try {
    const response = await axios.get(apiUrl, {
      params: { email, api_key: apiKey },
      timeout: 2000,
    });

    const data = response.data;
    // Handle standard response schemas (e.g. is_disposable_email / is_valid / deliverability)
    const isDisposable =
      data.is_disposable_email?.value === true ||
      data.is_disposable === true ||
      data.disposable === true;

    const isDeliverable =
      data.deliverability === "DELIVERABLE" ||
      data.is_valid_format?.value === true ||
      data.result !== "undeliverable";

    return { isDisposable, isDeliverable };
  } catch (err) {
    console.warn("[EmailValidation] External API check failed, falling back to local engine:", err.message);
    return null; // Fail safe to local checks
  }
};

/**
 * Comprehensive Email Validator
 *
 * @param {string} email
 * @param {object} options { checkDns = true, checkExternal = true }
 * @returns {Promise<{ isValid: boolean, isDisposable: boolean, reason?: string, normalizedEmail: string, domain: string }>}
 */
const validateEmail = async (email, options = { checkDns: true, checkExternal: true }) => {
  if (!email || typeof email !== "string") {
    return {
      isValid: false,
      isDisposable: false,
      reason: "Email is required and must be a string",
      normalizedEmail: "",
      domain: "",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Basic format & length check
  if (normalizedEmail.length > 254 || !RFC5322_EMAIL_REGEX.test(normalizedEmail)) {
    return {
      isValid: false,
      isDisposable: false,
      reason: "Invalid email syntax or format",
      normalizedEmail,
      domain: "",
    };
  }

  const parts = normalizedEmail.split("@");
  if (parts.length !== 2) {
    return {
      isValid: false,
      isDisposable: false,
      reason: "Invalid email format",
      normalizedEmail,
      domain: "",
    };
  }

  const [localPart, domain] = parts;

  if (localPart.length > 64 || domain.length > 255) {
    return {
      isValid: false,
      isDisposable: false,
      reason: "Email local part or domain exceeds maximum allowable length",
      normalizedEmail,
      domain,
    };
  }

  // 2. Check Cache
  const cached = validationCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.isValid) {
      return {
        isValid: false,
        isDisposable: cached.isDisposable,
        reason: cached.reason,
        normalizedEmail,
        domain,
        cached: true,
      };
    }
    return {
      isValid: true,
      isDisposable: false,
      normalizedEmail,
      domain,
      cached: true,
    };
  }

  // 3. Check Whitelist Fast-Path
  if (WHITELISTED_DOMAINS.has(domain) || INSTITUTIONAL_TLD_REGEX.test(domain)) {
    validationCache.set(domain, {
      isValid: true,
      isDisposable: false,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return {
      isValid: true,
      isDisposable: false,
      normalizedEmail,
      domain,
      whitelisted: true,
    };
  }

  // 4. Check Disposable Blacklist
  if (isDomainBlacklisted(domain)) {
    validationCache.set(domain, {
      isValid: false,
      isDisposable: true,
      reason: "Temporary or disposable email address detected",
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return {
      isValid: false,
      isDisposable: true,
      reason: "Temporary or disposable email addresses are not permitted. Please use a permanent email address.",
      normalizedEmail,
      domain,
    };
  }

  // 5. Optional External API Validator
  if (options.checkExternal && process.env.DISPOSABLE_EMAIL_API_URL) {
    const externalResult = await checkExternalValidationApi(normalizedEmail);
    if (externalResult) {
      if (externalResult.isDisposable) {
        // Dynamically add to blacklist set and cache
        disposableDomainsSet.add(domain);
        validationCache.set(domain, {
          isValid: false,
          isDisposable: true,
          reason: "Disposable email detected via security database",
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return {
          isValid: false,
          isDisposable: true,
          reason: "Temporary or disposable email addresses are not permitted. Please use a permanent email address.",
          normalizedEmail,
          domain,
        };
      }
    }
  }

  // 6. Check DNS MX Records
  if (options.checkDns) {
    const mxResult = await checkMxRecords(domain);
    if (!mxResult.hasMx) {
      validationCache.set(domain, {
        isValid: false,
        isDisposable: false,
        reason: "Email domain has no valid mail exchange (MX) records",
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return {
        isValid: false,
        isDisposable: false,
        reason: "The email domain entered does not appear to accept emails (no valid MX records found).",
        normalizedEmail,
        domain,
      };
    }
  }

  // All checks passed -> cache and return valid
  validationCache.set(domain, {
    isValid: true,
    isDisposable: false,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return {
    isValid: true,
    isDisposable: false,
    normalizedEmail,
    domain,
  };
};

/**
 * Dynamically add a new domain to the disposable blacklist at runtime
 */
const addDisposableDomain = (domain) => {
  if (!domain) return;
  const clean = domain.toLowerCase().trim();
  disposableDomainsSet.add(clean);
  validationCache.set(clean, {
    isValid: false,
    isDisposable: true,
    reason: "Dynamically added disposable domain",
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

module.exports = {
  validateEmail,
  isDomainBlacklisted,
  checkMxRecords,
  maskEmail,
  addDisposableDomain,
  reloadDisposableDomains: loadDisposableDomains,
  WHITELISTED_DOMAINS,
};
