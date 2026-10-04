// Job / internship posting forms. Nothing is pre-filled: the employer fills every field,
// so nothing they didn't choose gets saved (QA bug 7).

export const EMPTY_LISTING_FORM = {
  title: "",
  category: "",
  subCategory: "",
  department: "",
  employmentType: "",
  workMode: "",
  location: "",
  city: "",
  country: "India",
  isPaid: true,
  hasJobOffer: false,
  isInternational: false,
  salaryMin: "",
  salaryMax: "",
  currency: "INR",
  isNegotiable: false,
  stipend: "",
  duration: "",
  experienceLevel: "",
  minYears: "",
  maxYears: "",
  education: "",
  eligibility: "",
  description: "",
  responsibilities: "",
  requiredSkills: "",
  preferredSkills: "",
  bonusSkills: "",
  openings: "",
  deadline: "",
  status: "",
};

const LABELS = {
  title: "Title",
  category: "Category",
  employmentType: "Employment type",
  workMode: "Work mode",
  location: "Location",
  description: "Description",
  requiredSkills: "Required skills",
  openings: "Number of openings",
  stipend: "Stipend",
  duration: "Duration",
};

const isBlank = (value) => String(value ?? "").trim() === "";

/**
 * The first problem with the form as a message, or null when it can be submitted.
 * `required` lists the fields the form shows and needs.
 */
export const listingFormError = (form, required) => {
  const missing = required.filter((key) => isBlank(form[key]));
  if (missing.length) {
    return `Please fill in: ${missing.map((key) => LABELS[key] || key).join(", ")}.`;
  }
  if (required.includes("requiredSkills") && !String(form.requiredSkills).split(",").some((s) => s.trim())) {
    return "Please add at least one required skill.";
  }
  if (required.includes("openings")) {
    const openings = Number(form.openings);
    if (!Number.isInteger(openings) || openings < 1) return "Number of openings must be a whole number of 1 or more.";
  }
  const min = Number(form.salaryMin);
  const max = Number(form.salaryMax);
  if (!isBlank(form.salaryMin) && !isBlank(form.salaryMax) && min > max) {
    return "Minimum salary can't be more than the maximum.";
  }
  return null;
};

/** Experience as entered: only the parts the employer filled in. */
export const experiencePayload = (form) => ({
  ...(form.experienceLevel ? { level: form.experienceLevel } : {}),
  ...(!isBlank(form.minYears) ? { minYears: Number(form.minYears) } : {}),
  ...(!isBlank(form.maxYears) ? { maxYears: Number(form.maxYears) } : {}),
});
