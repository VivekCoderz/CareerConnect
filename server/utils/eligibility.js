/**
 * Check if a candidate profile is eligible for an internship
 * @param {Object} internship - Internship or Job document/object (employmentType: Internship)
 * @param {Object} profile - StudentProfile or FresherProfile document
 * @returns {Boolean} - true if eligible, false otherwise
 */
const isEligibleForInternship = (internship, profile) => {
  if (!profile) {
    return true; // if no profile, show everything (non-strict)
  }

  // 1. Collect candidate skills (both StudentProfile and FresherProfile format)
  const candidateSkills = [];

  // For StudentProfile:
  if (profile.technicalSkills && Array.isArray(profile.technicalSkills)) {
    candidateSkills.push(...profile.technicalSkills);
  }
  if (profile.softSkills && Array.isArray(profile.softSkills)) {
    profile.softSkills.forEach((s) => {
      if (typeof s === "string") {
        candidateSkills.push(s);
      } else if (s && typeof s === "object" && s.name) {
        candidateSkills.push(s.name);
      }
    });
  }

  // For FresherProfile and other structures:
  if (profile.skills) {
    const categories = [
      "programmingLanguages",
      "frameworks",
      "databases",
      "tools",
      "softSkills",
      "technical",
    ];
    categories.forEach((cat) => {
      if (profile.skills[cat] && Array.isArray(profile.skills[cat])) {
        profile.skills[cat].forEach((s) => {
          if (s && typeof s === "object" && s.name) {
            candidateSkills.push(s.name);
          } else if (typeof s === "string") {
            candidateSkills.push(s);
          }
        });
      }
    });
  }

  const cleanSkills = candidateSkills
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  // 2. Skills Match Check
  const required = (internship.requiredSkills || [])
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  if (required.length > 0) {
    const skillOk = required.some((req) =>
      cleanSkills.some(
        (st) => st === req || st.toLowerCase() === req || st.includes(req) || req.includes(st)
      )
    );
    if (!skillOk) {
      return false;
    }
  }

  // 3. Education / Eligibility Match Check
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

  const education = profile.education || [];
  if (education.length === 0) {
    return false;
  }

  const studentDegrees = education
    .map((e) => {
      const parts = [
        e.degree || "",
        e.fieldOfStudy || "",
        e.specialization || "",
        e.qualificationType || "",
      ];
      return parts.join(" ");
    })
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
  if (mentioned.length === 0) {
    return true;
  }

  return mentioned.some((k) => studentDegrees.includes(k.trim()));
};

module.exports = { isEligibleForInternship };
