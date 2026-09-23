const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { PDFParse } = require("pdf-parse");
const PDFDocument = require("pdfkit");
const {
  normalize,
  parseJobDescriptionText,
  extractKnownSkills,
  extractKeywords,
  phraseExists,
} = require("./atsScoringService");

const execFileAsync = promisify(execFile);
const MAX_TEXT_LENGTH = 30000;
const HEADINGS = /^(summary|professional summary|profile|objective|skills|technical skills|technical expertise|core competencies|experience|work experience|professional experience|career history|work history|internships?|projects?|academic projects|projects and coursework|projects, coursework and experience|relevant experience and projects|coursework|relevant coursework|education|academic background|certifications?|achievements?|awards|publications|volunteer experience)$/i;
const EVIDENCE_HEADING = /^(experience|work experience|professional experience|career history|work history|internships?|projects?|academic projects|projects and coursework|projects, coursework and experience|relevant experience and projects|coursework|relevant coursework)$/i;
const ACTION_VERBS = ["analyzed", "built", "completed", "created", "designed", "developed", "delivered", "implemented", "improved", "led", "managed", "optimized", "reduced", "researched", "tested"];

const cleanText = (value) => String(value || "")
  .replace(/\u0000/g, "")
  .replace(/\r\n?/g, "\n")
  .replace(/[\t ]+/g, " ")
  .trim();

const linesOf = (value) => cleanText(value).split("\n").map((line) => line.trim()).filter(Boolean);
const isHeading = (line) => HEADINGS.test(line.replace(/[:\s]+$/, ""));

async function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Upload a valid PDF file.");
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = cleanText(result?.text);
    if (text.length < 50) throw new Error("This PDF has too little selectable text. Upload a text-based PDF.");
    if (text.length > MAX_TEXT_LENGTH) throw new Error("This PDF has too much text for the resume review. Please use a shorter document.");
    return text;
  } finally {
    await parser.destroy?.();
  }
}

function scorePdfText(resumeText, jdText) {
  const resume = cleanText(resumeText);
  const jd = parseJobDescriptionText(jdText);
  const normalizedResume = normalize(resume);
  const targetSkills = jd.requiredSkills.slice(0, 30);
  const detectedSkills = new Set(extractKnownSkills(normalizedResume));
  const matchedSkills = targetSkills.filter((skill) => detectedSkills.has(skill));
  const missingSkills = targetSkills.filter((skill) => !matchedSkills.includes(skill));
  const ignoredKeywords = new Set(["title", "need", "looking", "seeking", "company", "apply", "please", "candidate"]);
  const keywords = [...new Set(extractKeywords(`${jd.title} ${jd.description}`, 40)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9+#]+$/g, ""))
    .filter((word) => word.length >= 3 && !ignoredKeywords.has(word)))].slice(0, 18);
  const matchedKeywords = keywords.filter((word) => phraseExists(normalizedResume, word));
  const missingKeywords = keywords.filter((word) => !matchedKeywords.includes(word));
  const lines = linesOf(resume);
  const headings = lines.filter(isHeading).map((line) => line.toLowerCase().replace(/:$/, ""));
  let inEvidence = false;
  const evidenceLines = [];
  for (const line of lines) {
    if (isHeading(line)) {
      inEvidence = EVIDENCE_HEADING.test(line.replace(/:$/, ""));
    } else if (inEvidence) {
      evidenceLines.push(line);
    }
  }
  const evidenceText = normalize(evidenceLines.join(" "));
  const evidenceSkills = new Set(extractKnownSkills(evidenceText));
  const evidenceMatches = [
    ...matchedSkills.filter((skill) => evidenceSkills.has(skill)),
    ...matchedKeywords.filter((word) => phraseExists(evidenceText, word)),
  ];
  const topThird = normalize(lines.slice(0, Math.max(1, Math.ceil(lines.length / 3))).join(" "));
  const earlySkills = new Set(extractKnownSkills(topThird));
  const earlyMatches = [
    ...matchedSkills.filter((skill) => earlySkills.has(skill)),
    ...matchedKeywords.filter((word) => phraseExists(topThird, word)),
  ];
  const actionCount = ACTION_VERBS.filter((verb) => phraseExists(evidenceText, verb)).length;
  const emailPresent = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resume);
  const namePresent = lines.some((line) => !isHeading(line) && /^[\p{L}][\p{L} .'-]{3,70}$/u.test(line));
  const sectionKinds = ["skills", "experience", "projects", "coursework", "education"].filter((kind) => headings.some((heading) => heading.includes(kind)));
  const orderedSections = sectionKinds.length >= 2 && lines.findIndex(isHeading) < lines.length / 2;
  const readable = lines.length >= 8 && lines.some((line) => line.length >= 35 && line.length <= 180);
  const sections = {
    skills: targetSkills.length ? Math.round(35 * matchedSkills.length / targetSkills.length) : 18,
    keywords: keywords.length ? Math.round(25 * matchedKeywords.length / keywords.length) : 13,
    evidence: Math.round(10 * evidenceMatches.length / Math.max(1, matchedSkills.length + matchedKeywords.length))
      + Math.min(5, actionCount) + Math.min(5, earlyMatches.length),
    readability: (emailPresent ? 4 : 0) + (namePresent ? 3 : 0)
      + (sectionKinds.length >= 2 ? 5 : 0) + (orderedSections ? 4 : 0) + (readable ? 4 : 0),
  };
  const overallScore = Math.min(100, Object.values(sections).reduce((sum, score) => sum + score, 0));
  return {
    atsScore: overallScore,
    targetRole: jd.title,
    sections,
    scoreParameters: [
      { key: "skills", label: "Job skills found in the PDF", earned: sections.skills, maximum: 35 },
      { key: "keywords", label: "Job language found in the PDF", earned: sections.keywords, maximum: 25 },
      { key: "evidence", label: "Relevant project, coursework or work evidence", earned: sections.evidence, maximum: 20 },
      { key: "readability", label: "Readable contact and sections", earned: sections.readability, maximum: 20 },
    ],
    matchedSkills,
    missingSkills,
    matchedKeywords,
    missingKeywords,
    requiresFix: overallScore < 70,
    scoreDisclaimer: "CareerConnect estimates alignment from selectable PDF text. Employers use different screening methods.",
  };
}

function escapeLatex(value) {
  const substitutions = {
    "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "$": "\\$", "&": "\\&",
    "#": "\\#", "%": "\\%", "_": "\\_", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
  };
  return String(value || "").replace(/[\\{}$&#%_~^]/g, (character) => substitutions[character]);
}

function organizeResume(sourceText, jdText) {
  const sourceLines = linesOf(sourceText).filter((line) => !/^-- \d+ of \d+ --$/.test(line));
  const jd = parseJobDescriptionText(jdText);
  const normalizedJd = normalize(jd.description);
  const sectionMap = new Map([
    ["Professional Summary", []],
    ["Skills", []],
    ["Projects, Coursework and Experience", []],
    ["Education", []],
    ["Certifications and Awards", []],
    ["Additional Information", []],
  ]);
  const classifyHeading = (line) => {
    const heading = line.toLowerCase();
    if (/skill|expertise|competenc/.test(heading)) return "Skills";
    if (/experience|project|coursework|intern|career history|work history/.test(heading)) return "Projects, Coursework and Experience";
    if (/education|academic/.test(heading)) return "Education";
    if (/certification|award|achievement/.test(heading)) return "Certifications and Awards";
    if (/summary|profile|objective/.test(heading)) return "Professional Summary";
    return "Additional Information";
  };
  let currentSection = "";
  const name = sourceLines[0] || "Candidate";
  const contact = [];
  for (const line of sourceLines.slice(1)) {
    if (isHeading(line)) {
      currentSection = classifyHeading(line);
      continue;
    }
    if (!currentSection && /@|(?:\+?\d[\d ()-]{8,})|linkedin\.com|github\.com/i.test(line)) {
      contact.push(line);
      continue;
    }
    let destination = currentSection;
    if (!destination) {
      const knownSkills = extractKnownSkills(normalize(line));
      if (/^(?:skills|technologies|tools)\s*:/i.test(line) || (knownSkills.length >= 2 && /,|\|/.test(line))) destination = "Skills";
      else if (/\b(?:bachelor|master|b\.?tech|m\.?tech|university|college|school|degree|cgpa)\b/i.test(line)) destination = "Education";
      else if (/\b(?:certified|certification|award)\b/i.test(line)) destination = "Certifications and Awards";
      else if (/\b(?:built|created|developed|designed|implemented|managed|led|worked|intern)\b/i.test(line)) destination = "Projects, Coursework and Experience";
      else destination = "Professional Summary";
    }
    sectionMap.get(destination).push(line);
  }
  const relevance = (line) => extractKnownSkills(normalize(line)).filter((skill) => phraseExists(normalizedJd, skill)).length;
  sectionMap.get("Skills").sort((a, b) => relevance(b) - relevance(a));
  return { name, contact, sections: [...sectionMap.entries()].filter(([, entries]) => entries.length) };
}

function createLatexResume(sourceText, jdText) {
  const { name, contact, sections } = organizeResume(sourceText, jdText);
  const header = `{\\LARGE\\bfseries ${escapeLatex(name)}}\\par\\vspace{2pt}\n${contact.map((line) => `\\noindent ${escapeLatex(line)}\\par`).join("\n")}\n`;
  const body = sections.map(([heading, entries]) => {
    const content = entries.map((line) => {
      const safe = escapeLatex(line.replace(/^[•●▪*-]\s*/, ""));
      if (/^[•●▪*-]\s*/.test(line)) return `\\noindent\\textbullet\\quad ${safe}\\par\n`;
      return `\\noindent ${safe}\\par\n`;
    }).join("");
    return `\\section*{${escapeLatex(heading)}}\n${content}`;
  }).join("\n");
  return `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.72in]{geometry}
\\usepackage{fontspec}
\\setmainfont{lmroman10-regular.otf}[BoldFont=lmroman10-bold.otf]
\\usepackage{titlesec}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{10pt}{4pt}
\\begin{document}
${header}
${body}
\\end{document}
`;
}

let activeCompilations = 0;
function createFallbackPdf(sourceText, jdText) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "CareerConnect Resume" } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    const { name, contact, sections } = organizeResume(sourceText, jdText);
    document.fillColor("#14213d").font("Helvetica-Bold").fontSize(17).text(name);
    for (const line of contact) {
      document.fillColor("#475569").font("Helvetica").fontSize(9).text(line);
    }
    document.moveDown(0.35);
    for (const [heading, entries] of sections) {
      document.moveDown(0.35).fillColor("#14213d").font("Helvetica-Bold").fontSize(10.5).text(heading.toUpperCase());
      document.moveDown(0.12);
      for (const line of entries) {
        document.fillColor("#263445").font("Helvetica").fontSize(9.5).text(line, { lineGap: 2 });
        document.moveDown(0.18);
      }
    }
    document.end();
  });
}

async function compileLatex(latex, { fallbackText, jdText } = {}) {
  if (activeCompilations >= 2) {
    const error = new Error("Resume generation is busy. Please try again shortly.");
    error.statusCode = 503;
    throw error;
  }
  activeCompilations += 1;
  let directory;
  try {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "careerconnect-ats-"));
    const texPath = path.join(directory, "resume.tex");
    const cacheDirectory = process.env.TECTONIC_CACHE_DIR || path.join(os.tmpdir(), "careerconnect-tectonic-cache");
    await fs.mkdir(cacheDirectory, { recursive: true });
    await fs.writeFile(texPath, latex, { mode: 0o600 });
    await execFileAsync(process.env.TECTONIC_PATH || "tectonic", ["-X", "compile", "--untrusted", "--outdir", directory, texPath], {
      cwd: directory,
      timeout: 300000,
      maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env, TECTONIC_UNTRUSTED_MODE: "1", TECTONIC_CACHE_DIR: cacheDirectory },
    });
    return await fs.readFile(path.join(directory, "resume.pdf"));
  } catch (error) {
    if (fallbackText) {
      console.warn("ATS LaTeX compilation unavailable; using the built-in PDF renderer:", error.code || error.name);
      return createFallbackPdf(fallbackText, jdText);
    }
    if (error.code === "ENOENT") {
      const unavailable = new Error("PDF generation is unavailable because Tectonic is not installed on the server.");
      unavailable.statusCode = 503;
      throw unavailable;
    }
    throw error;
  } finally {
    activeCompilations -= 1;
    if (directory) await fs.rm(directory, { recursive: true, force: true });
  }
}

function preservedSourceText(source, generated) {
  const factualSource = linesOf(source).filter((line) => !isHeading(line) && !/^-- \d+ of \d+ --$/.test(line)).join(" ");
  const sourceWords = new Set(normalize(factualSource).split(/\s+/).filter((word) => word.length > 2));
  const generatedWords = new Set(normalize(generated).split(/\s+/));
  const retained = [...sourceWords].filter((word) => generatedWords.has(word)).length;
  return { ratio: sourceWords.size ? retained / sourceWords.size : 0, retained, total: sourceWords.size };
}

module.exports = { extractPdfText, scorePdfText, createLatexResume, compileLatex, preservedSourceText, escapeLatex };
