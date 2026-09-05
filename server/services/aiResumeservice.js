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
    geminiModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });
    console.log("Gemini AI initialized for Resume Builder");
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

const mockGenerate = (rawData, template) => {
  const raw = deepClone(rawData);
  return {
    personal: { ...raw.personal },
    summary: buildSummary(raw),
    education: (raw.education || [])
      .filter((e) => e.college || e.degree)
      .map((e) => ({
        college: e.college || "",
        degree: e.degree || "",
        branch: e.branch || "",
        cgpa: e.cgpa || "",
        startYear: e.startYear || "",
        endYear: e.endYear || "",
      })),
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
  "education": [{ "college": "", "degree": "", "branch": "", "cgpa": "", "startYear": "", "endYear": "" }],
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
  const result = await geminiModel.generateContent(prompt);
  console.log(result)
  const text = result.response.text() || "{}";

  // Clean possible markdown fences
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

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

module.exports = {
  generateResume,
  updateResume,
};