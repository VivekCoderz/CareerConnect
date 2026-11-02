// Display values for job / internship listings in lists and feeds. Each returns null when
// the listing has no real value, so the client can hide the field. Nothing here invents
// text such as "Competitive Stipend", "3-6 Months" or "Partner Employer".

const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const lpa = (amount) => (amount / 100000).toFixed(1);
const rupees = (amount) => `₹${amount.toLocaleString("en-IN")}`;

// Placeholders older listings stored as if they were values.
const STORED_PLACEHOLDERS = new Set(["not disclosed", "stipend not disclosed"]);

/** The value when it is real text, otherwise null. */
const textOrNull = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  return STORED_PLACEHOLDERS.has(value.trim().toLowerCase()) ? null : value.trim();
};

/** Annual salary range in LPA, e.g. "₹6.0 - 12.0 LPA" or "₹6.0+ LPA". */
const formatSalary = (range) => {
  const min = toNumber(range?.min);
  const max = toNumber(range?.max);
  if (min > 0 && max > 0) return `₹${lpa(min)} - ${lpa(max)} LPA`;
  if (min > 0) return `₹${lpa(min)}+ LPA`;
  if (max > 0) return `Up to ₹${lpa(max)} LPA`;
  return null;
};

/**
 * Monthly stipend: the employer's own text if given, otherwise the stipend amount (or,
 * for internships stored as jobs, the salary range, which holds the monthly amount).
 */
const formatStipend = (listing) => {
  const text = textOrNull(listing?.stipend);
  if (text) return text;
  const range = toNumber(listing?.stipendAmount?.min) > 0 ? listing.stipendAmount : listing?.salaryRange;
  const min = toNumber(range?.min);
  const max = toNumber(range?.max);
  if (min > 0 && max > min) return `${rupees(min)} - ${rupees(max)} / month`;
  if (min > 0) return `${rupees(min)} / month`;
  return null;
};

/** The company name stored on the listing or its employer profile. */
const companyOf = (listing) =>
  listing?.employerId?.companyName || listing?.companyName || listing?.company || null;

/** "04 Oct 2026", or null when there is no (valid) date. */
const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

module.exports = { formatSalary, formatStipend, companyOf, formatDate, textOrNull };
