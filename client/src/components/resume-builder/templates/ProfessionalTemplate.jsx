import React from 'react';

const ProfessionalTemplate = ({ data }) => {
  if (!data) return null;
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[800px] mx-auto font-serif text-sm leading-relaxed">
      {/* Header */}
      <header className="border-b-2 border-gray-800 pb-4 mb-5 text-center">
        <h1 className="text-2xl font-bold tracking-wide uppercase">{personal?.fullName}</h1>
        <div className="mt-2 text-xs text-gray-600 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {personal?.email && <span>{personal.email}</span>}
          {personal?.phone && <span>• {personal.phone}</span>}
          {personal?.location && <span>• {personal.location}</span>}
        </div>
        <div className="mt-1 text-xs text-blue-800 flex flex-wrap justify-center gap-x-3">
          {personal?.linkedin && <a href={personal.linkedin} className="hover:underline">LinkedIn</a>}
          {personal?.github && <a href={personal.github} className="hover:underline">GitHub</a>}
          {personal?.portfolio && <a href={personal.portfolio} className="hover:underline">Portfolio</a>}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Summary</h2>
          <p className="text-justify">{summary}</p>
        </section>
      )}

      {/* Education */}
      {education?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <strong>{edu.college}</strong>
                <span className="text-gray-600">{edu.startYear} – {edu.endYear}</span>
              </div>
              <div>{edu.degree}{edu.branch ? `, ${edu.branch}` : ''}{edu.cgpa ? ` | CGPA: ${edu.cgpa}` : ''}</div>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Skills</h2>
          <div className="space-y-1">
            {skills.programmingLanguages?.length > 0 && (
              <div><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</div>
            )}
            {skills.frameworks?.length > 0 && (
              <div><strong>Frameworks:</strong> {skills.frameworks.join(', ')}</div>
            )}
            {skills.tools?.length > 0 && (
              <div><strong>Tools:</strong> {skills.tools.join(', ')}</div>
            )}
            {skills.other?.length > 0 && (
              <div><strong>Other:</strong> {skills.other.join(', ')}</div>
            )}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong>{exp.role}</strong>
                <span className="text-gray-600">{exp.duration}</span>
              </div>
              <div className="italic text-gray-700">{exp.company}</div>
              {exp.description?.length > 0 && (
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {exp.description.map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between items-baseline">
                <strong>{proj.name}</strong>
                <span className="text-xs text-gray-500">{proj.technologies}</span>
              </div>
              {proj.description?.length > 0 && (
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {proj.description.map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              )}
              <div className="text-xs mt-1 space-x-3">
                {proj.github && <a href={proj.github} className="text-blue-700 hover:underline">GitHub</a>}
                {proj.live && <a href={proj.live} className="text-blue-700 hover:underline">Live</a>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {certifications?.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Certifications</h2>
          {certifications.map((c, i) => (
            <div key={i} className="mb-1">
              <strong>{c.name}</strong>
              {c.issuer && ` — ${c.issuer}`}
              {c.year && ` (${c.year})`}
            </div>
          ))}
        </section>
      )}

      {/* Achievements */}
      {achievements?.length > 0 && (
        <section className="mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-400 pb-1 mb-2">Achievements</h2>
          {achievements.map((a, i) => (
            <div key={i} className="mb-1">
              <strong>{a.title}</strong>
              {a.description && <span> — {a.description}</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default ProfessionalTemplate;
