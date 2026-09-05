import React from "react";

const TwoColumnTemplate = ({ data }) => {
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
    <div className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto text-[12.5px] leading-relaxed font-serif">
      {/* Header – centered formal */}
      <header className="text-center border-b border-gray-400 pb-3 mb-4">
        <h1 className="text-2xl font-bold tracking-wide">{personal?.fullName}</h1>
        <p className="text-[11px] text-gray-600 mt-1">
          {[personal?.location, personal?.email, personal?.phone]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {[
            personal?.linkedin && "LinkedIn",
            personal?.github && "GitHub",
            personal?.portfolio && "Portfolio",
          ]
            .filter(Boolean)
            .join("  |  ")}
        </p>
      </header>

      {summary && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-center mb-1">
            Summary
          </h2>
          <p className="text-justify text-gray-800">{summary}</p>
        </section>
      )}

      {/* Two column body */}
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-4">
          {education?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Education
              </h2>
              {education.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="font-semibold">{e.degree}{e.branch ? ` in ${e.branch}` : ""}</div>
                  <div className="text-gray-700">{e.college}</div>
                  <div className="text-gray-500 text-[11px]">
                    {e.startYear} – {e.endYear}
                    {e.cgpa ? `  |  CGPA: ${e.cgpa}` : ""}
                  </div>
                </div>
              ))}
            </section>
          )}

          {(skills?.programmingLanguages?.length > 0 ||
            skills?.frameworks?.length > 0) && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Skills
              </h2>
              <div className="space-y-1">
                {skills.programmingLanguages?.length > 0 && (
                  <div>
                    <span className="font-semibold">Languages: </span>
                    {skills.programmingLanguages.join(", ")}
                  </div>
                )}
                {skills.frameworks?.length > 0 && (
                  <div>
                    <span className="font-semibold">Frameworks: </span>
                    {skills.frameworks.join(", ")}
                  </div>
                )}
                {skills.tools?.length > 0 && (
                  <div>
                    <span className="font-semibold">Tools: </span>
                    {skills.tools.join(", ")}
                  </div>
                )}
                {skills.other?.length > 0 && (
                  <div>
                    <span className="font-semibold">Other: </span>
                    {skills.other.join(", ")}
                  </div>
                )}
              </div>
            </section>
          )}

          {certifications?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Certifications
              </h2>
              {certifications.map((c, i) => (
                <div key={i} className="mb-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-gray-600 text-[11px]">
                    {c.issuer}
                    {c.year ? ` (${c.year})` : ""}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {experience?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Experience
              </h2>
              {experience.map((e, i) => (
                <div key={i} className="mb-2">
                  <div className="font-semibold">{e.role}</div>
                  <div className="text-gray-700 italic">{e.company}</div>
                  <div className="text-gray-500 text-[11px] mb-0.5">{e.duration}</div>
                  <ul className="list-disc list-inside text-gray-800">
                    {(e.description || []).map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {projects?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Projects
              </h2>
              {projects.map((p, i) => (
                <div key={i} className="mb-2">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-gray-500 text-[11px] mb-0.5">{p.technologies}</div>
                  <ul className="list-disc list-inside text-gray-800">
                    {(p.description || []).map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {achievements?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase tracking-widest border-b border-gray-400 pb-0.5 mb-2">
                Achievements
              </h2>
              {achievements.map((a, i) => (
                <div key={i} className="mb-1">
                  <span className="font-semibold">{a.title}</span>
                  {a.description ? ` — ${a.description}` : ""}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoColumnTemplate;