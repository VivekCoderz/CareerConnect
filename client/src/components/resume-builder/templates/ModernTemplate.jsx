import React from 'react';

const ModernTemplate = ({ data }) => {
  if (!data) return null;
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data;

  return (
    <div className="bg-white text-gray-800 p-8 max-w-[800px] mx-auto font-sans text-sm">
      {/* Header with accent */}
      <header className="bg-teal-800 text-white -mx-8 -mt-8 px-8 py-6 mb-6">
        <h1 className="text-2xl font-bold">{personal?.fullName}</h1>
        <div className="mt-2 text-teal-100 text-xs flex flex-wrap gap-x-4 gap-y-1">
          {personal?.email && <span>{personal.email}</span>}
          {personal?.phone && <span>{personal.phone}</span>}
          {personal?.location && <span>{personal.location}</span>}
          {personal?.linkedin && <a href={personal.linkedin} className="underline">LinkedIn</a>}
          {personal?.github && <a href={personal.github} className="underline">GitHub</a>}
          {personal?.portfolio && <a href={personal.portfolio} className="underline">Portfolio</a>}
        </div>
      </header>

      {summary && (
        <section className="mb-5">
          <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Professional Summary</h2>
          <p className="text-gray-700 leading-relaxed">{summary}</p>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column – skills & education */}
        <div className="md:col-span-1 space-y-5">
          {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Skills</h2>
              <div className="space-y-2 text-xs">
                {skills.programmingLanguages?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600">Languages</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.programmingLanguages.map((s) => (
                        <span key={s} className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.frameworks?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600">Frameworks</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.frameworks.map((s) => (
                        <span key={s} className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.tools?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600">Tools</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.tools.map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {skills.other?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600">Other</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skills.other.map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {education?.length > 0 && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Education</h2>
              {education.map((edu, i) => (
                <div key={i} className="mb-3 text-xs">
                  <div className="font-semibold">{edu.college}</div>
                  <div>{edu.degree}{edu.branch ? ` · ${edu.branch}` : ''}</div>
                  <div className="text-gray-500">{edu.startYear} – {edu.endYear}</div>
                  {edu.cgpa && <div>CGPA: {edu.cgpa}</div>}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-5">
          {experience?.length > 0 && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Experience</h2>
              {experience.map((exp, i) => (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{exp.role}</span>
                    <span className="text-xs text-gray-500">{exp.duration}</span>
                  </div>
                  <div className="text-teal-700 text-xs font-medium">{exp.company}</div>
                  {exp.description?.length > 0 && (
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-700">
                      {exp.description.map((d, j) => <li key={j}>{d}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {projects?.length > 0 && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Projects</h2>
              {projects.map((proj, i) => (
                <div key={i} className="mb-4">
                  <div className="font-semibold">{proj.name}</div>
                  <div className="text-xs text-gray-500 mb-1">{proj.technologies}</div>
                  {proj.description?.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                      {proj.description.map((d, j) => <li key={j}>{d}</li>)}
                    </ul>
                  )}
                  <div className="text-xs mt-1 space-x-3">
                    {proj.github && <a href={proj.github} className="text-teal-700 hover:underline">GitHub</a>}
                    {proj.live && <a href={proj.live} className="text-teal-700 hover:underline">Live Demo</a>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {certifications?.length > 0 && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Certifications</h2>
              {certifications.map((c, i) => (
                <div key={i} className="text-sm mb-1">
                  <span className="font-medium">{c.name}</span>
                  {c.issuer && <span className="text-gray-600"> · {c.issuer}</span>}
                  {c.year && <span className="text-gray-500"> ({c.year})</span>}
                </div>
              ))}
            </section>
          )}

          {achievements?.length > 0 && (
            <section>
              <h2 className="text-teal-800 font-bold text-base border-b-2 border-teal-600 pb-1 mb-2">Achievements</h2>
              {achievements.map((a, i) => (
                <div key={i} className="mb-1">
                  <span className="font-medium">{a.title}</span>
                  {a.description && <span className="text-gray-600"> — {a.description}</span>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;
