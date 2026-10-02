// Skill-name helpers shared by resume parsing and the skill-gap analyses.

// Interpersonal skills. Anything else a resume parser can't place is technical.
const SOFT_SKILLS = new Set([
  "communication", "verbal communication", "written communication", "teamwork", "team work",
  "collaboration", "leadership", "team leadership", "problem solving", "critical thinking",
  "analytical thinking", "time management", "adaptability", "flexibility", "creativity",
  "presentation", "presentation skills", "public speaking", "negotiation", "empathy",
  "interpersonal skills", "attention to detail", "decision making", "conflict resolution",
  "multitasking", "work ethic", "self motivated", "self-motivated", "organization",
  "organisational skills", "organizational skills", "active listening", "emotional intelligence",
  "mentoring", "customer service", "stakeholder management",
]);

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

const isSoftSkill = (name) => SOFT_SKILLS.has(String(name || "").trim().toLowerCase());

/** Splits a resume's "other" skills into technical and soft skills. */
const splitOtherSkills = (skills = []) => ({
  technical: skills.filter((s) => !isSoftSkill(s)),
  soft: skills.filter(isSoftSkill),
});

/** A Set of normalised skill names, for "does the user have this skill?" checks. */
const normalizedSkillSet = (skills = []) => new Set(skills.filter(Boolean).map(normalizeSkill));

module.exports = { normalizeSkill, isSoftSkill, splitOtherSkills, normalizedSkillSet };
