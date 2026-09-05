import React from "react";

const ElegantTemplate = ({ data }) => {
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
    <div className="bg-white text-gray-900 p-10 max-w-[800px] mx-auto text-[13px] leading-relaxed font-sans">
      <header className="mb-6">
        <h1 className="text-3xl font-light tracking-tight text-gray-900">
          {personal?.fullName}
        </h1>
        <p className="text-xs text-gray-500 mt-2">
          {[personal?.email, personal?.phone, personal?.location]
            .filter(Boolean)
            .join("   ·   ")}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {[
            personal?.linkedin && "LinkedIn",
            personal?.github && "GitHub",
            personal?.portfolio && "Portfolio",
          ]
            .filter(Boolean)
            .join("   ·   ")}
        </p>
      </header>

      {summary && (
        <section className="mb-6">
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Experience
          </h2>
          {experience.map((e, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-baseline">
                <span className="font-medium">
                  {e.role} · {e.company}
                </span>
                <span className="text-xs text-gray-400">{e.duration}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-gray-600">
                {(e.description || []).map((d, j) => (
                  <li key={j} className="flex">
                    <span className="mr-2 text-gray-300">–</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {projects?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Projects
          </h2>
          {projects.map((p, i) => (
            <div key={i} className="mb-4">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-gray-400 mb-1">{p.technologies}</div>
              <ul className="space-y-0.5 text-gray-600">
                {(p.description || []).map((d, j) => (
                  <li key={j} className="flex">
                    <span className="mr-2 text-gray-300">–</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {education?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Education
          </h2>
          {education.map((e, i) => (
            <div key={i} className="flex justify-between mb-1">
              <div>
                <span className="font-medium">{e.college}</span>
                <span className="text-gray-500">
                  {" "}
                  — {e.degree}
                  {e.branch ? `, ${e.branch}` : ""}
                </span>
                {e.cgpa && (
                  <span className="text-xs text-gray-400 ml-2">CGPA {e.cgpa}</span>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {e.startYear}–{e.endYear}
              </span>
            </div>
          ))}
        </section>
      )}

      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
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
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Certifications
          </h2>
          {certifications.map((c, i) => (
            <div key={i} className="text-gray-700">
              {c.name}
              {c.issuer ? ` · ${c.issuer}` : ""}
              {c.year ? ` (${c.year})` : ""}
            </div>
          ))}
        </section>
      )}

      {achievements?.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Achievements
          </h2>
          {achievements.map((a, i) => (
            <div key={i} className="mb-1 text-gray-700">
              <span className="font-medium">{a.title}</span>
              {a.description ? ` — ${a.description}` : ""}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default ElegantTemplate;