import React from "react";

const ClassicTemplate = ({ data }) => {
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data || {};

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto text-[13px] leading-relaxed font-serif">
      <header className="text-center border-b-2 border-gray-800 pb-3 mb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{personal?.fullName}</h1>
        <p className="text-xs text-gray-600 mt-1">
          {[personal?.email, personal?.phone, personal?.location].filter(Boolean).join("  |  ")}
        </p>
        <p className="text-xs text-blue-800 mt-0.5">
          {[personal?.linkedin && "LinkedIn", personal?.github && "GitHub", personal?.portfolio && "Portfolio"]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
      </header>

      {summary && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Summary</h2>
          <p>{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Experience</h2>
          {experience.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between font-semibold">
                <span>{e.role} — {e.company}</span>
                <span className="text-gray-600 font-normal">{e.duration}</span>
              </div>
              <ul className="list-disc list-inside">
                {(e.description || []).map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {projects?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Projects</h2>
          {projects.map((p, i) => (
            <div key={i} className="mb-2">
              <div className="font-semibold">{p.name} <span className="font-normal text-gray-600">| {p.technologies}</span></div>
              <ul className="list-disc list-inside">
                {(p.description || []).map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {education?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Education</h2>
          {education.map((e, i) => (
            <div key={i} className="flex justify-between mb-1">
              <div>
                <strong>{e.college}</strong> — {e.degree}{e.branch ? `, ${e.branch}` : ""}
                {e.cgpa && ` | CGPA: ${e.cgpa}`}
              </div>
              <span className="text-gray-600">{e.startYear}–{e.endYear}</span>
            </div>
          ))}
        </section>
      )}

      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Skills</h2>
          <p>
            {[
              ...(skills.programmingLanguages || []),
              ...(skills.frameworks || []),
              ...(skills.tools || []),
              ...(skills.other || []),
            ].join(" · ")}
          </p>
        </section>
      )}

      {certifications?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Certifications</h2>
          {certifications.map((c, i) => (
            <div key={i}>{c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}</div>
          ))}
        </section>
      )}

      {achievements?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase border-b border-gray-400 pb-0.5 mb-1">Achievements</h2>
          {achievements.map((a, i) => (
            <div key={i}><strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ""}</div>
          ))}
        </section>
      )}
    </div>
  );
};

export default ClassicTemplate;