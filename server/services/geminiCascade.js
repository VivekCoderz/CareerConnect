// Shared Gemini call policy. One user action makes at most GEMINI_MAX_CALLS calls
// (default 2): the configured model, then one fallback model. This keeps a single click
// from using up the free quota.

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

const TRANSIENT_ERROR = /503|fetch failed|terminated|high demand|overloaded|ECONNRESET|ETIMEDOUT/i;

const maxGeminiCalls = () => {
  const parsed = parseInt(process.env.GEMINI_MAX_CALLS, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 2;
};

const geminiModels = () => [...new Set([process.env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))];

/**
 * Runs `callModel(modelName)` until it succeeds or the call budget is used. Every failure
 * moves to the next model: when Google reports "high demand" (503) for one model, retrying
 * it a second later usually fails again, while another model is often free.
 */
const runWithGeminiCascade = async (callModel, { label = "Gemini", retryDelayMs = 1200 } = {}) => {
  const models = geminiModels();
  const budget = maxGeminiCalls();
  let index = 0;
  let lastError = null;

  for (let calls = 0; calls < budget && index < models.length; calls++) {
    const modelName = models[index];
    try {
      return await callModel(modelName);
    } catch (err) {
      lastError = err;
      const transient = TRANSIENT_ERROR.test(err.message || "");
      console.warn(`${label}: ${modelName} failed (${err.message}), trying next model`);
      if (transient && calls + 1 < budget) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      index += 1;
    }
  }

  throw lastError || new Error(`${label}: no Gemini model available`);
};

module.exports = { runWithGeminiCascade, maxGeminiCalls, geminiModels };
