import React from "react";

const CompactTemplate = ({ data }) => {
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
    <div className="bg-white text-gray-900 p-6 max-w-[800px] mx-auto text-[12px] leading-snug font-sans">
      {/* Header */}
      <header className="flex justify-between items-end border-b-2 border-teal-700 pb-2 mb-3">
        <div>
          <h1 className="text-xl font-bold text-teal-900">{personal?.fullName}</h1>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {[personal?.email, personal?.phone, personal?.location]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
        <div className="text-right text-[10px] text-teal-800">
          {personal?.linkedin && <div>LinkedIn</div>}
          {personal?.github && <div>GitHub</div>}
          {personal?.portfolio && <div>Portfolio</div>}
        </div>
      </header>

      {summary && (
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 mb-0.5">Summary</h2>
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 mb-1">Skills</h2>
          <div className="flex flex-wrap gap-1">
            {[
              ...(skills.programmingLanguages || []),
              ...(skills.frameworks || []),
              ...(skills.tools || []),
              ...(skills.other || []),
            ].map((s) => (
              <span
                key={s}
                className="bg-teal-50 text-teal-900 border border-teal-200 px-1.5 py-0.5 rounded text-[10px]"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 border-b border-teal-200 pb-0.5 mb-1">
            Experience
          </h2>
          {experience.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <span className="font-semibold">
                  {e.role} · {e.company}
                </span>
                <span className="text-gray-500 text-[10px]">{e.duration}</span>
              </div>
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
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 border-b border-teal-200 pb-0.5 mb-1">
            Projects
          </h2>
          {projects.map((p, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-gray-500 text-[10px] shrink-0">{p.technologies}</span>
              </div>
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
        <section className="mb-3">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 border-b border-teal-200 pb-0.5 mb-1">
            Education
          </h2>
          {education.map((e, i) => (
            <div key={i} className="flex justify-between mb-0.5">
              <span>
                <strong>{e.college}</strong> — {e.degree}
                {e.branch ? `, ${e.branch}` : ""}
                {e.cgpa ? ` · CGPA ${e.cgpa}` : ""}
              </span>
              <span className="text-gray-500 text-[10px]">
                {e.startYear}–{e.endYear}
              </span>
            </div>
          ))}
        </section>
      )}

      {certifications?.length > 0 && (
        <section className="mb-2">
          <h2 className="text-[11px] font-bold uppercase text-teal-800 border-b border-teal-200 pb-0.5 mb-1">
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
          <h2 className="text-[11px] font-bold uppercase text-teal-800 border-b border-teal-200 pb-0.5 mb-1">
            Achievements
          </h2>
          {achievements.map((a, i) => (
            <div key={i}>
              <strong>{a.title}</strong>
              {a.description ? ` — ${a.description}` : ""}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default CompactTemplate;