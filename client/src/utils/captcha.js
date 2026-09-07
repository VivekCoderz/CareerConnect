/**
 * Google reCAPTCHA v3 utility.
 *
 * Dynamically loads the reCAPTCHA v3 script on first use, then provides
 * a getCaptchaToken() function that returns a token for the given action.
 *
 * In development: uses Google's public test site key which always returns
 * a score of 0.9 and the backend skips verification in non-production.
 */

// Google reCAPTCHA v3 keys
const PROD_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const DEV_SITE_KEY = "6Lc4s6ctAAAAAOfgmjg_OvVijH4CDWoJGqWF0aD7";

const SITE_KEY = PROD_SITE_KEY || DEV_SITE_KEY;

let scriptLoaded = false;
let scriptLoading = false;
let loadCallbacks = [];

const loadRecaptchaScript = () => {
  return new Promise((resolve) => {
    if (scriptLoaded || typeof window.grecaptcha !== "undefined") {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks = [];
    };
    script.onerror = () => {
      scriptLoading = false;
      // Resolve anyway — backend will fail gracefully if no token
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks = [];
    };
    document.head.appendChild(script);
  });
};

/**
 * Returns a reCAPTCHA v3 token for the given action.
 * Returns empty string on failure (backend will handle gracefully).
 *
 * @param {string} action - Action name for analytics (e.g. "login", "signup", "google_login")
 * @returns {Promise<string>} - reCAPTCHA token
 */
export const getCaptchaToken = async (action = "submit") => {
  try {
    await loadRecaptchaScript();

    if (typeof window.grecaptcha === "undefined") {
      console.warn("[reCAPTCHA] Script not loaded — skipping token");
      return "";
    }

    return await new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(SITE_KEY, { action })
          .then(resolve)
          .catch(reject);
      });
    });
  } catch (err) {
    console.warn("[reCAPTCHA] Token generation failed:", err);
    return "";
  }
};
