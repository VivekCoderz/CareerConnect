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