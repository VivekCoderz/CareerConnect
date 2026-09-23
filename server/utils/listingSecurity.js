const editableListingFields = new Set([
  "title", "department", "category", "subCategory", "employmentType", "workMode",
  "location", "city", "state", "country", "isPaid", "hasJobOffer",
  "isInternational", "stipend", "stipendAmount", "duration", "openings",
  "description", "responsibilities", "requiredSkills", "preferredSkills",
  "bonusSkills", "education", "eligibility", "deadline", "salaryRange",
  "experience", "benefits", "applicationDeadline", "applyUrl", "status",
  "interviewRounds",
]);

const pickListingUpdate = (body) => Object.fromEntries(
  Object.entries(sanitizeProfileUpdate(body)).filter(([key]) => editableListingFields.has(key))
);

const escapeRegex = (value) => String(value || "").slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { pickListingUpdate, escapeRegex };
const { sanitizeProfileUpdate } = require("./profileUpdate");
