// C5 / FL-04: the jobs page offers fixed city labels and work modes, but listings store
// free-text cities ("Bengaluru", "New Delhi", "Gurugram") and the schema spells the work
// mode "On-site" while the page sends "On-Site". Exact matching found nothing for those,
// so each page value is mapped to what listings actually store.

const CITY_ALIASES = {
  "Bangalore": ["bangalore", "bengaluru"],
  "Delhi NCR": ["delhi", "gurgaon", "gurugram", "noida", "ghaziabad", "faridabad"],
  "Mumbai": ["mumbai", "bombay", "thane"],
  "Hyderabad": ["hyderabad", "secunderabad"],
  "Chennai": ["chennai", "madras"],
};

const WORK_MODES = ["On-site", "Hybrid", "Remote"];

const escape = (value) => String(value).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Query values arrive as strings, arrays or objects (?a[$ne]=x); only plain strings are filters. */
const queryString = (value) => (typeof value === "string" ? value.trim() : "");

/** Regex matching a city label: known labels also match their other spellings and NCR cities. */
const cityRegex = (city) => {
  const label = Object.keys(CITY_ALIASES).find((k) => k.toLowerCase() === String(city).toLowerCase());
  return label ? new RegExp(CITY_ALIASES[label].join("|"), "i") : new RegExp(escape(city), "i");
};

/** The stored spelling of a work mode ("On-Site", "onsite" -> "On-site"); other values are kept as given. */
const normalizeWorkMode = (mode) => {
  const key = String(mode).toLowerCase().replace(/[^a-z]/g, "");
  return WORK_MODES.find((m) => m.toLowerCase().replace(/[^a-z]/g, "") === key) || String(mode);
};

module.exports = { CITY_ALIASES, WORK_MODES, queryString, cityRegex, normalizeWorkMode };
