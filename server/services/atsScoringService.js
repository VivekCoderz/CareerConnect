const SKILL_ALIASES = {
  javascript: ["javascript", "js", "es6"],
  typescript: ["typescript", "ts"],
  react: ["react", "reactjs", "react.js"],
  angular: ["angular", "angularjs"],
  vue: ["vue", "vuejs", "vue.js"],
  "node.js": ["node", "nodejs", "node.js"],
  express: ["express", "expressjs", "express.js"],
  python: ["python"],
  java: ["java"],
  "c++": ["c++", "cpp"],
  "c#": ["c#", "csharp"],
  php: ["php"],
  sql: ["sql"],
  mongodb: ["mongodb", "mongo db"],
  mysql: ["mysql"],
  postgresql: ["postgresql", "postgres"],
  redis: ["redis"],
  aws: ["aws", "amazon web services"],
  azure: ["azure"],
  gcp: ["gcp", "google cloud"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  git: ["git", "github", "gitlab"],
  html: ["html", "html5"],
  css: ["css", "css3"],
  tailwind: ["tailwind", "tailwind css"],
  bootstrap: ["bootstrap"],
  "rest api": ["rest api", "restful api", "restful services"],
  graphql: ["graphql"],
  firebase: ["firebase"],
  "machine learning": ["machine learning", "ml"],
  "data analysis": ["data analysis", "data analytics"],
  excel: ["excel", "microsoft excel"],
  powerbi: ["power bi", "powerbi"],
  tableau: ["tableau"],
  figma: ["figma"],
  "ui/ux": ["ui/ux", "ui ux", "user experience", "user interface"],
  agile: ["agile", "scrum"],
  testing: ["testing", "unit testing", "integration testing"],
};

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "been", "being", "but", "can", "company",
  "for", "from", "have", "into", "job", "more", "our", "role", "should", "that", "the",
  "their", "this", "through", "using", "will", "with", "work", "working", "years", "you", "your",
  "skills", "required", "preferred", "candidate", "responsibilities", "experience", "knowledge",
]);

const ACTION_VERBS = [
  "achieved", "built", "created", "delivered", "designed", "developed", "implemented",
  "improved", "increased", "launched", "led", "managed", "optimized", "reduced", "resolved",
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9+#./%\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const flattenValues = (value, output = []) => {
  if (value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number") output.push(String(value));
  else if (Array.isArray(value)) value.forEach((item) => flattenValues(item, output));
  else if (typeof value === "object") Object.values(value).forEach((item) => flattenValues(item, output));
  return output;
};

const phraseExists = (text, phrase) => {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(text);
};

const canonicalSkill = (skill) => {
  const normalizedSkill = normalize(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => normalize(alias) === normalizedSkill)) return canonical;
  }
  return normalizedSkill;
};

const extractKnownSkills = (text) => Object.entries(SKILL_ALIASES)
  .filter(([, aliases]) => aliases.some((alias) => phraseExists(text, alias)))
  .map(([canonical]) => canonical);

const extractKeywords = (text, limit = 14) => {
  const counts = new Map();
  normalize(text).split(/\s+/).forEach((word) => {
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
};

const hasItems = (value) => Array.isArray(value)
  ? value.length > 0
  : Boolean(value && (typeof value !== "object" || Object.keys(value).length));

const analyzeATSMatch = (resumeData, opportunity) => {
  const resumeText = normalize(flattenValues(resumeData).join(" "));
  const jobText = normalize(flattenValues(opportunity).join(" "));

  const explicitSkills = [
    ...(Array.isArray(opportunity.requiredSkills) ? opportunity.requiredSkills : []),
    ...(Array.isArray(opportunity.preferredSkills) ? opportunity.preferredSkills : []),
  ].map(canonicalSkill).filter(Boolean);
  const targetSkills = [...new Set([...explicitSkills, ...extractKnownSkills(jobText)])].slice(0, 30);
  const matchedSkills = targetSkills.filter((skill) => {
    const aliases = SKILL_ALIASES[skill] || [skill];
    return aliases.some((alias) => phraseExists(resumeText, alias));
  });
  const missingSkills = targetSkills.filter((skill) => !matchedSkills.includes(skill));

  const keywords = extractKeywords(`${opportunity.title || ""} ${opportunity.description || ""} ${(opportunity.responsibilities || []).join(" ")}`);
  const matchedKeywords = keywords.filter((keyword) => phraseExists(resumeText, keyword));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));

  const skillRatio = targetSkills.length ? matchedSkills.length / targetSkills.length : 0.5;
  const keywordRatio = keywords.length ? matchedKeywords.length / keywords.length : 0.5;
  const experienceText = normalize(flattenValues(resumeData.experience || resumeData.workExperience || resumeData.internships || []).join(" "));
  const experienceMatches = keywords.filter((keyword) => phraseExists(experienceText, keyword)).length;
  const experienceRatio = experienceText ? Math.min(1, 0.35 + experienceMatches / Math.max(1, keywords.length)) : 0;

  const contentChecks = [
    resumeData.summary || resumeData.objective,
    resumeData.skills,
    resumeData.education,
    resumeData.experience || resumeData.workExperience || resumeData.internships,
    resumeData.projects,
  ];
  const contentRatio = contentChecks.filter(hasItems).length / contentChecks.length;
  const actionVerbCount = ACTION_VERBS.filter((verb) => phraseExists(resumeText, verb)).length;
  const quantifiedEvidence = (resumeText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const impactRatio = Math.min(1, (actionVerbCount + Math.min(quantifiedEvidence, 5)) / 8);
  const personal = resumeData.personal || {};
  const readabilityRatio = [personal.fullName, personal.email, resumeData.summary, resumeData.skills]
    .filter(hasItems).length / 4;

  const sections = {
    skills: Math.round(skillRatio * 40),
    keywords: Math.round(keywordRatio * 25),
    experience: Math.round(experienceRatio * 15),
    completeness: Math.round(contentRatio * 10),
    impact: Math.round(impactRatio * 5),
    readability: Math.round(readabilityRatio * 5),
  };
  const overallScore = Object.values(sections).reduce((sum, value) => sum + value, 0);

  const suggestions = [];
  if (missingSkills.length) suggestions.push({
    priority: "high",
    section: "Skills",
    message: `If you genuinely know them, add evidence for: ${missingSkills.slice(0, 6).join(", ")}.`,
  });
  if (missingKeywords.length) suggestions.push({
    priority: "medium",
    section: "Keywords",
    message: `Use relevant job language naturally where it is truthful: ${missingKeywords.slice(0, 6).join(", ")}.`,
  });
  if (!resumeData.summary) suggestions.push({
    priority: "high", section: "Summary", message: "Add a concise role-specific professional summary.",
  });
  if (!experienceText && !hasItems(resumeData.projects)) suggestions.push({
    priority: "high", section: "Experience", message: "Add relevant projects, internships, or work evidence.",
  });
  if (impactRatio < 0.5) suggestions.push({
    priority: "medium", section: "Impact", message: "Start bullets with action verbs and add real measurable outcomes where available.",
  });
  if (!suggestions.length) suggestions.push({
    priority: "low", section: "Review", message: "Strong match. Proofread the tailored version before applying.",
  });

  return {
    overallScore,
    rating: overallScore >= 80 ? "Strong match" : overallScore >= 60 ? "Good match" : overallScore >= 40 ? "Partial match" : "Needs improvement",
    sections,
    sectionMaximums: { skills: 40, keywords: 25, experience: 15, completeness: 10, impact: 5, readability: 5 },
    matchedSkills,
    missingSkills,
    matchedKeywords,
    missingKeywords,
    suggestions,
    disclaimer: "CareerConnect match score is an estimate. Hiring platforms and employers may score resumes differently.",
  };
};

module.exports = { analyzeATSMatch, normalize, canonicalSkill };
