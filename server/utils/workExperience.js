// Freshers have at most 2 years of work experience: the signup forms offer them "0 years",
// "1 year" and "2 years" only, and the server refuses more.

const FRESHER_MAX_YEARS = 2;

const FRESHER_EXPERIENCE_ERROR = {
  success: false,
  field: "workExperience",
  message: `Freshers can have at most ${FRESHER_MAX_YEARS} years of work experience. Choose "Working professional" for more.`,
};

/**
 * Whether a signup's work experience fits the candidate type.
 * @param {string} userType - "student" | "fresher" | "professional"
 * @param {string|number} value - e.g. "1 year", "5+ years" or a legacy number of years
 * @returns {boolean}
 */
const isWorkExperienceAllowed = (userType, value) => {
  if (userType !== "fresher") return true;
  const text = String(value ?? "").trim();
  const years = Number.parseFloat(text);
  return Number.isFinite(years) && years >= 0 && years <= FRESHER_MAX_YEARS && !text.includes("+");
};

module.exports = { FRESHER_EXPERIENCE_ERROR, FRESHER_MAX_YEARS, isWorkExperienceAllowed };
