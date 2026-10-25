// Student profile beyond the imported details: personal details, schooling, graduation, photo,
// resume and LinkedIn. Validation accepts a partly filled profile; completion says how much is
// done. A profile at or above COMPLETE_PERCENT may start the test (classes stay open either way).

const COMPLETE_PERCENT = 90;
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const THIS_YEAR = () => new Date().getFullYear();

const str = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

const SCHOOL = ["board", "maxMarks", "obtainedMarks", "year"];
const DIPLOMA = ["course", "institute", "maxMarks", "obtainedMarks", "year"];
const GRADUATION = ["degree", "university", "cgpa", "year"];

const filled = (obj, keys) => Boolean(obj) && keys.every((k) => obj[k] !== null && obj[k] !== undefined && obj[k] !== "");

const linkedinOk = (url) => /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]+\/?$/i.test(url);

/** Checks one marks block (10th, 12th or diploma); returns its clean value. */
const marksBlock = (input, keys, label, errors) => {
  const value = {};
  keys.forEach((k) => {
    if (["board", "course", "institute"].includes(k)) value[k] = str(input?.[k], 120);
    else value[k] = num(input?.[k]);
  });
  const { maxMarks, obtainedMarks, year } = value;
  if (maxMarks !== null && (!Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 5000)) errors[`${label}.maxMarks`] = "Enter the maximum marks.";
  if (obtainedMarks !== null && (!Number.isFinite(obtainedMarks) || obtainedMarks < 0)) errors[`${label}.obtainedMarks`] = "Enter the marks you got.";
  else if (obtainedMarks !== null && maxMarks !== null && obtainedMarks > maxMarks) errors[`${label}.obtainedMarks`] = "Cannot be more than the maximum marks.";
  if (year !== null && (!Number.isInteger(year) || year < 1980 || year > THIS_YEAR())) errors[`${label}.year`] = "Enter the year you passed.";
  return value;
};

/** Validates a profile update; returns { errors, value } with only the clean fields. */
const validateProfile = (input = {}) => {
  const errors = {};
  const value = {};
  if (input.dob !== undefined) {
    const d = input.dob ? new Date(input.dob) : null;
    const age = d ? (Date.now() - d.getTime()) / (365.25 * 864e5) : null;
    if (d && (Number.isNaN(d.getTime()) || age < 15 || age > 70)) errors.dob = "Enter your date of birth.";
    else value.dob = d;
  }
  if (input.gender !== undefined) {
    if (input.gender && !GENDERS.includes(input.gender)) errors.gender = "Choose an option.";
    else value.gender = input.gender || "";
  }
  if (input.linkedinUrl !== undefined) {
    let url = str(input.linkedinUrl, 200);
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/^http:\/\//i, "https://");
    if (url && !linkedinOk(url)) errors.linkedinUrl = "Enter your LinkedIn profile link, like https://www.linkedin.com/in/your-name";
    else value.linkedinUrl = url;
  }
  if (input.class10 !== undefined) value.class10 = marksBlock(input.class10, SCHOOL, "class10", errors);
  if (input.class12 !== undefined) value.class12 = marksBlock(input.class12, SCHOOL, "class12", errors);
  if (input.diploma !== undefined) value.diploma = marksBlock(input.diploma, DIPLOMA, "diploma", errors);
  if (input.graduation !== undefined) {
    const g = { degree: str(input.graduation?.degree, 120), university: str(input.graduation?.university, 160), cgpa: num(input.graduation?.cgpa), year: num(input.graduation?.year) };
    if (g.cgpa !== null && (!Number.isFinite(g.cgpa) || g.cgpa < 0 || g.cgpa > 10)) errors["graduation.cgpa"] = "CGPA must be from 0 to 10.";
    if (g.year !== null && (!Number.isInteger(g.year) || g.year < 1980 || g.year > THIS_YEAR() + 1)) errors["graduation.year"] = "Enter the year you graduated.";
    value.graduation = g;
  }
  return { errors, value };
};

/** The items that make up a complete profile, each counted once. */
const ITEMS = [
  ["fullName", "Full name", (m) => Boolean(m.fullName)],
  ["phone", "Mobile number", (m) => Boolean(m.phone)],
  ["dob", "Date of birth", (m, p) => Boolean(p.dob)],
  ["gender", "Gender", (m, p) => Boolean(p.gender)],
  ["photo", "Profile photo", (m, p) => Boolean(p.photoFileId)],
  ["linkedin", "LinkedIn profile", (m, p) => Boolean(p.linkedinUrl)],
  ["resume", "Resume", (m, p) => Boolean(p.resumeFileId)],
  ["class10", "10th details", (m, p) => filled(p.class10, SCHOOL)],
  ["class12", "12th or diploma details", (m, p) => filled(p.class12, SCHOOL) || filled(p.diploma, DIPLOMA)],
  ["graduation", "Graduation details", (m, p) => filled(p.graduation, GRADUATION)],
  ["mbaCgpa", "MBA CGPA", (m) => m.cgpa !== null && m.cgpa !== undefined],
];

const completion = (member) => {
  const p = member.profile || {};
  const missing = ITEMS.filter(([, , done]) => !done(member, p)).map(([key, label]) => ({ key, label }));
  const percent = Math.round(((ITEMS.length - missing.length) / ITEMS.length) * 100);
  return { percent, missing, required: COMPLETE_PERCENT, complete: percent >= COMPLETE_PERCENT };
};

module.exports = { validateProfile, completion, COMPLETE_PERCENT, GENDERS };
