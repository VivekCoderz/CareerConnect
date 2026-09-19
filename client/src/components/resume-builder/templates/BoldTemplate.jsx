import React from "react";
import { extractSkillsList, sortEducation } from "../../../utils/resumeHelpers";

const BoldTemplate = ({ data }) => {
  const {
    personal,
    summary,
    education,
    skills,
    projects,
    experience,
    certifications,
    achievements,
  } = data || {};
  const skillsList = extractSkillsList(skills);

  return (
    <div className="bg-white text-gray-900 px-6 py-4 print:p-0 max-w-[800px] mx-auto text-[11px] leading-[1.35] font-sans print:text-[10.5px] print:leading-[1.3]">
      {/* Header */}
      <div className="resume-header border-b-2 border-blue-600 pb-2 mb-2.5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {personal?.fullName}
        </h1>
        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
          {[personal?.email, personal?.phone, personal?.location]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </div>

      {summary && (
        <section className="mb-2.5 print:mb-2 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase text-blue-700 tracking-wider mb-0.5">
            Summary
          </h2>
          <p className="text-gray-700 text-[11px] leading-snug">{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-2.5 print:mb-2 break-inside-avoid">
          <h2 className="text-[10.5px] font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-0.5 mb-1">
            Experience
          </h2>
          {experience.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong className="text-gray-900">{e.role}</strong>
                <span className="text-xs text-gray-500">{e.duration}</span>
              </div>
              <div className="text-blue-800 text-xs font-medium mb-0.5">{e.company}</div>
              <ul className="list-disc list-inside text-gray-700">
                {(e.description || []).map((d, j) => (
                  <li key={j}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {projects?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Projects
          </h2>
          {projects.map((p, i) => (
            <div key={i} className="mb-3">
              <div className="font-semibold text-gray-900">{p.name}</div>
              <div className="text-xs text-gray-500 mb-0.5">{p.technologies}</div>
              <ul className="list-disc list-inside text-gray-700">
                {(p.description || []).map((d, j) => (
                  <li key={j}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {education?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Education
          </h2>
          {sortEducation(education).map((e, i) => {
            const instName = e.college || e.school || e.institution || "";
            const degreeName = e.degree || (e.level === "10th" ? "10th / Secondary" : e.level === "12th" ? "12th / Senior Secondary" : "");
            const branchName = e.branch || e.stream || e.specialization || "";
            const branchText = branchName ? (e.level === "12th" ? ` — Stream: ${branchName}` : `, ${branchName}`) : "";
            const scoreText = e.cgpa ? (String(e.cgpa).includes("%") ? ` · ${e.cgpa}` : ` · CGPA ${e.cgpa}`) : "";
            const yearText = e.startYear && e.endYear ? `${e.startYear}–${e.endYear}` : (e.endYear || e.passingYear || e.startYear || "");

            return (
              <div key={i} className="flex justify-between mb-1">
                <span>
                  <strong>{instName}</strong>
                  {degreeName && ` — ${degreeName}${branchText}`}
                  {scoreText}
                </span>
                {yearText && <span className="text-xs text-gray-500">{yearText}</span>}
              </div>
            );
          })}
        </section>
      )}

      {skillsList.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Skills
          </h2>
          <p className="text-gray-700">{skillsList.join("  ·  ")}</p>
        </section>
      )}

      {certifications?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Certifications
          </h2>
          {certifications.map((c, i) => (
            <div key={i}>
              {c.name}
              {c.issuer ? ` — ${c.issuer}` : ""}
              {c.year ? ` (${c.year})` : ""}
            </div>
          ))}
        </section>
      )}

      {achievements?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Achievements
          </h2>
          {achievements.map((a, i) => (
            <div key={i} className="mb-1">
              <strong>{a.title}</strong>
              {a.description ? ` — ${a.description}` : ""}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default BoldTemplate;