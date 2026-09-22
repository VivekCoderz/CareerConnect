/**
 * Loads the official Razorpay Checkout modal script dynamically.
 * Returns a Promise that resolves to true once window.Razorpay is available.
 */
let razorpayScriptLoadingPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // Already loaded
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  // Prevent multiple concurrent script tags
  if (razorpayScriptLoadingPromise) {
    return razorpayScriptLoadingPromise;
  }

  razorpayScriptLoadingPromise = new Promise((resolve) => {
    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.error("Failed to load Razorpay SDK script from CDN.");
      razorpayScriptLoadingPromise = null;
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return razorpayScriptLoadingPromise;
};
