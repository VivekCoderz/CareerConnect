import React from "react";

const ExecutiveTemplate = ({ data }) => {
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data || {};

  return (
    <div className="bg-white text-gray-900 max-w-[800px] mx-auto text-[13px] leading-relaxed">
      <header className="bg-slate-900 text-white px-8 py-5">
        <h1 className="text-2xl font-bold tracking-wide">{personal?.fullName}</h1>
        <p className="text-slate-300 text-xs mt-1">
          {[personal?.email, personal?.phone, personal?.location].filter(Boolean).join("  •  ")}
        </p>
      </header>

      <div className="px-8 py-5">
        {summary && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider mb-1">Professional Summary</h2>
            <p className="text-gray-700">{summary}</p>
          </section>
        )}

        {experience?.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Experience</h2>
            {experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between">
                  <strong>{e.role}</strong>
                  <span className="text-gray-500 text-xs">{e.duration}</span>
                </div>
                <div className="text-slate-600 italic text-xs">{e.company}</div>
                <ul className="list-disc list-inside mt-1 text-gray-700">
                  {(e.description || []).map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {projects?.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Projects</h2>
            {projects.map((p, i) => (
              <div key={i} className="mb-2">
                <strong>{p.name}</strong> <span className="text-gray-500 text-xs">({p.technologies})</span>
                <ul className="list-disc list-inside text-gray-700">
                  {(p.description || []).map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {education?.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Education</h2>
            {education.map((e, i) => (
              <div key={i} className="flex justify-between mb-1">
                <span><strong>{e.college}</strong> — {e.degree}{e.branch ? `, ${e.branch}` : ""}</span>
                <span className="text-gray-500 text-xs">{e.startYear}–{e.endYear}</span>
              </div>
            ))}
          </section>
        )}

        {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Skills</h2>
            <p className="text-gray-700">
              {[...(skills.programmingLanguages || []), ...(skills.frameworks || []), ...(skills.tools || []), ...(skills.other || [])].join(" • ")}
            </p>
          </section>
        )}

        {certifications?.length > 0 && (
          <section className="mb-3">
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Certifications</h2>
            {certifications.map((c, i) => (
              <div key={i}>{c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}</div>
            ))}
          </section>
        )}

        {achievements?.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300 pb-1 mb-2">Achievements</h2>
            {achievements.map((a, i) => (
              <div key={i}><strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ""}</div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default ExecutiveTemplate;