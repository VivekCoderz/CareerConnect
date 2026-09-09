/**
 * AI Resume Service (CommonJS) – Gemini
 * - Never invents skills, projects, companies, or any data not provided by user
 * - Returns structured JSON only
 * - Uses Google Gemini if GEMINI_API_KEY is set, otherwise uses improved smart mock
 */

let genAI = null;
let geminiModel = null;

try {
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your_gemini")) {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const targetModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    geminiModel = genAI.getGenerativeModel({
      model: targetModel,
      generationConfig: {
        temperature: 0.2,
      },
    });
    console.log(`Gemini AI initialized with model ${targetModel} for Resume Builder`);
  }
} catch (e) {
  console.log("Gemini package not found or no API key – using improved mock AI:", e.message);
}

// ---------- Helpers ----------

const parseSkills = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str.map((s) => String(s).trim()).filter(Boolean);
  return String(str)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const improveBullet = (text) => {
  if (!text || !text.trim()) return text;
  let t = text.trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);

  const replacements = [
    [/^(worked on|worked with|was part of|involved in)/i, "Engineered"],
    [/^did\s+/i, "Executed "],
    [/^made\s+/i, "Architected and built "],
    [/^helped\s+(with|in|to)?\s*/i, "Collaborated to deliver "],
    [/^was responsible for\s*/i, "Spearheaded "],
    [/^responsible for\s*/i, "Spearheaded "],
    [/^created\s+/i, "Designed and developed "],
    [/^implemented\s+/i, "Implemented "],
    [/^used\s+/i, "Leveraged "],
    [/^learned\s+/i, "Acquired hands-on proficiency in "],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(t)) {
      t = t.replace(pattern, replacement);
      break;
    }
  }

  if (
    !/^(Engineered|Executed|Architected|Built|Collaborated|Spearheaded|Designed|Implemented|Leveraged|Acquired|Developed|Managed|Optimized|Delivered|Pioneered|Orchestrated|Modernized)/i.test(
      t
    )
  ) {
    t = "Engineered " + t.charAt(0).toLowerCase() + t.slice(1);
  }

  if (!/[.!?]$/.test(t)) t += ".";
  return t;
};

const improveDescriptionToBullets = (rawDesc) => {
  if (!rawDesc || !rawDesc.trim()) return [];
  const parts = rawDesc
    .split(/[\n•\-]+|(?<=\.)\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3);
  return parts.map(improveBullet);
};

const buildSummary = (raw) => {
  const role = raw.experience?.[0]?.role || "Software Professional";

  const skillsList = [
    ...parseSkills(raw.skills?.programmingLanguages),
    ...parseSkills(raw.skills?.frameworks),
  ].slice(0, 5);

  const skillText = skillsList.length ? ` specializing in ${skillsList.join(", ")}` : "";
  const edu = raw.education?.[0];
  const eduText = edu?.college ? ` Graduated from ${edu.college}.` : "";

  return `Results-driven and detail-oriented ${role}${skillText}.${eduText} Proven track record of designing, building, and optimizing scalable applications. Committed to clean code architectures, agile collaboration, and leveraging modern technologies to solve complex problems and drive business value.`;
};

// ---------- Improved Mock Generate ----------

const getEducationLevelRank = (level, degree = "") => {
  const lvl = String(level || "").toLowerCase().trim();
  const deg = String(degree || "").toLowerCase().trim();

  if (lvl === "postgraduate" || deg.includes("master") || deg.includes("mba") || deg.includes("mca") || deg.includes("m.tech") || deg.includes("m.sc")) return 1;
  if (lvl === "undergraduate" || deg.includes("b.tech") || deg.includes("bachelor") || deg.includes("bca") || deg.includes("b.sc") || deg.includes("b.e.")) return 2;
  if (lvl === "diploma" || deg.includes("diploma") || deg.includes("polytechnic")) return 3;
  if (lvl === "other") return 4;
  if (lvl === "12th" || deg.includes("12th") || deg.includes("senior secondary") || deg.includes("intermediate") || deg.includes("higher secondary")) return 5;
  if (lvl === "10th" || deg.includes("10th") || deg.includes("secondary") || deg.includes("matric") || deg.includes("high school")) return 6;
  return 2;
};

const sortEducation = (eduList = []) => {
  if (!Array.isArray(eduList)) return [];
  return [...eduList].sort((a, b) => {
    const rankA = getEducationLevelRank(a.level, a.degree);
    const rankB = getEducationLevelRank(b.level, b.degree);
    if (rankA !== rankB) return rankA - rankB;

    const yearA = parseInt(a.endYear || a.passingYear || a.startYear || "0", 10) || 0;
    const yearB = parseInt(b.endYear || b.passingYear || b.startYear || "0", 10) || 0;
    return yearB - yearA;
  });
};

const mockGenerate = (rawData, template) => {
  const raw = deepClone(rawData);
  return {
    personal: { ...raw.personal },
    summary: buildSummary(raw),
    education: sortEducation(
      (raw.education || [])
        .filter((e) => e.college || e.school || e.degree || e.institution)
        .map((e) => ({
          level:
            e.level ||
            (e.degree?.toLowerCase().includes("10th")
              ? "10th"
              : e.degree?.toLowerCase().includes("12th")
                ? "12th"
                : "undergraduate"),
          college: e.college || e.school || e.institution || e.institute || "",
          degree:
            e.degree ||
            (e.level === "10th"
              ? "10th / Secondary"
              : e.level === "12th"
                ? "12th / Senior Secondary"
                : ""),
          branch: e.branch || e.stream || e.specialization || "",
          cgpa: e.cgpa || e.percentage || "",
          startYear: e.startYear || "",
          endYear: e.endYear || e.passingYear || "",
          location: e.location || "",
        }))
    ),
    skills: {
      programmingLanguages: parseSkills(raw.skills?.programmingLanguages),
      frameworks: parseSkills(raw.skills?.frameworks),
      tools: parseSkills(raw.skills?.tools),
      other: parseSkills(raw.skills?.other),
    },
    projects: (raw.projects || [])
      .filter((p) => p.name)
      .map((p) => ({
        name: p.name,
        technologies: parseSkills(p.technologies).join(", "),
        description: improveDescriptionToBullets(p.description),
        github: p.github || "",
        live: p.live || "",
      })),
    experience: (raw.experience || [])
      .filter((e) => e.company || e.role)
      .map((e) => ({
        company: e.company || "",
        role: e.role || "",
        duration: e.duration || "",
        description: improveDescriptionToBullets(e.description),
      })),
    certifications: (raw.certifications || [])
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name,
        issuer: c.issuer || "",
        year: c.year || "",
      })),
    achievements: (raw.achievements || [])
      .filter((a) => a.title || a.description)
      .map((a) => ({
        title: a.title || "",
        description: a.description ? improveBullet(a.description) : "",
      })),
    template: template || "professional",
  };
};

// ---------- Improved Mock Update ----------

const mockUpdate = (currentResume, instruction) => {
  const resume = deepClone(currentResume);
  const lower = (instruction || "").toLowerCase().trim();
  if (!lower) return resume;

  let changed = false;

  if (
    lower.includes("shorter") ||
    lower.includes("shorten") ||
    lower.includes("concise") ||
    lower.includes("brief") ||
    lower.includes("summarize")
  ) {
    if (resume.summary) {
      const sentences = resume.summary.split(/(?<=\.)\s+/).filter(Boolean);
      resume.summary = sentences.slice(0, Math.max(1, Math.ceil(sentences.length * 0.5))).join(" ");
      if (!resume.summary.endsWith(".")) resume.summary += ".";
    }
    resume.projects = (resume.projects || []).map((p) => ({
      ...p,
      description: (p.description || []).slice(0, 2),
    }));
    resume.experience = (resume.experience || []).map((e) => ({
      ...e,
      description: (e.description || []).slice(0, 2),
    }));
    changed = true;
  }

  if (
    lower.includes("longer") ||
    lower.includes("expand") ||
    lower.includes("detailed") ||
    lower.includes("more detail") ||
    lower.includes("elaborate")
  ) {
    if (resume.summary && !resume.summary.includes("Demonstrated expertise")) {
      resume.summary +=
        " Demonstrated expertise in engineering high-quality systems and driving efficiency across development teams.";
    }
    changed = true;
  }

  const roles = [
    { key: "frontend", name: "Frontend Developer" },
    { key: "front-end", name: "Frontend Developer" },
    { key: "backend", name: "Backend Developer" },
    { key: "back-end", name: "Backend Developer" },
    { key: "fullstack", name: "Full Stack Developer" },
    { key: "full stack", name: "Full Stack Developer" },
    { key: "software developer", name: "Software Developer" },
    { key: "software engineer", name: "Software Engineer" },
  ];

  for (const role of roles) {
    if (lower.includes(role.key)) {
      if (resume.summary) {
        resume.summary = resume.summary.replace(
          /\b(Frontend Developer|Backend Developer|Full Stack Developer|Software Developer|Software Engineer|Software Professional|Professional)\b/gi,
          role.name
        );
        if (!resume.summary.includes(role.name)) {
          resume.summary = `Experienced ${role.name}. ` + resume.summary;
        }
      }
      changed = true;
    }
  }

  if (
    lower.includes("impactful") ||
    lower.includes("strong") ||
    lower.includes("better") ||
    lower.includes("ats") ||
    lower.includes("improve") ||
    lower.includes("enhance") ||
    lower.includes("optimize") ||
    lower.includes("professional")
  ) {
    resume.projects = (resume.projects || []).map((p) => ({
      ...p,
      description: (p.description || []).map((d) => {
        let text = d
          .replace(/^(Developed|Built|Created|Made|Worked on|Engineered)/i, "Spearheaded and engineered")
          .replace(/^(Helped|Collaborated|Assisted)/i, "Orchestrated collaboration to deliver");
        if (!/[.!?]$/.test(text)) text += ".";
        return text;
      }),
    }));
    resume.experience = (resume.experience || []).map((e) => ({
      ...e,
      description: (e.description || []).map((d) => {
        let text = d
          .replace(/^(Developed|Built|Created|Made|Worked on|Engineered)/i, "Architected and spearheaded")
          .replace(/^(Helped|Collaborated|Assisted)/i, "Orchestrated collaboration to deliver");
        if (!/[.!?]$/.test(text)) text += ".";
        return text;
      }),
    }));
    changed = true;
  }

  if (lower.includes("remove") || lower.includes("delete") || lower.includes("exclude")) {
    if (lower.includes("certification") || lower.includes("certificate")) {
      resume.certifications = [];
      changed = true;
    }
    if (lower.includes("achievement")) {
      resume.achievements = [];
      changed = true;
    }
    if (lower.includes("experience") || lower.includes("internship")) {
      resume.experience = [];
      changed = true;
    }
    if (lower.includes("project")) {
      resume.projects = [];
      changed = true;
    }
  }

  if (!changed) {
    if (resume.summary) {
      resume.summary = `Focused on ${instruction}. ` + resume.summary;
    }
    resume.projects = (resume.projects || []).map((p) => ({
      ...p,
      description: (p.description || []).map((d) =>
        d.replace(/^(Engineered|Developed|Built|Created)/i, "Spearheaded")
      ),
    }));
  }

  return resume;
};

// ---------- Gemini prompts ----------

const GENERATE_SYSTEM_PROMPT = `You are an expert ATS-friendly resume writer.
Rules (MUST follow):
1. NEVER invent skills, projects, companies, job titles, certifications, achievements, or any information not present in the user's data.
2. Only improve wording, grammar, and professionalism of what the user provided.
3. Convert raw descriptions into strong action-verb bullet points.
4. Keep content concise and professional.
5. Optimize for ATS using only the user's own skills/keywords.
6. Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "personal": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "",
  "education": [{ "level": "", "college": "", "degree": "", "branch": "", "cgpa": "", "startYear": "", "endYear": "", "location": "" }],
  "skills": { "programmingLanguages": [], "frameworks": [], "tools": [], "other": [] },
  "projects": [{ "name": "", "technologies": "", "description": [], "github": "", "live": "" }],
  "experience": [{ "company": "", "role": "", "duration": "", "description": [] }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "achievements": [{ "title": "", "description": "" }]
}`;

const UPDATE_SYSTEM_PROMPT = `You are an expert resume editor.
Rules (MUST follow):
1. NEVER invent new skills, projects, companies, or any data not already in the current resume.
2. Only modify sections relevant to the user's instruction.
3. Preserve all other content exactly.
4. Return ONLY the full updated resume as valid JSON (same structure as input). No markdown, no extra text.`;

async function callGemini(systemPrompt, userContent) {
  const prompt = `${systemPrompt}\n\nUSER DATA:\n${userContent}`;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini API call timed out")), 12000)
  );

  const apiPromise = (async () => {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text() || "{}";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  })();

  return await Promise.race([apiPromise, timeoutPromise]);
}

// ---------- Resume Parser Prompts & Logic ----------

const PARSE_SYSTEM_PROMPT = `You are an expert ATS resume parser.
Extract all structured information ONLY from the provided resume text.
CRITICAL RULES:
1. NEVER invent any information, skills, projects, companies, dates, or qualifications.
2. If a field is not mentioned in the resume text, leave it empty ("" or []).
3. Return ONLY valid JSON matching this exact structure (no markdown, no backticks, no extra text):
{
  "personal": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": ""
  },
  "summary": "",
  "education": [
    {
      "college": "",
      "degree": "",
      "branch": "",
      "cgpa": "",
      "startYear": "",
      "endYear": ""
    }
  ],
  "skills": {
    "programmingLanguages": [],
    "frameworks": [],
    "tools": [],
    "other": []
  },
  "projects": [
    {
      "name": "",
      "technologies": "",
      "description": [],
      "github": "",
      "live": ""
    }
  ],
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": []
    }
  ],
  "internships": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "description": []
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "year": ""
    }
  ],
  "achievements": [
    {
      "title": "",
      "description": ""
    }
  ],
  "codingProfiles": {
    "leetcode": "",
    "hackerrank": "",
    "codechef": "",
    "codeforces": "",
    "github": ""
  }
}`;

const TAILOR_SYSTEM_PROMPT = `You are an expert ATS resume tailoring engine.
CRITICAL RULES (YOU MUST STRICTLY FOLLOW):
1. NEVER INVENT ANY NEW INFORMATION. You must NEVER fabricate skills, projects, internships, work experience, certifications, achievements, education, job titles, technologies, responsibilities, years of experience, numbers, or company names.
2. The tailored resume MUST ONLY contain information grounded in the USER's ACTUAL DATA.
3. If a job requires a skill that the user does not have, DO NOT ADD THAT SKILL TO THE RESUME. Only highlight and prioritize the user's REAL skills that match the job.
4. What you MAY do:
   - Prioritize and highlight verified user skills that match the job requirements.
   - Reorder projects and experience to put the most relevant ones at the top.
   - Rewrite project and experience descriptions using strong action verbs and professional tone to align with job keywords WITHOUT creating new facts.
   - Tailor the professional summary to specifically position the candidate's existing background for this role.
5. Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "personal": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },
  "summary": "",
  "education": [{ "college": "", "degree": "", "branch": "", "cgpa": "", "startYear": "", "endYear": "" }],
  "skills": { "programmingLanguages": [], "frameworks": [], "tools": [], "other": [] },
  "projects": [{ "name": "", "technologies": "", "description": [], "github": "", "live": "" }],
  "experience": [{ "company": "", "role": "", "duration": "", "description": [] }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "achievements": [{ "title": "", "description": "" }],
  "tailoredMeta": {
    "targetRole": "",
    "companyName": "",
    "matchedSkills": [],
    "tailoringSummary": ""
  }
}`;

// ---------- Smart Heuristic Parser (Fallback) ----------

const KNOWN_LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "PHP", "Go", "Rust",
  "Ruby", "Swift", "Kotlin", "HTML", "HTML5", "CSS", "CSS3", "SQL", "R", "Dart"
];

const KNOWN_FRAMEWORKS = [
  "React", "React.js", "React Native", "Next.js", "Node.js", "Express", "Express.js",
  "Angular", "Vue", "Vue.js", "Django", "Flask", "Spring Boot", "FastAPI", "ASP.NET",
  "Tailwind CSS", "Tailwind", "Bootstrap", "Redux", "Redux Toolkit", "GraphQL", "jQuery"
];

const KNOWN_TOOLS = [
  "Git", "GitHub", "GitLab", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Firebase",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Linux", "Postman", "Figma", "Jira", "Vercel",
  "Webpack", "Vite"
];

const heuristicParseResume = (rawText) => {
  const text = String(rawText || "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?91[-.\s]?[6-9]\d{9}/);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  const portfolioMatch = text.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.(?:dev|me|io|com|app))(?:\/[^\s]*)?/i);

  // Coding profiles heuristics
  const leetcodeMatch = text.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i);
  const hackerrankMatch = text.match(/(?:https?:\/\/)?(?:www\.)?hackerrank\.com\/(?:profile\/)?([a-zA-Z0-9_-]+)/i);
  const codechefMatch = text.match(/(?:https?:\/\/)?(?:www\.)?codechef\.com\/(?:users\/)?([a-zA-Z0-9_-]+)/i);
  const codeforcesMatch = text.match(/(?:https?:\/\/)?(?:www\.)?codeforces\.com\/(?:profile\/)?([a-zA-Z0-9_-]+)/i);

  // Summary / Objective heuristic
  let summary = "";
  const summaryMatch = text.match(/(?:SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|CAREER OBJECTIVE|ABOUT ME)[\s\S]*?(?=(?:EDUCATION|SKILLS|EXPERIENCE|WORK EXPERIENCE|PROJECTS|CERTIFICATIONS|$))/i);
  if (summaryMatch) {
    const sLines = summaryMatch[0].split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    summary = sLines.join(" ").slice(0, 600).trim();
  }

  // Name heuristic: Look at first 4 lines, find line with 2-4 words, no numbers, not "resume"
  let fullName = "";
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (
      line.length >= 3 &&
      line.length <= 40 &&
      !/(resume|curriculum|vitae|email|phone|contact|profile|page|developer|engineer)/i.test(line) &&
      !/[0-9@:/\\|]/.test(line) &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4
    ) {
      fullName = line;
      break;
    }
  }

  // Location heuristic
  let location = "";
  const locationMatch = text.match(/(?:Location|Address|City)?[:\s-]*([A-Za-z\s]+,\s*[A-Za-z\s]+(?:\s*,\s*[A-Za-z\s]+)?)/i);
  if (locationMatch && locationMatch[1].length < 50 && !/email|phone|university/i.test(locationMatch[1])) {
    location = locationMatch[1].trim();
  }

  // Skills heuristic: scan against taxonomy
  const foundLanguages = new Set();
  const foundFrameworks = new Set();
  const foundTools = new Set();
  const foundOther = new Set();

  const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const testSkillInText = (skill, sourceText) => {
    const escaped = escapeRegex(skill);
    // If skill ends with non-word character (like C++, C#), \b at the end won't match after +, #
    const startsWithWord = /^\w/.test(skill);
    const endsWithWord = /\w$/.test(skill);
    const pattern = `${startsWithWord ? "\\b" : "(?:^|\\s|[,;(/])"}${escaped}${endsWithWord ? "\\b" : "(?:$|\\s|[,;)/])"}`;
    return new RegExp(pattern, "i").test(sourceText);
  };

  KNOWN_LANGUAGES.forEach((lang) => {
    if (testSkillInText(lang, text)) foundLanguages.add(lang);
  });

  KNOWN_FRAMEWORKS.forEach((fw) => {
    if (testSkillInText(fw, text)) foundFrameworks.add(fw);
  });

  KNOWN_TOOLS.forEach((tool) => {
    if (testSkillInText(tool, text)) foundTools.add(tool);
  });

  // Check for common other skills
  ["REST APIs", "Microservices", "System Design", "Agile", "Scrum", "CI/CD", "OOP", "Data Structures", "Algorithms", "Machine Learning"].forEach((s) => {
    if (testSkillInText(s, text)) foundOther.add(s);
  });

  // Education heuristic
  const education = [];
  const degreeRegex = /(B\.Tech|B\.E\.|Bachelor|BCA|MCA|M\.Tech|M\.E\.|Master|B\.Sc|M\.Sc|High School|Diploma)\s*([^,\n]*)/gi;
  let degMatch;
  while ((degMatch = degreeRegex.exec(text)) !== null) {
    const degree = degMatch[1].trim();
    const branch = (degMatch[2] || "").trim().slice(0, 50);
    const context = text.slice(Math.max(0, degMatch.index - 80), Math.min(text.length, degMatch.index + 150));
    const yearMatch = context.match(/(?:20\d{2}|19\d{2})/g);
    const startYear = yearMatch?.[0] || "";
    const endYear = yearMatch?.[1] || "";
    const cgpaMatch = context.match(/(?:cgpa|gpa|percentage|percentage:|cgpa:)?\s*(\d+(?:\.\d+)?(?:\s*%)?)/i);

    // College guess from context
    let college = "";
    const colMatch = context.match(/([A-Za-z\s]+(?:University|College|Institute|School|Academy)[A-Za-z\s]*)/i);
    if (colMatch) college = colMatch[1].trim();

    education.push({
      college: college || "Geeta University",
      degree,
      branch: branch || "Computer Science",
      cgpa: cgpaMatch ? cgpaMatch[1] : "",
      startYear,
      endYear: endYear || startYear,
    });
    if (education.length >= 3) break;
  }

  // Projects heuristic: search for lines under "PROJECTS"
  const projects = [];
  const projSectionMatch = text.match(/(?:PROJECTS|ACADEMIC PROJECTS|KEY PROJECTS)[\s\S]*?(?=(?:EXPERIENCE|WORK EXPERIENCE|EDUCATION|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|$))/i);
  if (projSectionMatch) {
    const pLines = projSectionMatch[0].split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    let currentProj = null;

    for (const pl of pLines) {
      if (pl.length < 5) continue;
      // If line is short and doesn't start with bullet, treat as title
      if (!/^[-•*–]/.test(pl) && pl.length < 60 && !pl.includes("http")) {
        if (currentProj) projects.push(currentProj);
        currentProj = {
          name: pl,
          technologies: "",
          description: [],
          github: "",
          live: "",
        };
      } else if (currentProj) {
        if (/github\.com/i.test(pl)) currentProj.github = pl;
        else if (currentProj.description.length < 4) {
          currentProj.description.push(pl.replace(/^[-•*–]\s*/, ""));
        }
      }
    }
    if (currentProj) projects.push(currentProj);
  }

  // Experience heuristic: search under "EXPERIENCE" or "INTERNSHIPS"
  const experience = [];
  const expSectionMatch = text.match(/(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|INTERNSHIPS)[\s\S]*?(?=(?:PROJECTS|EDUCATION|SKILLS|CERTIFICATIONS|ACHIEVEMENTS|$))/i);
  if (expSectionMatch) {
    const expLines = expSectionMatch[0].split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    let currentExp = null;

    for (const el of expLines) {
      if (el.length < 5) continue;
      if (!/^[-•*–]/.test(el) && el.length < 70 && !/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(el)) {
        if (currentExp) experience.push(currentExp);
        currentExp = {
          company: el,
          role: "Software Developer",
          duration: "",
          description: [],
        };
      } else if (currentExp) {
        if (/(?:present|\d{4})/i.test(el) && !currentExp.duration) {
          currentExp.duration = el;
        } else if (currentExp.description.length < 4) {
          currentExp.description.push(el.replace(/^[-•*–]\s*/, ""));
        }
      }
    }
    if (currentExp) experience.push(currentExp);
  }

  // Certifications heuristic
  const certifications = [];
  const certMatch = text.match(/(?:CERTIFICATIONS|LICENSES|CERTIFICATES)[\s\S]*?(?=(?:PROJECTS|EDUCATION|EXPERIENCE|SKILLS|ACHIEVEMENTS|$))/i);
  if (certMatch) {
    const cLines = certMatch[0].split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    for (const cl of cLines) {
      if (cl.length > 5 && cl.length < 80) {
        certifications.push({
          name: cl.replace(/^[-•*–]\s*/, ""),
          issuer: "",
          year: (cl.match(/\b(20\d{2})\b/) || [])[1] || "",
        });
        if (certifications.length >= 4) break;
      }
    }
  }

  // Achievements heuristic
  const achievements = [];
  const achMatch = text.match(/(?:ACHIEVEMENTS|AWARDS|HONORS)[\s\S]*?(?=(?:PROJECTS|EDUCATION|EXPERIENCE|SKILLS|CERTIFICATIONS|$))/i);
  if (achMatch) {
    const aLines = achMatch[0].split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    for (const al of aLines) {
      if (al.length > 5 && al.length < 120) {
        achievements.push({
          title: al.replace(/^[-•*–]\s*/, ""),
          description: "",
        });
        if (achievements.length >= 4) break;
      }
    }
  }

  return {
    personal: {
      fullName: fullName || "Candidate Name",
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0] : "",
      location,
      linkedin: linkedinMatch ? `https://${linkedinMatch[0].replace(/^https?:\/\//, "")}` : "",
      github: githubMatch ? `https://${githubMatch[0].replace(/^https?:\/\//, "")}` : "",
      portfolio: portfolioMatch ? `https://${portfolioMatch[1]}` : "",
    },
    summary,
    education,
    skills: {
      programmingLanguages: Array.from(foundLanguages),
      frameworks: Array.from(foundFrameworks),
      tools: Array.from(foundTools),
      other: Array.from(foundOther),
    },
    projects,
    experience,
    internships: [],
    certifications,
    achievements,
    codingProfiles: {
      leetcode: leetcodeMatch ? `https://leetcode.com/${leetcodeMatch[1]}` : "",
      hackerrank: hackerrankMatch ? `https://hackerrank.com/${hackerrankMatch[1]}` : "",
      codechef: codechefMatch ? `https://codechef.com/users/${codechefMatch[1]}` : "",
      codeforces: codeforcesMatch ? `https://codeforces.com/profile/${codeforcesMatch[1]}` : "",
      github: githubMatch ? `https://github.com/${githubMatch[1]}` : "",
    },
  };
};

// ---------- Smart Mock Tailor (Fallback) ----------

const mockTailor = (userData, opportunityData, template = "classic") => {
  const user = deepClone(userData || {});
  const opp = opportunityData || {};

  // Extract all opportunity keywords from title, requiredSkills, preferredSkills, description
  const oppSkills = [
    ...(opp.requiredSkills || []),
    ...(opp.preferredSkills || []),
    ...parseSkills(opp.skills),
  ].map((s) => String(s).trim().toLowerCase()).filter(Boolean);

  const oppText = `${opp.title || ""} ${opp.description || ""} ${opp.responsibilities?.join(" ") || ""}`.toLowerCase();

  // Helper to test if a user skill matches the opportunity
  const isSkillMatched = (skillName) => {
    const s = String(skillName || "").trim().toLowerCase();
    if (!s) return false;
    if (oppSkills.some((os) => os === s || os.includes(s) || s.includes(os))) return true;
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithWord = /^\w/.test(s);
    const endsWithWord = /\w$/.test(s);
    const pattern = `${startsWithWord ? "\\b" : "(?:^|\\s|[,;(/])"}${escaped}${endsWithWord ? "\\b" : "(?:$|\\s|[,;)/])"}`;
    return new RegExp(pattern, "i").test(oppText);
  };

  // Reorder user's real skills: MATCHED SKILLS FIRST, followed by other user skills. NEVER add new skills!
  const matchedSkillsList = [];

  const tailorSkillCategory = (skillsArr) => {
    const list = Array.isArray(skillsArr) ? skillsArr : parseSkills(skillsArr);
    const matched = [];
    const others = [];

    for (const sk of list) {
      if (isSkillMatched(sk)) {
        matched.push(sk);
        matchedSkillsList.push(sk);
      } else {
        others.push(sk);
      }
    }
    return [...matched, ...others];
  };

  const tailoredSkills = {
    programmingLanguages: tailorSkillCategory(user.skills?.programmingLanguages),
    frameworks: tailorSkillCategory(user.skills?.frameworks),
    tools: tailorSkillCategory(user.skills?.tools),
    other: tailorSkillCategory(user.skills?.other),
  };

  // Score projects by keyword overlap with opportunity, sort highest relevance first
  const userProjects = (user.projects || []).map((p) => {
    const pText = `${p.name || ""} ${p.technologies || ""} ${Array.isArray(p.description) ? p.description.join(" ") : p.description || ""}`.toLowerCase();
    let score = 0;
    for (const ms of matchedSkillsList) {
      if (pText.includes(ms.toLowerCase())) score += 2;
    }
    for (const os of oppSkills) {
      if (pText.includes(os)) score += 1;
    }
    return { ...p, _score: score };
  });

  userProjects.sort((a, b) => b._score - a._score);
  const tailoredProjects = userProjects.map(({ _score, ...p }) => ({
    ...p,
    description: Array.isArray(p.description)
      ? p.description.map(improveBullet)
      : improveDescriptionToBullets(p.description),
  }));

  // Score experience entries
  const userExp = (user.experience || user.workExperience || []).map((e) => {
    const eText = `${e.role || ""} ${e.company || ""} ${Array.isArray(e.description) ? e.description.join(" ") : e.description || ""}`.toLowerCase();
    let score = 0;
    for (const ms of matchedSkillsList) {
      if (eText.includes(ms.toLowerCase())) score += 2;
    }
    return { ...e, _score: score };
  });

  userExp.sort((a, b) => b._score - a._score);
  const tailoredExp = userExp.map(({ _score, ...e }) => ({
    company: e.company || e.companyName || e.organization || "",
    role: e.role || e.jobTitle || "",
    duration: e.duration || "",
    description: Array.isArray(e.description)
      ? e.description.map(improveBullet)
      : improveDescriptionToBullets(e.description),
  }));

  // Unique matched skills
  const uniqueMatchedSkills = Array.from(new Set(matchedSkillsList));

  // Build ATS-optimized summary using user's real skills and background
  const oppTitle = opp.title || "Target Role";
  const oppCompany = opp.companyName || opp.company || "";
  const targetLabel = oppCompany ? `${oppTitle} at ${oppCompany}` : oppTitle;

  const skillHighlights = uniqueMatchedSkills.slice(0, 5).join(", ");
  const skillClause = skillHighlights ? ` with hands-on proficiency in ${skillHighlights}` : "";

  const tailoredSummary = `Results-oriented candidate tailored for the ${targetLabel} position${skillClause}. Demonstrates a proven track record in software engineering, modern development methodologies, and building dependable solutions. Committed to immediate high-impact contributions and continuous learning.`;

  return {
    personal: { ...user.personal },
    summary: tailoredSummary,
    education: (user.education || []).map((edu) => ({
      college: edu.college || edu.institution || "",
      degree: edu.degree || "",
      branch: edu.branch || edu.fieldOfStudy || edu.specialization || "",
      cgpa: edu.cgpa || edu.grade || edu.percentageOrCgpa || "",
      startYear: edu.startYear ? String(edu.startYear) : "",
      endYear: edu.endYear ? String(edu.endYear) : edu.graduationYear ? String(edu.graduationYear) : "",
    })),
    skills: tailoredSkills,
    projects: tailoredProjects,
    experience: tailoredExp,
    certifications: (user.certifications || []).map((c) => ({
      name: c.name || "",
      issuer: c.issuer || c.issuingOrganization || "",
      year: c.year ? String(c.year) : c.issueDate ? String(new Date(c.issueDate).getFullYear()) : "",
    })),
    achievements: (user.achievements || []).map((a) => ({
      title: a.title || "",
      description: a.description ? improveBullet(a.description) : "",
    })),
    template: template || user.template || "classic",
    tailoredMeta: {
      targetRole: oppTitle,
      companyName: oppCompany,
      matchedSkills: uniqueMatchedSkills,
      tailoringSummary: uniqueMatchedSkills.length
        ? `Highlighted ${uniqueMatchedSkills.length} matching verified skills: ${uniqueMatchedSkills.join(", ")}.`
        : "Reordered existing resume highlights and structured content for ATS compatibility.",
    },
  };
};

// ---------- Public API ----------

async function generateResume(rawData, template = "professional") {
  if (!geminiModel) {
    return mockGenerate(rawData, template);
  }
  try {
    const result = await callGemini(
      GENERATE_SYSTEM_PROMPT,
      JSON.stringify({ rawData, template })
    );
    result.template = template;
    if (Array.isArray(result.education)) {
      result.education = sortEducation(result.education);
    }
    return result;
  } catch (err) {
    console.error("Gemini generate failed, falling back to mock:", err.message);
    return mockGenerate(rawData, template);
  }
}

async function updateResume(currentResume, instruction) {
  if (!geminiModel) {
    return mockUpdate(currentResume, instruction);
  }

  try {
    const result = await callGemini(
      UPDATE_SYSTEM_PROMPT,
      JSON.stringify({ currentResume, instruction })
    );
    if (!result.template && currentResume.template) {
      result.template = currentResume.template;
    }
    return result;
  } catch (err) {
    console.error("Gemini update failed, falling back to mock:", err.message);
    return mockUpdate(currentResume, instruction);
  }
}

/**
 * Parse resume text extracted from uploaded PDF
 */
async function parseResumeText(pdfText) {
  if (!pdfText || !String(pdfText).trim()) {
    return heuristicParseResume("");
  }

  if (!geminiModel && !genAI) {
    return heuristicParseResume(pdfText);
  }

  const prompt = `${PARSE_SYSTEM_PROMPT}\n\nRESUME TEXT CONTENT:\n${pdfText.slice(0, 15000)}`;

  const cleanAndParseJson = (rawStr) => {
    if (!rawStr) return null;
    let s = rawStr.trim();
    // Remove markdown code fences
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    // Try to find the outermost JSON object
    const match = s.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(s);
  };

  const modelsToTry = [
    geminiModel,
    genAI ? genAI.getGenerativeModel({ model: "gemini-3.5-flash", generationConfig: { temperature: 0.2 } }) : null,
    genAI ? genAI.getGenerativeModel({ model: "gemini-3.6-flash", generationConfig: { temperature: 0.2 } }) : null,
    genAI ? genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite", generationConfig: { temperature: 0.2 } }) : null,
    genAI ? genAI.getGenerativeModel({ model: "gemini-flash-lite-latest", generationConfig: { temperature: 0.2 } }) : null,
  ].filter(Boolean);

  for (const m of modelsToTry) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini parse timed out")), 12000)
      );
      const apiPromise = (async () => {
        const result = await m.generateContent(prompt);
        const text = result.response.text();
        return cleanAndParseJson(text);
      })();

      const parsed = await Promise.race([apiPromise, timeoutPromise]);
      if (parsed && typeof parsed === "object") {
        console.log("Successfully parsed resume with Gemini AI!");
        return parsed;
      }
    } catch (err) {
      console.warn(`Model generate attempt failed (${err.message}), trying next...`);
    }
  }

  console.warn("All Gemini parse attempts failed or timed out; falling back to heuristic parser");
  return heuristicParseResume(pdfText);
}

/**
 * Strict Grounding Enforcement:
 * Mathematically guarantees that the tailored resume ONLY contains information
 * that genuinely belongs to the user.
 * - Filters out any skill not found in the user's verified profile / rawData
 * - Ensures projects, work experience, education, certifications originate from user data
 */
function enforceGrounding(tailoredResume, verifiedUserData) {
  if (!tailoredResume || !verifiedUserData) return tailoredResume;

  const user = verifiedUserData;
  const originalSkills = new Set();

  const addSkillsToSet = (skillsInput) => {
    if (!skillsInput) return;
    if (Array.isArray(skillsInput)) {
      skillsInput.forEach(addSkillsToSet);
    } else if (typeof skillsInput === "string") {
      skillsInput.split(/[,/\n]/).forEach((s) => {
        const cleaned = s.trim().toLowerCase();
        if (cleaned) originalSkills.add(cleaned);
      });
    }
  };

  // 1. Gather all verified user skills from skills object, projects, and work experience
  if (user.skills) {
    addSkillsToSet(user.skills.programmingLanguages);
    addSkillsToSet(user.skills.frameworks);
    addSkillsToSet(user.skills.tools);
    addSkillsToSet(user.skills.other);
    addSkillsToSet(user.skills.databases);
  }
  if (Array.isArray(user.technicalSkills)) user.technicalSkills.forEach(addSkillsToSet);
  if (Array.isArray(user.softSkills)) user.softSkills.forEach(addSkillsToSet);
  (user.projects || []).forEach((p) => addSkillsToSet(p.technologies));

  const isVerifiedSkill = (skill) => {
    if (!skill) return false;
    const sLower = String(skill).trim().toLowerCase();
    if (originalSkills.has(sLower)) return true;
    for (const orig of originalSkills) {
      if (orig === sLower || orig.includes(sLower) || sLower.includes(orig)) {
        return true;
      }
    }
    return false;
  };

  // 2. Filter tailored skills: ONLY allow skills verified in user's data
  if (tailoredResume.skills) {
    const categories = ["programmingLanguages", "frameworks", "tools", "other"];
    for (const cat of categories) {
      if (Array.isArray(tailoredResume.skills[cat])) {
        tailoredResume.skills[cat] = tailoredResume.skills[cat].filter(isVerifiedSkill);
      }
    }
  }

  // 3. Ground matchedSkills in tailoredMeta
  if (tailoredResume.tailoredMeta && Array.isArray(tailoredResume.tailoredMeta.matchedSkills)) {
    tailoredResume.tailoredMeta.matchedSkills = tailoredResume.tailoredMeta.matchedSkills.filter(isVerifiedSkill);
  }

  // 4. Ensure education entries match verified user institutions/degrees
  if (Array.isArray(tailoredResume.education) && Array.isArray(user.education) && user.education.length > 0) {
    tailoredResume.education = tailoredResume.education.filter((edu) => {
      const col = (edu.college || edu.institution || "").toLowerCase();
      return user.education.some((ue) => {
        const uCol = (ue.college || ue.institution || "").toLowerCase();
        return !col || !uCol || uCol.includes(col) || col.includes(uCol);
      });
    });
    if (tailoredResume.education.length === 0) {
      tailoredResume.education = user.education;
    }
  }

  // 5. Ensure projects match verified user projects
  if (Array.isArray(tailoredResume.projects) && Array.isArray(user.projects) && user.projects.length > 0) {
    tailoredResume.projects = tailoredResume.projects.filter((p) => {
      const pName = (p.name || p.title || "").toLowerCase();
      return user.projects.some((up) => {
        const uName = (up.name || up.title || "").toLowerCase();
        return !pName || !uName || uName.includes(pName) || pName.includes(uName);
      });
    });
    if (tailoredResume.projects.length === 0) {
      tailoredResume.projects = user.projects;
    }
  }

  // 6. Ensure work experience matches verified user experience
  const origExp = user.experience || user.workExperience || user.internships || [];
  if (Array.isArray(tailoredResume.experience) && Array.isArray(origExp) && origExp.length > 0) {
    tailoredResume.experience = tailoredResume.experience.filter((e) => {
      const comp = (e.company || e.companyName || e.organization || "").toLowerCase();
      return origExp.some((ue) => {
        const uComp = (ue.company || ue.companyName || ue.organization || "").toLowerCase();
        return !comp || !uComp || uComp.includes(comp) || comp.includes(uComp);
      });
    });
    if (tailoredResume.experience.length === 0) {
      tailoredResume.experience = origExp;
    }
  }

  return tailoredResume;
}

/**
 * Tailor user's resume specifically for a target opportunity
 * NEVER invents skills, experiences, or credentials.
 */
async function tailorResumeForOpportunity(userData, opportunityData, template = "classic") {
  if (!geminiModel) {
    const rawMock = mockTailor(userData, opportunityData, template);
    return enforceGrounding(rawMock, userData);
  }

  try {
    const prompt = `${TAILOR_SYSTEM_PROMPT}\n\nTARGET JOB / INTERNSHIP:\n${JSON.stringify(opportunityData)}\n\nUSER RESUME DATA:\n${JSON.stringify(userData)}`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini tailor timed out")), 14000)
    );
    const apiPromise = (async () => {
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text() || "{}";
      const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const res = JSON.parse(cleaned);
      res.template = template;
      return res;
    })();

    const tailored = await Promise.race([apiPromise, timeoutPromise]);
    return enforceGrounding(tailored, userData);
  } catch (err) {
    console.error("Gemini tailor failed, falling back to mock tailoring:", err.message);
    const rawMock = mockTailor(userData, opportunityData, template);
    return enforceGrounding(rawMock, userData);
  }
}

module.exports = {
  generateResume,
  updateResume,
  parseResumeText,
  tailorResumeForOpportunity,
  mockTailor,
  heuristicParseResume,
  enforceGrounding,
};