/**
 * Check if student profile is eligible for an internship
 * @param {Object} internship
 * @param {Object|null} studentProfile
 * @param {{ strict?: boolean }} options - strict: no profile => not eligible
 */
export function isEligibleForInternship(internship, studentProfile, options = {}) {
  const { strict = false } = options;

  if (!studentProfile) {
    return !strict; // strict false => show all if no profile
  }

  // ---------- Collect student skills ----------
  const studentSkills = [
    ...(studentProfile.technicalSkills || []),
    ...(studentProfile.softSkills || []),
    ...(studentProfile.skills || []),
  ]
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  // ---------- Skills check ----------
  const required = (internship.requiredSkills || [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  if (required.length > 0) {
    const skillOk = required.some((req) =>
      studentSkills.some(
        (st) => st === req || st.includes(req) || req.includes(st)
      )
    );
    if (!skillOk) return false;
  }

  // ---------- Education / eligibility text ----------
  const eduText = `${internship.education || ""} ${
    internship.eligibility || ""
  }`.toLowerCase();

  if (
    !eduText.trim() ||
    eduText.includes("any graduate") ||
    eduText.includes("any branch") ||
    eduText.includes("all branches") ||
    eduText.includes("any student") ||
    eduText.includes("open to all")
  ) {
    return true;
  }

  const education = studentProfile.education || [];
  if (education.length === 0) {
    return false;
  }

  const studentDegrees = education
    .map(
      (e) =>
        `${e.degree || ""} ${e.fieldOfStudy || ""} ${e.course || ""} ${
          e.specialization || ""
        }`
    )
    .join(" ")
    .toLowerCase();

  const keywords = [
    "b.tech",
    "btech",
    "b.e",
    "be ",
    "bca",
    "mca",
    "b.sc",
    "bsc",
    "m.tech",
    "mtech",
    "mba",
    "diploma",
    "cse",
    "cs ",
    "it ",
    "computer",
    "electronics",
    "mechanical",
    "civil",
    "electrical",
    "ai",
    "ml",
    "data science",
  ];

  const mentioned = keywords.filter((k) => eduText.includes(k.trim()));
  if (mentioned.length === 0) return true;

  return mentioned.some((k) => studentDegrees.includes(k.trim()));
}