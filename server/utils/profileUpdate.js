const serverOwnedFields = new Set([
  "_id", "userId", "verificationStatus", "profileCompletion", "isProfileComplete",
  "jobReadinessScore", "careerStrengthScore", "createdAt", "updatedAt",
]);
const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

const cleanValue = (value) => {
  if (Array.isArray(value)) return value.map(cleanValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith("$") && !key.includes(".") && !unsafeKeys.has(key))
    .map(([key, nested]) => [key, cleanValue(nested)]));
};

const sanitizeProfileUpdate = (body) => Object.fromEntries(Object.entries(body || {})
  .filter(([key]) => !serverOwnedFields.has(key) && !key.startsWith("$") &&
    !key.includes(".") && !unsafeKeys.has(key))
  .map(([key, value]) => [key, cleanValue(value)]));

module.exports = { sanitizeProfileUpdate };
