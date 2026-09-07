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
      college: '',
      degree: '',
      branch: '',
      cgpa: '',
      startYear: '',
      endYear: '',
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