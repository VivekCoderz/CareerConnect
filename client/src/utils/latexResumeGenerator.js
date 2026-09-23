/**
 * latexResumeGenerator.js
 * 
 * Utility to convert CareerConnect structured resume data into
 * clean, 100% ATS-friendly single-page LaTeX code (.tex).
 * Compatible with Overleaf, TeX Live, and MiKTeX.
 */

import { extractSkillsList, sortEducation } from "./resumeHelpers";

/**
 * Escapes LaTeX special characters to avoid compilation errors.
 * Characters: \ { } $ & # ^ _ ~ %
 */
export const escapeLatex = (str) => {
  if (!str) return "";
  const s = String(str);

  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\$/g, "\\$")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/_/g, "\\_")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/%/g, "\\%");
};

/**
 * Extracts clean bullet points from string or array.
 */
const getBulletPoints = (desc) => {
  if (!desc) return [];
  if (Array.isArray(desc)) {
    return desc.map((d) => String(d).trim()).filter(Boolean);
  }
  return String(desc)
    .split(/[\n•\-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Generates valid, clean, single-page ATS-optimized LaTeX source string.
 * @param {Object} data - CareerConnect resume data (generatedResume or rawData)
 * @returns {string} LaTeX source code
 */
export const generateLatexCode = (data = {}) => {
  const personal = data.personal || {};
  const summary = data.summary || "";
  const education = data.education || [];
  const skills = data.skills || {};
  const experience = data.experience || [];
  const projects = data.projects || [];
  const certifications = data.certifications || [];
  const achievements = data.achievements || [];

  const fullName = escapeLatex(personal.fullName || personal.name || "Candidate Name");
  const phone = escapeLatex(personal.phone || "");
  const email = personal.email ? personal.email.trim() : "";
  const location = escapeLatex(personal.location || personal.city || "");
  const linkedin = personal.linkedin ? personal.linkedin.trim() : "";
  const github = personal.github ? personal.github.trim() : "";
  const portfolio = personal.portfolio ? personal.portfolio.trim() : "";

  // Build Contact Header
  const contactParts = [];
  if (phone) contactParts.push(phone);
  if (location) contactParts.push(location);
  if (email) {
    contactParts.push(`\\href{mailto:${escapeLatex(email)}}{\\underline{${escapeLatex(email)}}}`);
  }
  if (linkedin) {
    const display = linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    const url = linkedin.startsWith("http") ? linkedin : `https://${linkedin}`;
    contactParts.push(`\\href{${url}}{\\underline{${escapeLatex(display)}}}`);
  }
  if (github) {
    const display = github.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    const url = github.startsWith("http") ? github : `https://${github}`;
    contactParts.push(`\\href{${url}}{\\underline{${escapeLatex(display)}}}`);
  }
  if (portfolio) {
    const display = portfolio.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    const url = portfolio.startsWith("http") ? portfolio : `https://${portfolio}`;
    contactParts.push(`\\href{${url}}{\\underline{${escapeLatex(display)}}}`);
  }

  const contactLine = contactParts.join(" $|$\n    \\small ");

  // 1. Education Section
  let educationSection = "";
  const sortedEdu = sortEducation(education);
  if (sortedEdu.length > 0) {
    const eduItems = sortedEdu.map((edu) => {
      const inst = escapeLatex(edu.college || edu.school || edu.institution || "University");
      const deg = escapeLatex(
        edu.degree ||
          (edu.level === "10th"
            ? "Secondary School"
            : edu.level === "12th"
            ? "Senior Secondary"
            : "Degree")
      );
      const branch = edu.branch || edu.stream || edu.specialization ? `, ${escapeLatex(edu.branch || edu.stream || edu.specialization)}` : "";
      const cgpa = edu.cgpa
        ? String(edu.cgpa).includes("%")
          ? ` (Percentage: ${escapeLatex(edu.cgpa)})`
          : ` (CGPA: ${escapeLatex(edu.cgpa)})`
        : "";
      const years = escapeLatex(
        edu.startYear && edu.endYear
          ? `${edu.startYear} -- ${edu.endYear}`
          : edu.endYear || edu.passingYear || edu.startYear || ""
      );
      const loc = escapeLatex(edu.location || edu.city || "");

      return `    \\resumeSubheading
      {${inst}}{${loc}}
      {${deg}${branch}${cgpa}}{${years}}`;
    }).join("\n");

    educationSection = `%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
${eduItems}
  \\resumeSubHeadingListEnd
`;
  }

  // 2. Technical Skills Section
  let skillsSection = "";
  const hasCategorizedSkills =
    skills &&
    typeof skills === "object" &&
    !Array.isArray(skills) &&
    (skills.programmingLanguages?.length > 0 ||
      skills.frameworks?.length > 0 ||
      skills.tools?.length > 0 ||
      skills.other?.length > 0);

  if (hasCategorizedSkills) {
    const catItems = [];
    if (skills.programmingLanguages?.length > 0) {
      const val = Array.isArray(skills.programmingLanguages)
        ? skills.programmingLanguages.join(", ")
        : skills.programmingLanguages;
      catItems.push(`     \\textbf{Programming Languages}{: ${escapeLatex(val)}}`);
    }
    if (skills.frameworks?.length > 0) {
      const val = Array.isArray(skills.frameworks)
        ? skills.frameworks.join(", ")
        : skills.frameworks;
      catItems.push(`     \\textbf{Frameworks \\& Libraries}{: ${escapeLatex(val)}}`);
    }
    if (skills.tools?.length > 0) {
      const val = Array.isArray(skills.tools) ? skills.tools.join(", ") : skills.tools;
      catItems.push(`     \\textbf{Developer Tools}{: ${escapeLatex(val)}}`);
    }
    if (skills.other?.length > 0) {
      const val = Array.isArray(skills.other) ? skills.other.join(", ") : skills.other;
      catItems.push(`     \\textbf{Core Fundamentals}{: ${escapeLatex(val)}}`);
    }

    if (catItems.length > 0) {
      skillsSection = `%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${catItems.join(" \\\\\n")}
    }}
 \\end{itemize}
`;
    }
  } else {
    const flatList = extractSkillsList(skills);
    if (flatList.length > 0) {
      skillsSection = `%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Skills}{: ${escapeLatex(flatList.join(", "))}}
    }}
 \\end{itemize}
`;
    }
  }

  // 3. Work Experience Section
  let experienceSection = "";
  if (experience.length > 0) {
    const expItems = experience.map((exp) => {
      const company = escapeLatex(exp.company || exp.companyName || "Organization");
      const duration = escapeLatex(exp.duration || "");
      const role = escapeLatex(exp.role || exp.title || "Position");
      const loc = escapeLatex(exp.location || "");
      const bullets = getBulletPoints(exp.description);

      const bulletItems = bullets.length > 0
        ? `      \\resumeItemListStart
${bullets.map((b) => `        \\resumeItem{${escapeLatex(b)}}`).join("\n")}
      \\resumeItemListEnd`
        : "";

      return `    \\resumeSubheading
      {${role}}{${duration}}
      {${company}}{${loc}}
${bulletItems}`;
    }).join("\n\n");

    experienceSection = `%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
${expItems}
  \\resumeSubHeadingListEnd
`;
  }

  // 4. Projects Section
  let projectsSection = "";
  if (projects.length > 0) {
    const projItems = projects.map((proj) => {
      const title = escapeLatex(proj.name || proj.title || "Project");
      const tech = proj.technologies ? ` $|$ \\emph{${escapeLatex(proj.technologies)}}` : "";
      const linkUrl = proj.github || proj.live || proj.link || "";
      const linkDisplay = proj.github ? "GitHub Link" : proj.live ? "Live Demo" : "Link";
      const linkLatex = linkUrl
        ? `{\\href{${linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`}}{\\underline{${escapeLatex(linkDisplay)}}}}`
        : "{}";
      const bullets = getBulletPoints(proj.description);

      const bulletItems = bullets.length > 0
        ? `        \\resumeItemListStart
${bullets.map((b) => `          \\resumeItem{${escapeLatex(b)}}`).join("\n")}
        \\resumeItemListEnd`
        : "";

      return `      \\resumeSubheading
        {${title}${tech}}{}
        ${linkLatex}{}
${bulletItems}`;
    }).join("\n\n");

    projectsSection = `%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
${projItems}
    \\resumeSubHeadingListEnd
`;
  }

  // 5. Professional Summary (Optional)
  let summarySection = "";
  if (summary && summary.trim()) {
    summarySection = `%-----------SUMMARY-----------
\\section{Summary}
  \\small{${escapeLatex(summary)}}
  \\vspace{-4pt}
`;
  }

  // 6. Certifications & Achievements Section
  let certSection = "";
  if (certifications.length > 0 || achievements.length > 0) {
    const items = [];
    if (certifications.length > 0) {
      const certsText = certifications.map((c) => {
        const name = escapeLatex(c.name || c.title || "");
        const issuer = c.issuer ? ` (${escapeLatex(c.issuer)})` : "";
        return `${name}${issuer}`;
      }).join("; ");
      items.push(`     \\textbf{Certifications}{: ${certsText}}`);
    }
    if (achievements.length > 0) {
      const achText = achievements.map((a) => {
        const title = escapeLatex(a.title || "");
        const desc = a.description ? ` -- ${escapeLatex(a.description)}` : "";
        return `${title}${desc}`;
      }).join("; ");
      items.push(`     \\textbf{Achievements}{: ${achText}}`);
    }

    certSection = `%-----------ACHIEVEMENTS & CERTIFICATIONS-----------
\\section{Achievements \\& Certifications}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
${items.join(" \\\\\n")}
    }}
 \\end{itemize}
`;
  }

  // Assemble full LaTeX document
  return `%-----------------------------------------------------------------------------
% Resume generated via CareerConnect Studio (ATS Optimized)
% Formatted for standard single-page compilation on Overleaf / TeX Live / MiKTeX
%-----------------------------------------------------------------------------

\\documentclass[letterpaper,10.8pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins (0.5 inch margins for standard single-page resume)
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${fullName}} \\\\ \\vspace{4pt}
    \\small ${contactLine}
\\end{center}

${summarySection}
${educationSection}
${skillsSection}
${experienceSection}
${projectsSection}
${certSection}
%-------------------------------------------
\\end{document}
`;
};

/**
 * Downloads generated LaTeX source as a .tex file directly in the browser.
 * @param {Object} data - Resume data
 * @param {string} filename - Target file name (defaults to "resume.tex")
 */
export const downloadLatexFile = (data, filename = "resume.tex") => {
  try {
    const latexCode = generateLatexCode(data);
    const blob = new Blob([latexCode], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".tex") ? filename : `${filename}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("Failed to download LaTeX file:", err);
    return false;
  }
};

/**
 * Copies LaTeX source code to user's clipboard.
 * @param {Object} data - Resume data
 * @returns {Promise<boolean>} success status
 */
export const copyLatexToClipboard = async (data) => {
  try {
    const latexCode = typeof data === "string" ? data : generateLatexCode(data);
    await navigator.clipboard.writeText(latexCode);
    return true;
  } catch (err) {
    console.error("Failed to copy LaTeX to clipboard:", err);
    return false;
  }
};
