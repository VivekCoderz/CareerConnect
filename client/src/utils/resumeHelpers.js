/** Create empty initial raw data shape */
export const createEmptyRawData = () => ({
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  education: [
    {
      id: crypto.randomUUID(),
      level: 'undergraduate',
      college: '',
      degree: '',
      branch: '',
      cgpa: '',
      startYear: '',
      endYear: '',
      location: '',
    },
  ],
  skills: {
    programmingLanguages: '',
    frameworks: '',
    tools: '',
    other: '',
  },
  projects: [
    {
      id: crypto.randomUUID(),
      name: '',
      technologies: '',
      description: '',
      github: '',
      live: '',
    },
  ],
  experience: [
    {
      id: crypto.randomUUID(),
      company: '',
      role: '',
      duration: '',
      description: '',
    },
  ],
  certifications: [
    {
      id: crypto.randomUUID(),
      name: '',
      issuer: '',
      year: '',
    },
  ],
  achievements: [
    {
      id: crypto.randomUUID(),
      title: '',
      description: '',
    },
  ],
});

/** Basic validation before sending to AI */
export const validateRawData = (raw) => {
  const errors = [];
  if (!raw.personal?.fullName?.trim()) errors.push('Full Name is required');
  if (!raw.personal?.email?.trim()) errors.push('Email is required');
  return errors;
};

/** Convert comma / newline separated skills string into array */
export const parseSkills = (str) => {
  if (!str) return [];
  return str
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/** Deep clone helper */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** Safely extract a flat array of skills from any data format (object, array, string) */
export const extractSkillsList = (skillsData) => {
  if (!skillsData) return [];
  if (Array.isArray(skillsData)) {
    return skillsData
      .map((s) => (typeof s === "string" ? s.trim() : s?.name || ""))
      .filter(Boolean);
  }
  if (typeof skillsData === "string") {
    return skillsData.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof skillsData === "object") {
    const list = [
      ...(Array.isArray(skillsData.programmingLanguages)
        ? skillsData.programmingLanguages
        : typeof skillsData.programmingLanguages === "string"
        ? skillsData.programmingLanguages.split(/[,\n]/)
        : []),
      ...(Array.isArray(skillsData.frameworks)
        ? skillsData.frameworks
        : typeof skillsData.frameworks === "string"
        ? skillsData.frameworks.split(/[,\n]/)
        : []),
      ...(Array.isArray(skillsData.tools)
        ? skillsData.tools
        : typeof skillsData.tools === "string"
        ? skillsData.tools.split(/[,\n]/)
        : []),
      ...(Array.isArray(skillsData.other)
        ? skillsData.other
        : typeof skillsData.other === "string"
        ? skillsData.other.split(/[,\n]/)
        : []),
    ];
    if (list.length > 0) {
      return list.map((s) => (typeof s === "string" ? s.trim() : s?.name || "")).filter(Boolean);
    }
    // Fallback: extract all values
    return Object.values(skillsData)
      .flatMap((v) =>
        Array.isArray(v)
          ? v
          : typeof v === "string"
          ? v.split(/[,\n]/)
          : []
      )
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  }
  return [];
};

/**
 * Education Level hierarchy ranking for professional reverse-chronological order:
 * 1. Postgraduate / Master's
 * 2. Undergraduate / College / University
 * 3. Diploma
 * 4. Other
 * 5. 12th / Senior Secondary
 * 6. 10th / Secondary
 */
export const getEducationLevelRank = (level, degree = '') => {
  const lvl = String(level || '').toLowerCase().trim();
  const deg = String(degree || '').toLowerCase().trim();

  if (lvl === 'postgraduate' || deg.includes('master') || deg.includes('mba') || deg.includes('mca') || deg.includes('m.tech') || deg.includes('m.sc')) return 1;
  if (lvl === 'undergraduate' || deg.includes('b.tech') || deg.includes('bachelor') || deg.includes('bca') || deg.includes('b.sc') || deg.includes('b.e.')) return 2;
  if (lvl === 'diploma' || deg.includes('diploma') || deg.includes('polytechnic')) return 3;
  if (lvl === 'other') return 4;
  if (lvl === '12th' || deg.includes('12th') || deg.includes('senior secondary') || deg.includes('intermediate') || deg.includes('higher secondary')) return 5;
  if (lvl === '10th' || deg.includes('10th') || deg.includes('secondary') || deg.includes('matric') || deg.includes('high school')) return 6;
  return 2; // Default to undergraduate level
};

/**
 * Sort education entries in professional order:
 * Highest/Current education first, followed by 12th and 10th.
 * Ties broken by endYear / passingYear descending.
 */
export const sortEducation = (eduList = []) => {
  if (!Array.isArray(eduList)) return [];
  return [...eduList].sort((a, b) => {
    const rankA = getEducationLevelRank(a.level, a.degree);
    const rankB = getEducationLevelRank(b.level, b.degree);
    if (rankA !== rankB) return rankA - rankB;

    const yearA = parseInt(a.endYear || a.passingYear || a.startYear || '0', 10) || 0;
    const yearB = parseInt(b.endYear || b.passingYear || b.startYear || '0', 10) || 0;
    return yearB - yearA;
  });
};