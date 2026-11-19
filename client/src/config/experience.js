// "Years of work experience" choices on the signup forms. Freshers have at most 2 years;
// the server refuses more (server/utils/workExperience.js).

export const EXPERIENCE_OPTIONS = ["0 years", "1 year", "2 years", "3 years", "4 years", "5 years", "5+ years"];

const FRESHER_EXPERIENCE_OPTIONS = EXPERIENCE_OPTIONS.slice(0, 3);

/**
 * @param {string} type - "student" | "fresher" | "professional"
 * @returns {string[]} the experience choices shown for this candidate type
 */
export const experienceOptionsFor = (type) => (type === "fresher" ? FRESHER_EXPERIENCE_OPTIONS : EXPERIENCE_OPTIONS);

/**
 * The experience to keep after the user switches type: an answer the new type doesn't
 * offer (e.g. "4 years" when switching to Fresher) goes back to "0 years".
 * @param {string} type
 * @param {string} current
 * @returns {string}
 */
export const experienceForType = (type, current) =>
  experienceOptionsFor(type).includes(current) ? current : EXPERIENCE_OPTIONS[0];
