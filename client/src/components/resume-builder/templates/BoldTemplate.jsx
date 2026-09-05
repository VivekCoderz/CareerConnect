import React from "react";

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

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto text-[13px] leading-relaxed font-sans">
      {/* Bold header */}
      <header className="border-b-4 border-blue-600 pb-3 mb-5">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {personal?.fullName}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {[personal?.email, personal?.phone, personal?.location]
            .filter(Boolean)
            .join("  |  ")}
        </p>
        <p className="text-xs text-blue-700 mt-1">
          {[
            personal?.linkedin && "LinkedIn",
            personal?.github && "GitHub",
            personal?.portfolio && "Portfolio",
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </header>

      {summary && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-1">
            Summary
          </h2>
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
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
          {education.map((e, i) => (
            <div key={i} className="flex justify-between mb-1">
              <span>
                <strong>{e.college}</strong> — {e.degree}
                {e.branch ? `, ${e.branch}` : ""}
                {e.cgpa ? ` · CGPA ${e.cgpa}` : ""}
              </span>
              <span className="text-xs text-gray-500">
                {e.startYear}–{e.endYear}
              </span>
            </div>
          ))}
        </section>
      )}

      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase text-blue-700 tracking-wider border-b border-blue-200 pb-1 mb-2">
            Skills
          </h2>
          <p className="text-gray-700">
            {[
              ...(skills.programmingLanguages || []),
              ...(skills.frameworks || []),
              ...(skills.tools || []),
              ...(skills.other || []),
            ].join("  ·  ")}
          </p>
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