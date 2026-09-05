import React from "react";

const SidebarTemplate = ({ data }) => {
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data || {};

  return (
    <div className="bg-white text-gray-900 max-w-[800px] mx-auto text-[12.5px] leading-relaxed flex">
      {/* Left sidebar */}
      <aside className="w-[32%] bg-slate-800 text-white p-5 min-h-[900px]">
        <h1 className="text-lg font-bold leading-tight mb-3">{personal?.fullName}</h1>
        <div className="space-y-1 text-[11px] text-slate-200 mb-5">
          {personal?.email && <div>{personal.email}</div>}
          {personal?.phone && <div>{personal.phone}</div>}
          {personal?.location && <div>{personal.location}</div>}
          {personal?.linkedin && <div>LinkedIn</div>}
          {personal?.github && <div>GitHub</div>}
          {personal?.portfolio && <div>Portfolio</div>}
        </div>

        {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
          <div className="mb-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-500 pb-1 mb-2">Skills</h2>
            <div className="space-y-2 text-[11px]">
              {skills.programmingLanguages?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-0.5">Languages</div>
                  <div>{skills.programmingLanguages.join(", ")}</div>
                </div>
              )}
              {skills.frameworks?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-0.5">Frameworks</div>
                  <div>{skills.frameworks.join(", ")}</div>
                </div>
              )}
              {skills.tools?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-0.5">Tools</div>
                  <div>{skills.tools.join(", ")}</div>
                </div>
              )}
              {skills.other?.length > 0 && (
                <div>
                  <div className="text-slate-400 mb-0.5">Other</div>
                  <div>{skills.other.join(", ")}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {education?.length > 0 && (
          <div className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-500 pb-1 mb-2">Education</h2>
            {education.map((e, i) => (
              <div key={i} className="mb-2 text-[11px]">
                <div className="font-semibold">{e.college}</div>
                <div className="text-slate-300">{e.degree}{e.branch ? ` · ${e.branch}` : ""}</div>
                <div className="text-slate-400">{e.startYear}–{e.endYear}</div>
                {e.cgpa && <div className="text-slate-400">CGPA {e.cgpa}</div>}
              </div>
            ))}
          </div>
        )}

        {certifications?.length > 0 && (
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-500 pb-1 mb-2">Certifications</h2>
            {certifications.map((c, i) => (
              <div key={i} className="mb-1 text-[11px]">
                <div className="font-medium">{c.name}</div>
                <div className="text-slate-400">{c.issuer}{c.year ? ` · ${c.year}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="w-[68%] p-6">
        {summary && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 border-b-2 border-slate-800 pb-1 mb-2">Summary</h2>
            <p className="text-gray-700">{summary}</p>
          </section>
        )}

        {experience?.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 border-b-2 border-slate-800 pb-1 mb-2">Experience</h2>
            {experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between">
                  <strong>{e.role}</strong>
                  <span className="text-gray-500 text-[11px]">{e.duration}</span>
                </div>
                <div className="text-slate-600 text-xs mb-0.5">{e.company}</div>
                <ul className="list-disc list-inside text-gray-700">
                  {(e.description || []).map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {projects?.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs font-bold uppercase text-slate-800 border-b-2 border-slate-800 pb-1 mb-2">Projects</h2>
            {projects.map((p, i) => (
              <div key={i} className="mb-2">
                <strong>{p.name}</strong>
                <div className="text-[11px] text-gray-500">{p.technologies}</div>
                <ul className="list-disc list-inside text-gray-700">
                  {(p.description || []).map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              </div>
            ))}
          </section>
        )}

        {achievements?.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase text-slate-800 border-b-2 border-slate-800 pb-1 mb-2">Achievements</h2>
            {achievements.map((a, i) => (
              <div key={i} className="mb-1">
                <strong>{a.title}</strong>{a.description ? ` — ${a.description}` : ""}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default SidebarTemplate;