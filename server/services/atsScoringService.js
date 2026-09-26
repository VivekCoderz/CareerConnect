const SKILL_ALIASES = {
  javascript: ["javascript", "js", "es6"],
  typescript: ["typescript", "ts"],
  react: ["react", "reactjs", "react.js"],
  "next.js": ["next.js", "nextjs"],
  angular: ["angular", "angularjs"],
  vue: ["vue", "vuejs", "vue.js"],
  "node.js": ["node", "nodejs", "node.js"],
  express: ["express", "expressjs", "express.js"],
  python: ["python"],
  django: ["django"],
  flask: ["flask"],
  pandas: ["pandas"],
  numpy: ["numpy"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  tensorflow: ["tensorflow"],
  pytorch: ["pytorch", "torch"],
  java: ["java"],
  "c++": ["c++", "cpp"],
  "c#": ["c#", "csharp"],
  php: ["php"],
  sql: ["sql"],
  "data structures": ["data structures", "dsa"],
  algorithms: ["algorithms"],
  mongodb: ["mongodb", "mongo db"],
  mysql: ["mysql"],
  postgresql: ["postgresql", "postgres"],
  redis: ["redis"],
  aws: ["aws", "amazon web services"],
  azure: ["azure"],
  gcp: ["gcp", "google cloud"],
  docker: ["docker"],
  linux: ["linux"],
  kubernetes: ["kubernetes", "k8s"],
  git: ["git", "github", "gitlab"],
  html: ["html", "html5"],
  css: ["css", "css3"],
  tailwind: ["tailwind", "tailwind css"],
  bootstrap: ["bootstrap"],
  "rest api": ["rest api", "rest apis", "restful api", "restful apis", "restful services"],
  graphql: ["graphql"],
  firebase: ["firebase"],
  "machine learning": ["machine learning", "ml"],
  "data analysis": ["data analysis", "data analytics"],
  excel: ["excel", "microsoft excel"],
  powerbi: ["power bi", "powerbi"],
  tableau: ["tableau"],
  figma: ["figma"],
  flutter: ["flutter"],
  kotlin: ["kotlin"],
  swift: ["swift"],
  communication: ["communication", "communicating"],
  "problem solving": ["problem solving", "problem-solving"],
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
  const boundary = ["js", "ts"].includes(normalizedPhrase) ? "[^a-z0-9+#.]" : "[^a-z0-9+#]";
  return new RegExp(`(^|${boundary})${escaped}(${boundary}|$)`, "i").test(text);
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

const cleanJobDescriptionText = (value) => String(value || "")
  .replace(/\u0000/g, "")
  .replace(/\r\n?/g, "\n")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const inferJobTitle = (text) => {
  const cleaned = cleanJobDescriptionText(text);
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  const labelledTitle = lines.find((line) => /^(?:job\s*title|position|role)\s*[:\-–—]/i.test(line));
  if (labelledTitle) {
    return labelledTitle.replace(/^(?:job\s*title|position|role)\s*[:\-–—]\s*/i, "").slice(0, 150).trim();
  }

  const genericHeadings = /^(?:job description|about (?:us|the company|this role)|overview|responsibilities|requirements|qualifications)$/i;
  const likelyTitle = lines.find((line) => line.length >= 3 && line.length <= 100 && !genericHeadings.test(line));
  return (likelyTitle || "Target role").slice(0, 150);
};

const parseJobDescriptionText = (rawText) => {
  const description = cleanJobDescriptionText(rawText).slice(0, 15000);
  return {
    title: inferJobTitle(description),
    description,
    requiredSkills: extractKnownSkills(normalize(description)).slice(0, 50),
  };
};

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

const assessATSResumeFormat = (resumeData = {}) => {
  const issues = [];
  const personal = resumeData.personal || {};
  const summary = String(resumeData.summary || resumeData.objective || "").trim();
  const evidence = [
    ...(Array.isArray(resumeData.experience) ? resumeData.experience : []),
    ...(Array.isArray(resumeData.workExperience) ? resumeData.workExperience : []),
    ...(Array.isArray(resumeData.internships) ? resumeData.internships : []),
    ...(Array.isArray(resumeData.projects) ? resumeData.projects : []),
  ];

  if (!String(personal.fullName || "").trim()) issues.push("Add the candidate's full name to the header.");
  if (!String(personal.email || "").trim()) issues.push("Add a professional email address to the header.");
  if (summary.length < 30) issues.push("Add a concise professional summary of at least 30 characters.");
  if (!hasItems(resumeData.skills)) issues.push("Add a clearly labelled skills section.");
  if (!hasItems(resumeData.education)) issues.push("Add a clearly labelled education section.");
  if (!evidence.length) issues.push("Add at least one relevant project, internship, or work experience entry.");

  const entriesWithoutDetails = evidence.filter((entry) => {
    const description = entry?.description || entry?.bullets || entry?.responsibilities;
    return !hasItems(description);
  }).length;
  if (entriesWithoutDetails) {
    issues.push(`${entriesWithoutDetails} experience or project entr${entriesWithoutDetails === 1 ? "y needs" : "ies need"} achievement details.`);
  }

  return {
    isProperFormat: issues.length === 0,
    issues,
    checkedRules: [
      "Contact header",
      "Professional summary",
      "Skills section",
      "Education section",
      "Relevant evidence",
      "Detailed experience and project entries",
    ],
    note: "This assessment checks the structured resume content. The generated preview uses a single-column ATS-safe layout.",
  };
};

const countEntries = (resumeData = {}, keys = []) => keys.reduce((total, key) => (
  total + (Array.isArray(resumeData[key]) ? resumeData[key].length : 0)
), 0);

const countSkills = (resumeData = {}) => {
  const skills = resumeData.skills;
  if (Array.isArray(skills)) return skills.filter(Boolean).length;
  if (typeof skills === "string") return skills.split(/[,\n]/).filter((item) => item.trim()).length;
  if (!skills || typeof skills !== "object") return 0;
  return Object.values(skills).reduce((total, value) => {
    if (Array.isArray(value)) return total + value.filter(Boolean).length;
    if (typeof value === "string") return total + value.split(/[,\n]/).filter((item) => item.trim()).length;
    return total;
  }, 0);
};

const assessContentPreservation = (source = {}, candidate = {}) => {
  const sourcePersonal = source.personal || {};
  const candidatePersonal = candidate.personal || {};
  const checks = [
    ["experience and internships", countEntries(source, ["experience", "workExperience", "internships"]), countEntries(candidate, ["experience", "workExperience", "internships"])],
    ["projects", countEntries(source, ["projects"]), countEntries(candidate, ["projects"])],
    ["education", countEntries(source, ["education"]), countEntries(candidate, ["education"])],
    ["certifications", countEntries(source, ["certifications"]), countEntries(candidate, ["certifications"])],
    ["achievements", countEntries(source, ["achievements"]), countEntries(candidate, ["achievements"])],
    ["skills", countSkills(source), countSkills(candidate)],
  ];
  const missing = checks
    .filter(([, sourceCount, candidateCount]) => sourceCount > candidateCount)
    .map(([label, sourceCount, candidateCount]) => `${label}: retained ${candidateCount} of ${sourceCount}`);

  ["fullName", "email", "phone"].forEach((field) => {
    if (String(sourcePersonal[field] || "").trim() && !String(candidatePersonal[field] || "").trim()) {
      missing.push(`contact field: ${field}`);
    }
  });

  return {
    passed: missing.length === 0,
    missing,
    checks: checks.map(([label, sourceCount, candidateCount]) => ({ label, sourceCount, candidateCount })),
  };
};

const analyzeATSMatch = (resumeData, opportunity) => {
  const { tailoredMeta: _tailoredMeta, template: _template, ...scorableResume } = resumeData || {};
  const resumeText = normalize(flattenValues(scorableResume).join(" "));
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
  const experienceText = normalize(flattenValues([
    scorableResume.experience || [],
    scorableResume.workExperience || [],
    scorableResume.internships || [],
    scorableResume.projects || [],
  ]).join(" "));
  const experienceMatches = keywords.filter((keyword) => phraseExists(experienceText, keyword)).length;
  const experienceRatio = experienceText ? Math.min(1, 0.35 + experienceMatches / Math.max(1, keywords.length)) : 0;

  const contentChecks = [
    scorableResume.summary || scorableResume.objective,
    scorableResume.skills,
    scorableResume.education,
    scorableResume.experience || scorableResume.workExperience || scorableResume.internships,
    scorableResume.projects,
  ];
  const contentRatio = contentChecks.filter(hasItems).length / contentChecks.length;
  const actionVerbCount = ACTION_VERBS.filter((verb) => phraseExists(resumeText, verb)).length;
  const quantifiedEvidence = (resumeText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const impactRatio = Math.min(1, (actionVerbCount + Math.min(quantifiedEvidence, 5)) / 8);
  const personal = scorableResume.personal || {};
  const readabilityRatio = [personal.fullName, personal.email, scorableResume.summary, scorableResume.skills]
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
  if (!scorableResume.summary) suggestions.push({
    priority: "high", section: "Summary", message: "Add a concise role-specific professional summary.",
  });
  if (!experienceText && !hasItems(scorableResume.projects)) suggestions.push({
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

const MINIMUM_SCORE_IMPROVEMENT = 5;

const selectBestATSResume = (
  originalResume,
  tailoredCandidates,
  opportunity,
  targetScore = 80,
  minimumScoreImprovement = MINIMUM_SCORE_IMPROVEMENT
) => {
  const originalAnalysis = analyzeATSMatch(originalResume, opportunity);
  const originalFormat = assessATSResumeFormat(originalResume);
  const evaluated = (tailoredCandidates || [])
    .filter((candidate) => candidate?.data && typeof candidate.data === "object")
    .map((candidate) => ({
      ...candidate,
      analysis: analyzeATSMatch(candidate.data, opportunity),
      formatAssessment: assessATSResumeFormat(candidate.data),
      preservation: assessContentPreservation(originalResume, candidate.data),
    }));

  let best = {
    source: "original",
    data: originalResume,
    analysis: originalAnalysis,
    formatAssessment: originalFormat,
    preservation: { passed: true, missing: [], checks: [] },
  };
  evaluated.forEach((candidate) => {
    if (!candidate.preservation.passed || !candidate.formatAssessment.isProperFormat) return;
    const improvementFromOriginal = candidate.analysis.overallScore - originalAnalysis.overallScore;
    const scoreImproved = improvementFromOriginal >= minimumScoreImprovement
      && candidate.analysis.overallScore > best.analysis.overallScore;
    const formatImproved = candidate.analysis.overallScore >= originalAnalysis.overallScore
      && !originalFormat.isProperFormat
      && candidate.formatAssessment.isProperFormat;
    if (scoreImproved || formatImproved) best = candidate;
  });

  return {
    ...best,
    originalAnalysis,
    evaluatedCandidates: evaluated.map(({ source, analysis, formatAssessment, preservation }) => ({
      source,
      score: analysis.overallScore,
      formatAssessment,
      preservation,
    })),
    comparison: {
      originalScore: originalAnalysis.overallScore,
      tailoredScore: best.analysis.overallScore,
      targetScore,
      targetReached: best.analysis.overallScore >= targetScore,
      minimumScoreImprovement,
      scoreImprovement: best.analysis.overallScore - originalAnalysis.overallScore,
    },
  };
};

module.exports = {
  analyzeATSMatch,
  assessATSResumeFormat,
  assessContentPreservation,
  normalize,
  canonicalSkill,
  parseJobDescriptionText,
  selectBestATSResume,
  MINIMUM_SCORE_IMPROVEMENT,
  extractKnownSkills,
  extractKeywords,
  phraseExists,
};
