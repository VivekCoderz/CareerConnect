// Skill-name helpers shared by resume parsing and the skill-gap analyses.

// Interpersonal skills. Anything else a resume parser can't place is technical, including
// Problem Solving, which our profiles list with DSA as a technical skill (CC-02).
const SOFT_SKILLS = [
  "communication", "verbal communication", "written communication", "teamwork", "team work",
  "collaboration", "leadership", "team leadership", "critical thinking",
  "analytical thinking", "time management", "adaptability", "flexibility", "creativity",
  "presentation", "presentation skills", "public speaking", "negotiation", "empathy",
  "interpersonal skills", "attention to detail", "decision making", "conflict resolution",
  "multitasking", "work ethic", "self motivated", "self-motivated", "organization",
  "organisational skills", "organizational skills", "active listening", "emotional intelligence",
  "mentoring", "customer service", "stakeholder management",
];

// Different spellings of the same technical skill, keyed by their normalised form.
const SYNONYMS = {
  reactjs: "react", react: "react",
  nodejs: "node", node: "node",
  expressjs: "express", express: "express",
  nextjs: "next", vuejs: "vue", angularjs: "angular",
  restapi: "restapi", restapis: "restapi", restfulapi: "restapi", restfulapis: "restapi", rest: "restapi",
  mongodb: "mongodb", mongo: "mongodb",
  postgresql: "postgres", postgres: "postgres",
  javascript: "javascript", js: "javascript", es6: "javascript",
  typescript: "typescript", ts: "typescript",
  html5: "html", html: "html", css3: "css", css: "css",
  tailwindcss: "tailwind", tailwind: "tailwind",
  dsa: "datastructuresandalgorithms", datastructuresandalgorithms: "datastructuresandalgorithms",
  oop: "oop", oops: "oop", objectorientedprogramming: "oop",
};

/** Lowercases and strips punctuation, so "React.js", "ReactJS" and "react" compare equal. */
const normalizeSkill = (name) => {
  const key = String(name || "").toLowerCase().replace(/[^a-z0-9+#]/g, "");
  return SYNONYMS[key] || key;
};

// Compared with normalizeSkill, so "Team-Work", "teamwork" and "Team Work" are all soft.
const SOFT_SKILL_KEYS = new Set(SOFT_SKILLS.map(normalizeSkill));

const isSoftSkill = (name) => SOFT_SKILL_KEYS.has(normalizeSkill(name));

/** Splits a resume's "other" skills into technical and soft skills. */
const splitOtherSkills = (skills = []) => ({
  technical: skills.filter((s) => !isSoftSkill(s)),
  soft: skills.filter(isSoftSkill),
});

/** A Set of normalised skill names, for "does the user have this skill?" checks. */
const normalizedSkillSet = (skills = []) => new Set(skills.filter(Boolean).map(normalizeSkill));

/**
 * Adds incoming skills to existing ones without duplicates (compared with normalizeSkill).
 * Existing items are kept as they are. New items are strings, or { name } when asObjects
 * is set (fresher and professional profiles store skills as { name, proficiency }).
 */
const mergeSkillStrings = (existing = [], incoming = [], { asObjects = false } = {}) => {
  const nameOf = (s) => String(typeof s === "string" ? s : s?.name || "").trim();
  const seen = new Set(existing.map(nameOf).filter(Boolean).map(normalizeSkill));
  const result = [...existing];
  for (const item of incoming) {
    const name = nameOf(item);
    if (!name || seen.has(normalizeSkill(name))) continue;
    seen.add(normalizeSkill(name));
    result.push(asObjects ? { name } : name);
  }
  return result;
};

module.exports = { normalizeSkill, isSoftSkill, splitOtherSkills, normalizedSkillSet, mergeSkillStrings };
