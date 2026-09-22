import React from "react";
import { extractSkillsList, sortEducation } from "../../../utils/resumeHelpers";

/**
 * ATSSafeResumeRenderer
 *
 * A 100% single-column, strictly ATS-compliant resume renderer.
 * Built with professional typography, generous section spacing (20–28px),
 * clear visual hierarchy, and readable 11–11.5pt body font sizing.
 *
 * Supported Templates:
 * - "classic": Formal centered header, crisp dark section rules, corporate serif/calibri typography
 * - "modern": Contemporary tech header with title, bold dark borders, categorized skills
 * - "minimal": Airy typography, light subtle borders, generous whitespace hierarchy
 */
const ATSSafeResumeRenderer = ({ data, templateId = "classic" }) => {
  if (!data) {
    return (
      <div className="text-center py-16 text-slate-400 font-sans text-sm">
        No resume content available to display.
      </div>
    );
  }

  const {
    personal = {},
    summary = "",
    education = [],
    skills = {},
    projects = [],
    experience = [],
    certifications = [],
    achievements = [],
  } = data;

  const activeTemplate = (templateId || "classic").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isModern = activeTemplate === "modern" || activeTemplate === "bold";
  const isMinimal = activeTemplate === "minimal" || activeTemplate === "elegant";
  const isClassic = !isModern && !isMinimal;

  // Contact items: phone, location, email
  const contactItems = [
    personal.phone,
    personal.location || personal.city,
    personal.email,
  ].filter(Boolean);

  // Links: LinkedIn, GitHub, Portfolio
  const links = [
    personal.linkedin && {
      label: "LinkedIn",
      url: personal.linkedin,
      display: personal.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    },
    personal.github && {
      label: "GitHub",
      url: personal.github,
      display: personal.github.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    },
    personal.portfolio && {
      label: "Portfolio",
      url: personal.portfolio,
      display: personal.portfolio.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    },
  ].filter(Boolean);

  // Combined header row items
  const allHeaderItems = [
    ...contactItems.map((item) => ({ type: "text", value: item })),
    ...links.map((link) => ({ type: "link", ...link })),
  ];

  // Normalize skills
  const hasCategorizedSkills =
    skills &&
    typeof skills === "object" &&
    !Array.isArray(skills) &&
    (skills.programmingLanguages?.length > 0 ||
      skills.frameworks?.length > 0 ||
      skills.tools?.length > 0 ||
      skills.other?.length > 0);

  const flatSkillsList = extractSkillsList(skills);

  // Font family per template
  const containerFont = isClassic
    ? "font-['Calibri',_'Arial',_sans-serif]"
    : isModern
    ? "font-['Helvetica_Neue',_'Arial',_sans-serif]"
    : "font-['Arial',_'Helvetica',_sans-serif]";

  // Section Heading Styles: 13–14px, bold uppercase, letter-spacing ~0.5px, 1.5–2px solid divider
  const headingStyle = isClassic
    ? "text-[13.5px] font-bold uppercase tracking-[0.5px] text-slate-900 border-b-[1.75px] border-slate-700 pb-1 mb-3.5"
    : isModern
    ? "text-[13.5px] font-extrabold uppercase tracking-[0.5px] text-slate-900 border-b-2 border-slate-900 pb-1 mb-3.5"
    : "text-[13px] font-bold uppercase tracking-[0.8px] text-slate-800 border-b-[1.5px] border-slate-500 pb-1 mb-3.5";

  // Section Spacing: 20–28px breathing room between sections
  const sectionSpacing = "mb-6 sm:mb-7 print:mb-6";

  return (
    <div
      className={`ats-resume-container bg-white text-slate-900 max-w-[850px] mx-auto p-6 sm:p-10 print:p-0 leading-[1.5] text-[14px] print:text-[11pt] print:leading-[1.45] select-text ${containerFont}`}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Candidate Details & Clean Contact Row)
          ───────────────────────────────────────────────────────────── */}
      <header
        className={`resume-header ${sectionSpacing} ${
          isClassic
            ? "text-center border-b-[1.5px] border-slate-300 pb-4"
            : isModern
            ? "text-left border-b-2 border-slate-800 pb-4"
            : "text-center pb-3"
        }`}
      >
        {/* Candidate Name: 26–28px, Bold */}
        <h1
          className={`font-bold text-slate-900 uppercase tracking-tight leading-tight ${
            isClassic
              ? "text-[26px] sm:text-[28px]"
              : isModern
              ? "text-[26px] sm:text-[28px] font-extrabold"
              : "text-[24px] sm:text-[26px] tracking-wide"
          }`}
        >
          {personal.fullName || personal.name || "Candidate Name"}
        </h1>

        {personal.title && (
          <p className="text-[13.5px] font-semibold text-slate-700 mt-1 tracking-wide">
            {personal.title}
          </p>
        )}

        {/* Contact info row: 11.5–12px, subtle separator with 8–10px spacing */}
        {allHeaderItems.length > 0 && (
          <div
            className={`resume-contact-row text-slate-600 text-[12px] sm:text-[12.5px] print:text-[10pt] mt-2 flex flex-wrap items-center gap-y-1 ${
              isModern ? "justify-start is-modern" : "justify-center"
            }`}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: isModern ? "flex-start" : "center",
              gap: "4px 8px",
            }}
          >
            {allHeaderItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.type === "link" ? (
                  <a
                    href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resume-contact-item resume-contact-link text-slate-700 hover:text-blue-700 hover:underline font-medium print:text-slate-800"
                    style={{ display: "inline-block", whiteSpace: "nowrap" }}
                  >
                    {item.label || item.display}
                  </a>
                ) : (
                  <span
                    className="resume-contact-item"
                    style={{ display: "inline-block", whiteSpace: "nowrap" }}
                  >
                    {item.value}
                  </span>
                )}
                {idx < allHeaderItems.length - 1 && (
                  <span
                    className="resume-contact-separator text-slate-400 font-normal select-none"
                    style={{ display: "inline-block", padding: "0 6px" }}
                  >
                    •
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. PROFESSIONAL SUMMARY
          ───────────────────────────────────────────────────────────── */}
      {summary && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Professional Summary</h2>
          <div className="pt-0.5">
            <p className="text-slate-800 text-[14px] print:text-[11pt] text-justify leading-[1.5]">
              {summary}
            </p>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. TECHNICAL SKILLS (Categorized Single-Column for ATS)
          ───────────────────────────────────────────────────────────── */}
      {(hasCategorizedSkills || flatSkillsList.length > 0) && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Technical Skills</h2>

          <div className="pt-0.5">
            {hasCategorizedSkills ? (
              <div className="space-y-1.5 text-slate-800 text-[14px] print:text-[11pt] leading-[1.5]">
                {skills.programmingLanguages?.length > 0 && (
                  <div>
                    <strong className="text-slate-900 font-bold">Programming Languages: </strong>
                    <span>
                      {Array.isArray(skills.programmingLanguages)
                        ? skills.programmingLanguages.join(", ")
                        : skills.programmingLanguages}
                    </span>
                  </div>
                )}

                {skills.frameworks?.length > 0 && (
                  <div>
                    <strong className="text-slate-900 font-bold">Frameworks &amp; Libraries: </strong>
                    <span>
                      {Array.isArray(skills.frameworks)
                        ? skills.frameworks.join(", ")
                        : skills.frameworks}
                    </span>
                  </div>
                )}

                {skills.tools?.length > 0 && (
                  <div>
                    <strong className="text-slate-900 font-bold">Developer Tools &amp; Cloud: </strong>
                    <span>
                      {Array.isArray(skills.tools) ? skills.tools.join(", ") : skills.tools}
                    </span>
                  </div>
                )}

                {skills.other?.length > 0 && (
                  <div>
                    <strong className="text-slate-900 font-bold">Core Fundamentals: </strong>
                    <span>
                      {Array.isArray(skills.other) ? skills.other.join(", ") : skills.other}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-800 text-[14px] print:text-[11pt] leading-[1.5]">
                {flatSkillsList.join("  ·  ")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. WORK EXPERIENCE / INTERNSHIPS
          ───────────────────────────────────────────────────────────── */}
      {experience?.length > 0 && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Experience</h2>

          <div className="space-y-4 pt-0.5">
            {experience.map((exp, i) => {
              const bullets = Array.isArray(exp.description)
                ? exp.description
                : exp.description
                ? String(exp.description).split(/[\n•\-]+/).map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={i} className="resume-entry break-inside-avoid">
                  {/* Line 1: Company Name (Bold) on Left, Duration (Muted) on Right */}
                  <div className="flex justify-between items-baseline flex-wrap gap-x-3 gap-y-0.5">
                    <div className="text-[14.5px] print:text-[11.5pt]">
                      <span className="font-bold text-slate-900">
                        {exp.company || exp.companyName}
                      </span>
                      {exp.location && (
                        <span className="text-slate-500 font-normal text-[13px] print:text-[10pt]">
                          {" "}— {exp.location}
                        </span>
                      )}
                    </div>

                    {exp.duration && (
                      <span className="text-slate-600 font-normal text-[13px] print:text-[10pt] shrink-0">
                        {exp.duration}
                      </span>
                    )}
                  </div>

                  {/* Line 2: Role / Position Title */}
                  <div className="text-[13.5px] print:text-[10.5pt] text-slate-700 italic font-medium mt-0.5">
                    {exp.role || exp.title || "Software Engineer"}
                  </div>

                  {/* Bullet points: 11pt font, 1.5 line-height, consistent indentation */}
                  {bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-5 text-[14px] print:text-[11pt] text-slate-800 space-y-1.5 mt-2 leading-[1.5]">
                      {bullets.map((b, j) => (
                        <li key={j} className="pl-0.5">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TECHNICAL PROJECTS
          ───────────────────────────────────────────────────────────── */}
      {projects?.length > 0 && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Projects</h2>

          <div className="space-y-4 pt-0.5">
            {projects.map((proj, i) => {
              const bullets = Array.isArray(proj.description)
                ? proj.description
                : proj.description
                ? String(proj.description).split(/[\n•\-]+/).map((s) => s.trim()).filter(Boolean)
                : [];

              return (
                <div key={i} className="resume-entry break-inside-avoid">
                  {/* Project Title Row: Flex Space-Between */}
                  <div className="flex justify-between items-baseline flex-wrap gap-x-3 gap-y-1">
                    {/* Left: Project Name + Tech Stack */}
                    <div className="text-[14.5px] print:text-[11.5pt]">
                      <strong className="font-bold text-slate-900">
                        {proj.name || proj.title}
                      </strong>
                      {proj.technologies && (
                        <span className="text-slate-600 font-normal text-[13.5px] print:text-[10.5pt]">
                          {" "}| <span className="italic">{proj.technologies}</span>
                        </span>
                      )}
                    </div>

                    {/* Right: Code | Live Demo Links (Right-Aligned, Clean 12px Gap) */}
                    {(proj.github || proj.live || proj.link) && (
                      <div className="flex items-center gap-2.5 text-[11.5px] sm:text-[12px] print:text-[9.5pt] font-medium shrink-0 ml-auto">
                        {proj.github && (
                          <a
                            href={proj.github.startsWith("http") ? proj.github : `https://${proj.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Code
                          </a>
                        )}

                        {proj.github && (proj.live || proj.link) && (
                          <span className="text-slate-300 font-normal select-none">|</span>
                        )}

                        {(proj.live || proj.link) && (
                          <a
                            href={
                              (proj.live || proj.link).startsWith("http")
                                ? (proj.live || proj.link)
                                : `https://${proj.live || proj.link}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Live Demo
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bullets */}
                  {bullets.length > 0 && (
                    <ul className="list-disc list-outside pl-5 text-[14px] print:text-[11pt] text-slate-800 space-y-1.5 mt-2 leading-[1.5]">
                      {bullets.map((b, j) => (
                        <li key={j} className="pl-0.5">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. EDUCATION
          ───────────────────────────────────────────────────────────── */}
      {education?.length > 0 && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Education</h2>

          <div className="space-y-3 pt-0.5 text-[14px] print:text-[11pt] leading-[1.5]">
            {sortEducation(education).map((edu, i) => {
              const inst = edu.college || edu.school || edu.institution || "";
              const deg =
                edu.degree ||
                (edu.level === "10th"
                  ? "Secondary School"
                  : edu.level === "12th"
                  ? "Senior Secondary"
                  : "");
              const branch = edu.branch || edu.stream || edu.specialization || "";
              const branchStr = branch ? `, ${branch}` : "";
              const cgpaStr = edu.cgpa
                ? String(edu.cgpa).includes("%")
                  ? `Percentage: ${edu.cgpa}`
                  : `CGPA: ${edu.cgpa}`
                : "";
              const years =
                edu.startYear && edu.endYear
                  ? `${edu.startYear} – ${edu.endYear}`
                  : edu.endYear || edu.passingYear || edu.startYear || "";

              return (
                <div key={i} className="resume-entry break-inside-avoid">
                  {/* Line 1: Institution (Bold) on Left, Duration (Muted) on Right */}
                  <div className="flex justify-between items-baseline flex-wrap gap-x-3 gap-y-0.5">
                    <strong className="font-bold text-slate-900 text-[14.5px] print:text-[11.5pt]">
                      {inst}
                    </strong>
                    {years && (
                      <span className="text-slate-600 font-normal text-[13px] print:text-[10pt] shrink-0">
                        {years}
                      </span>
                    )}
                  </div>

                  {/* Line 2: Degree, Branch & CGPA */}
                  {(deg || cgpaStr) && (
                    <div className="text-[13.5px] print:text-[10.5pt] text-slate-700 mt-0.5 flex flex-wrap gap-x-2">
                      {deg && (
                        <span className="italic font-medium text-slate-700">
                          {deg}
                          {branchStr}
                        </span>
                      )}
                      {deg && cgpaStr && <span className="text-slate-400 font-normal">|</span>}
                      {cgpaStr && <span className="text-slate-600 font-normal">{cgpaStr}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. CERTIFICATIONS (If present)
          ───────────────────────────────────────────────────────────── */}
      {certifications?.length > 0 && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Certifications</h2>
          <div className="pt-0.5">
            <ul className="list-disc list-outside pl-5 text-[14px] print:text-[11pt] text-slate-800 space-y-1.5 leading-[1.5]">
              {certifications.map((c, i) => (
                <li key={i} className="pl-0.5">
                  <strong className="font-semibold text-slate-900">{c.name || c.title}</strong>
                  {c.issuer && <span className="text-slate-600"> — {c.issuer}</span>}
                  {c.year && <span className="text-slate-500 font-normal"> ({c.year})</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. KEY ACHIEVEMENTS & HONORS (If present)
          ───────────────────────────────────────────────────────────── */}
      {achievements?.length > 0 && (
        <section className={`resume-section ${sectionSpacing} break-inside-avoid`}>
          <h2 className={headingStyle}>Key Achievements &amp; Honors</h2>
          <div className="pt-0.5">
            <ul className="list-disc list-outside pl-5 text-[14px] print:text-[11pt] text-slate-800 space-y-1.5 leading-[1.5]">
              {achievements.map((a, i) => (
                <li key={i} className="pl-0.5">
                  <strong className="font-semibold text-slate-900">{a.title}</strong>
                  {a.description ? ` — ${a.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Print stylesheet to enforce single horizontal contact row & zero label duplication */}
      <style>{`
        @media print {
          .ats-resume-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
          }
          .ats-resume-container header.resume-header,
          .ats-resume-container .resume-header {
            display: block !important;
            width: 100% !important;
            text-align: ${isModern ? "left" : "center"} !important;
            margin-bottom: 1.25rem !important;
          }
          .ats-resume-container .resume-contact-row,
          #resume-print-area .resume-contact-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: ${isModern ? "flex-start" : "center"} !important;
            gap: 4px 8px !important;
            margin-top: 6px !important;
            margin-bottom: 0 !important;
            width: 100% !important;
            text-align: ${isModern ? "left" : "center"} !important;
          }
          .ats-resume-container .resume-contact-item,
          .ats-resume-container .resume-contact-link,
          #resume-print-area .resume-contact-item,
          #resume-print-area .resume-contact-link {
            display: inline-block !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
          }
          .ats-resume-container .resume-contact-separator,
          #resume-print-area .resume-contact-separator {
            display: inline-block !important;
            padding: 0 6px !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
          }
          .ats-resume-container a {
            text-decoration: none !important;
            color: inherit !important;
          }
          .ats-resume-container a[href]:after {
            content: "" !important;
          }
          .ats-resume-container .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ATSSafeResumeRenderer;

