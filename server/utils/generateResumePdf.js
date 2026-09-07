const PDFDocument = require("pdfkit");

/** Extract flat array of skills from any skills structure */
const extractSkillsList = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.map((s) => (typeof s === "string" ? s.trim() : s?.name || "")).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof skills === "object") {
    const list = [
      ...(Array.isArray(skills.programmingLanguages) ? skills.programmingLanguages : typeof skills.programmingLanguages === "string" ? skills.programmingLanguages.split(/[,\n]/) : []),
      ...(Array.isArray(skills.frameworks) ? skills.frameworks : typeof skills.frameworks === "string" ? skills.frameworks.split(/[,\n]/) : []),
      ...(Array.isArray(skills.tools) ? skills.tools : typeof skills.tools === "string" ? skills.tools.split(/[,\n]/) : []),
      ...(Array.isArray(skills.other) ? skills.other : typeof skills.other === "string" ? skills.other.split(/[,\n]/) : []),
    ];
    if (list.length > 0) return list.map((s) => (typeof s === "string" ? s.trim() : s?.name || "")).filter(Boolean);
    return Object.values(skills)
      .flatMap((v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n]/) : []))
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);
  }
  return [];
};

/** Palette colors based on template style */
const getTemplateTheme = (templateId = "classic") => {
  const tid = String(templateId).toLowerCase().replace(/[^a-z0-9]/g, "");
  switch (tid) {
    case "executive":
    case "corporate":
      return { primary: "#0f172a", accent: "#334155", line: "#cbd5e1" };
    case "compact":
    case "compacttech":
    case "tech":
      return { primary: "#0f766e", accent: "#115e59", line: "#99f6e4" };
    case "bold":
    case "boldheader":
    case "modern":
      return { primary: "#1d4ed8", accent: "#1e40af", line: "#bfdbfe" };
    case "sidebar":
      return { primary: "#1e3a5f", accent: "#2d4a77", line: "#93c5fd" };
    case "elegant":
    case "minimal":
      return { primary: "#374151", accent: "#4b5563", line: "#e5e7eb" };
    case "twocolumn":
      return { primary: "#1f2937", accent: "#374151", line: "#d1d5db" };
    case "classic":
    default:
      return { primary: "#111827", accent: "#1f2937", line: "#9ca3af" };
  }
};

/**
 * Generate PDF buffer for an AI-built resume
 * @param {Object} data - generatedData (personal, summary, experience, projects, education, skills, etc.)
 * @param {string} templateId - template identifier
 * @param {string} resumeTitle - optional title
 * @returns {Promise<Buffer>}
 */
const generateResumePdfBuffer = (data = {}, templateId = "classic", resumeTitle = "") => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        info: {
          Title: resumeTitle || "Resume",
          Author: data.personal?.fullName || "Candidate",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const theme = getTemplateTheme(templateId);
      const personal = data.personal || data.personalInfo || {};
      const fullName = personal.fullName || "Candidate Name";

      // ─── Header ──────────────────────────────────────────
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(theme.primary)
        .text(fullName.toUpperCase(), { align: "center" });

      if (resumeTitle && resumeTitle !== "My Resume") {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(theme.accent)
          .text(resumeTitle, { align: "center" });
      }

      // Contact row
      const contactItems = [
        personal.email,
        personal.phone,
        personal.location,
      ].filter(Boolean);

      if (contactItems.length > 0) {
        doc.moveDown(0.2);
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#4b5563")
          .text(contactItems.join("  |  "), { align: "center" });
      }

      // Links row
      const links = [
        personal.linkedin ? `LinkedIn: ${personal.linkedin}` : null,
        personal.github ? `GitHub: ${personal.github}` : null,
        personal.portfolio ? `Portfolio: ${personal.portfolio}` : null,
      ].filter(Boolean);

      if (links.length > 0) {
        doc.moveDown(0.15);
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(theme.primary)
          .text(links.join("  ·  "), { align: "center" });
      }

      doc.moveDown(0.4);
      doc.strokeColor(theme.line).lineWidth(1).moveTo(36, doc.y).lineTo(559, doc.y).stroke();
      doc.moveDown(0.5);

      // Section Header Helper
      const addSectionHeader = (title) => {
        doc.moveDown(0.4);
        doc
          .font("Helvetica-Bold")
          .fontSize(10.5)
          .fillColor(theme.primary)
          .text(title.toUpperCase(), { characterSpacing: 1 });
        doc.moveDown(0.1);
        doc.strokeColor(theme.line).lineWidth(0.75).moveTo(36, doc.y).lineTo(559, doc.y).stroke();
        doc.moveDown(0.3);
      };

      // ─── Summary ──────────────────────────────────────────
      if (data.summary) {
        addSectionHeader("Professional Summary");
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#1f2937")
          .text(data.summary, { align: "justify", lineGap: 2 });
      }

      // ─── Experience ───────────────────────────────────────
      if (data.experience && data.experience.length > 0) {
        addSectionHeader("Work Experience");
        data.experience.forEach((exp) => {
          if (!exp.role && !exp.company) return;
          const roleText = exp.role || "Role";
          const companyText = exp.company ? ` — ${exp.company}` : "";
          const durationText = exp.duration || "";

          doc
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .fillColor(theme.accent)
            .text(`${roleText}${companyText}`, { continued: !!durationText });

          if (durationText) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#6b7280")
              .text(`  (${durationText})`, { align: "right" });
          }

          if (Array.isArray(exp.description) && exp.description.length > 0) {
            exp.description.forEach((d) => {
              if (!d) return;
              doc
                .font("Helvetica")
                .fontSize(8.5)
                .fillColor("#374151")
                .text(`•  ${d}`, { indent: 12, lineGap: 1.5 });
            });
          } else if (typeof exp.description === "string" && exp.description.trim()) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#374151")
              .text(`•  ${exp.description.trim()}`, { indent: 12, lineGap: 1.5 });
          }
          doc.moveDown(0.2);
        });
      }

      // ─── Projects ─────────────────────────────────────────
      if (data.projects && data.projects.length > 0) {
        addSectionHeader("Projects");
        data.projects.forEach((proj) => {
          if (!proj.name) return;
          const techText = proj.technologies ? ` | Technologies: ${proj.technologies}` : "";

          doc
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .fillColor(theme.accent)
            .text(proj.name, { continued: !!techText });

          if (techText) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#6b7280")
              .text(techText);
          }

          const projLinks = [
            proj.live ? `Live: ${proj.live}` : null,
            proj.github ? `GitHub: ${proj.github}` : null,
          ].filter(Boolean);

          if (projLinks.length > 0) {
            doc
              .font("Helvetica")
              .fontSize(8)
              .fillColor(theme.primary)
              .text(projLinks.join("  |  "), { indent: 12 });
          }

          if (Array.isArray(proj.description) && proj.description.length > 0) {
            proj.description.forEach((d) => {
              if (!d) return;
              doc
                .font("Helvetica")
                .fontSize(8.5)
                .fillColor("#374151")
                .text(`•  ${d}`, { indent: 12, lineGap: 1.5 });
            });
          } else if (typeof proj.description === "string" && proj.description.trim()) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#374151")
              .text(`•  ${proj.description.trim()}`, { indent: 12, lineGap: 1.5 });
          }
          doc.moveDown(0.2);
        });
      }

      // ─── Education ────────────────────────────────────────
      if (data.education && data.education.length > 0) {
        addSectionHeader("Education");
        data.education.forEach((edu) => {
          if (!edu.college && !edu.degree) return;
          const degreeText = [edu.degree, edu.branch].filter(Boolean).join(" in ");
          const collegeText = edu.college ? `${edu.college}` : "";
          const yearText = [edu.startYear, edu.endYear].filter(Boolean).join(" - ");
          const cgpaText = edu.cgpa ? ` | CGPA: ${edu.cgpa}` : "";

          doc
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .fillColor(theme.accent)
            .text(collegeText, { continued: !!degreeText });

          if (degreeText) {
            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor("#374151")
              .text(` — ${degreeText}${cgpaText}`, { continued: !!yearText });
          }

          if (yearText) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#6b7280")
              .text(`  (${yearText})`, { align: "right" });
          }
          doc.moveDown(0.15);
        });
      }

      // ─── Technical Skills ─────────────────────────────────
      const allSkills = extractSkillsList(data.skills);
      if (allSkills.length > 0 || (typeof data.skills === "object" && data.skills !== null)) {
        addSectionHeader("Technical Skills");

        const hasCategories =
          data.skills?.programmingLanguages?.length > 0 ||
          data.skills?.frameworks?.length > 0 ||
          data.skills?.tools?.length > 0 ||
          data.skills?.other?.length > 0;

        if (hasCategories) {
          const renderCategory = (catName, items) => {
            const list = Array.isArray(items)
              ? items
              : typeof items === "string"
              ? items.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
              : [];
            if (list.length === 0) return;
            doc
              .font("Helvetica-Bold")
              .fontSize(8.5)
              .fillColor(theme.accent)
              .text(`${catName}: `, { continued: true });
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#374151")
              .text(list.join(", "));
          };

          renderCategory("Languages", data.skills.programmingLanguages);
          renderCategory("Frameworks & Libraries", data.skills.frameworks);
          renderCategory("Tools & Platforms", data.skills.tools);
          renderCategory("Other Skills", data.skills.other);
        } else {
          doc
            .font("Helvetica")
            .fontSize(8.5)
            .fillColor("#374151")
            .text(allSkills.join("  •  "), { lineGap: 2 });
        }
      }

      // ─── Certifications ───────────────────────────────────
      if (data.certifications && data.certifications.length > 0) {
        addSectionHeader("Certifications");
        data.certifications.forEach((c) => {
          if (!c.name) return;
          const issuer = c.issuer ? ` — ${c.issuer}` : "";
          const year = c.year ? ` (${c.year})` : "";
          doc
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .fillColor(theme.accent)
            .text(`•  ${c.name}`, { continued: !!(issuer || year) });
          if (issuer || year) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#4b5563")
              .text(`${issuer}${year}`);
          }
        });
      }

      // ─── Achievements ─────────────────────────────────────
      if (data.achievements && data.achievements.length > 0) {
        addSectionHeader("Achievements");
        data.achievements.forEach((a) => {
          if (!a.title && !a.description) return;
          doc
            .font("Helvetica-Bold")
            .fontSize(8.5)
            .fillColor(theme.accent)
            .text(`•  ${a.title || ""}`, { continued: !!a.description });
          if (a.description) {
            doc
              .font("Helvetica")
              .fontSize(8.5)
              .fillColor("#4b5563")
              .text(`: ${a.description}`);
          }
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateResumePdfBuffer,
  extractSkillsList,
};
