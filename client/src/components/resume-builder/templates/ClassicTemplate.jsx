import React from "react";
import { extractSkillsList, sortEducation } from "../../../utils/resumeHelpers";

const ClassicTemplate = ({ data }) => {
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data || {};
  const skillsList = extractSkillsList(skills);

  return (
    <div className="bg-white text-gray-900 px-6 py-4 print:p-0 max-w-[800px] mx-auto text-[11px] leading-[1.35] font-serif print:text-[10.5px] print:leading-[1.3]">
      {/* Header — candidate details */}
      <div className="resume-header text-center border-b border-gray-800 pb-1.5 mb-2">
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-gray-900">{personal?.fullName}</h1>
        <p className="text-[11px] text-gray-700 mt-0.5 font-medium">
          {[personal?.email, personal?.phone, personal?.location].filter(Boolean).join("  |  ")}
        </p>
        {(personal?.linkedin || personal?.github || personal?.portfolio) && (
          <p className="text-[10.5px] text-blue-800 mt-0.5 font-medium flex items-center justify-center gap-2">
            {[
              personal?.linkedin && (
                <a
                  key="li"
                  href={personal.linkedin.startsWith("http") ? personal.linkedin : `https://${personal.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  LinkedIn
                </a>
              ),
              personal?.github && (
                <a
                  key="gh"
                  href={personal.github.startsWith("http") ? personal.github : `https://${personal.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  GitHub
                </a>
              ),
              personal?.portfolio && (
                <a
                  key="pf"
                  href={personal.portfolio.startsWith("http") ? personal.portfolio : `https://${personal.portfolio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  Portfolio
                </a>
              ),
            ]
              .filter(Boolean)
              .reduce((acc, el, idx) => (idx === 0 ? [el] : [...acc, <span key={`sep-${idx}`} className="text-gray-400">·</span>, el]), [])}
          </p>
        )}
      </div>

      {summary && (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Professional Summary</h2>
          <p className="text-gray-800 text-[11px] leading-[1.35]">{summary}</p>
        </section>
      )}

      {/* Technical Skills — Categorized for ATS Parsers */}
      {skills && typeof skills === "object" && !Array.isArray(skills) && (skills.programmingLanguages?.length > 0 || skills.frameworks?.length > 0 || skills.tools?.length > 0 || skills.other?.length > 0) ? (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Technical Skills</h2>
          <div className="space-y-0.5 text-[11px] text-gray-800">
            {skills.programmingLanguages?.length > 0 && (
              <p><strong>Languages:</strong> {Array.isArray(skills.programmingLanguages) ? skills.programmingLanguages.join(", ") : skills.programmingLanguages}</p>
            )}
            {skills.frameworks?.length > 0 && (
              <p><strong>Frameworks & Libraries:</strong> {Array.isArray(skills.frameworks) ? skills.frameworks.join(", ") : skills.frameworks}</p>
            )}
            {skills.tools?.length > 0 && (
              <p><strong>Developer Tools & Databases:</strong> {Array.isArray(skills.tools) ? skills.tools.join(", ") : skills.tools}</p>
            )}
            {skills.other?.length > 0 && (
              <p><strong>Core Fundamentals:</strong> {Array.isArray(skills.other) ? skills.other.join(", ") : skills.other}</p>
            )}
          </div>
        </section>
      ) : skillsList.length > 0 ? (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Technical Skills</h2>
          <p className="text-gray-800 text-[11px]">{skillsList.join(" · ")}</p>
        </section>
      ) : null}

      {/* Projects */}
      {projects?.length > 0 && (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Projects</h2>
          {projects.map((p, i) => (
            <div key={i} className="mb-1.5 print:mb-1">
              <div className="font-semibold text-gray-900 text-[11px]">
                {p.name} {p.technologies && <span className="font-normal text-gray-600 text-[10.5px]">| {p.technologies}</span>}
              </div>
              <ul className="list-disc list-outside ml-4 text-[10.5px] print:text-[10px] text-gray-800 space-y-0.5 mt-0.5">
                {(p.description || []).map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Experience / Internships */}
      {experience?.length > 0 && (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Experience</h2>
          {experience.map((e, i) => (
            <div key={i} className="mb-1.5 print:mb-1">
              <div className="flex justify-between items-baseline font-semibold text-gray-900 text-[11px]">
                <span>{e.role} — {e.company}</span>
                <span className="text-gray-600 font-normal text-[10px]">{e.duration}</span>
              </div>
              <ul className="list-disc list-outside ml-4 text-[10.5px] print:text-[10px] text-gray-800 space-y-0.5 mt-0.5">
                {(e.description || []).map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Key Achievements & Honors (SIH, LeetCode, Hackathons) */}
      {achievements?.length > 0 && (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Honors & Achievements</h2>
          <ul className="list-disc list-outside ml-4 text-[10.5px] print:text-[10px] text-gray-800 space-y-0.5">
            {achievements.map((a, i) => (
              <li key={i}>
                <strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Education */}
      {education?.length > 0 && (
        <section className="mb-2 print:mb-1.5 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Education</h2>
          {sortEducation(education).map((e, i) => {
            const instName = e.college || e.school || e.institution || "";
            const degreeName = e.degree || (e.level === "10th" ? "10th / Secondary" : e.level === "12th" ? "12th / Senior Secondary" : "");
            const branchName = e.branch || e.stream || e.specialization || "";
            const branchText = branchName ? (e.level === "12th" ? ` — Stream: ${branchName}` : `, ${branchName}`) : "";
            const scoreText = e.cgpa ? (String(e.cgpa).includes("%") ? ` | Percentage: ${e.cgpa}` : ` | CGPA: ${e.cgpa}`) : "";
            const yearText = e.startYear && e.endYear ? `${e.startYear}–${e.endYear}` : (e.endYear || e.passingYear || e.startYear || "");

            return (
              <div key={i} className="flex justify-between items-baseline mb-0.5 text-[11px]">
                <div>
                  <strong>{instName}</strong>
                  {degreeName && ` — ${degreeName}${branchText}`}
                  {scoreText}
                </div>
                {yearText && <span className="text-gray-600 text-[10px] shrink-0 ml-2">{yearText}</span>}
              </div>
            );
          })}
        </section>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <section className="mb-1.5 print:mb-1 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase border-b border-gray-400 pb-0.5 mb-1 text-gray-900 tracking-wider">Certifications</h2>
          <div className="space-y-0.5">
            {certifications.map((c, i) => (
              <div key={i} className="text-[10.5px] print:text-[10px] text-gray-800">
                <strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClassicTemplate;