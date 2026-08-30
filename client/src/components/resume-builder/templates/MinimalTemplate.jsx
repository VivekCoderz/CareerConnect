import React from 'react';

const MinimalTemplate = ({ data }) => {
  if (!data) return null;
  const { personal, summary, education, skills, projects, experience, certifications, achievements } = data;

  return (
    <div className="bg-white text-gray-900 p-10 max-w-[800px] mx-auto font-sans text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-light tracking-tight">{personal?.fullName}</h1>
        <div className="mt-2 text-gray-500 text-xs flex flex-wrap gap-x-4">
          {personal?.email && <span>{personal.email}</span>}
          {personal?.phone && <span>{personal.phone}</span>}
          {personal?.location && <span>{personal.location}</span>}
        </div>
        <div className="mt-1 text-xs text-gray-400 flex flex-wrap gap-x-4">
          {personal?.linkedin && <a href={personal.linkedin} className="hover:text-gray-700">LinkedIn</a>}
          {personal?.github && <a href={personal.github} className="hover:text-gray-700">GitHub</a>}
          {personal?.portfolio && <a href={personal.portfolio} className="hover:text-gray-700">Portfolio</a>}
        </div>
      </header>

      {summary && (
        <section className="mb-7">
          <p className="text-gray-700">{summary}</p>
        </section>
      )}

      {experience?.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between">
                <span className="font-medium">{exp.role} · {exp.company}</span>
                <span className="text-gray-400 text-xs">{exp.duration}</span>
              </div>
              {exp.description?.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-gray-600">
                  {exp.description.map((d, j) => (
                    <li key={j} className="flex">
                      <span className="mr-2 text-gray-300">–</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {projects?.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="mb-4">
              <div className="font-medium">{proj.name}</div>
              <div className="text-xs text-gray-400 mb-1">{proj.technologies}</div>
              {proj.description?.length > 0 && (
                <ul className="space-y-0.5 text-gray-600">
                  {proj.description.map((d, j) => (
                    <li key={j} className="flex">
                      <span className="mr-2 text-gray-300">–</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {education?.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="mb-2 flex justify-between">
              <div>
                <span className="font-medium">{edu.college}</span>
                <span className="text-gray-500"> — {edu.degree}{edu.branch ? `, ${edu.branch}` : ''}</span>
                {edu.cgpa && <span className="text-gray-400 text-xs ml-2">CGPA {edu.cgpa}</span>}
              </div>
              <span className="text-gray-400 text-xs whitespace-nowrap">{edu.startYear}–{edu.endYear}</span>
            </div>
          ))}
        </section>
      )}

      {(skills?.programmingLanguages?.length > 0 || skills?.frameworks?.length > 0) && (
        <section className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Skills</h2>
          <p className="text-gray-700">
            {[
              ...(skills.programmingLanguages || []),
              ...(skills.frameworks || []),
              ...(skills.tools || []),
              ...(skills.other || []),
            ].join(' · ')}
          </p>
        </section>
      )}

      {certifications?.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Certifications</h2>
          {certifications.map((c, i) => (
            <div key={i} className="text-gray-700">
              {c.name}{c.issuer ? ` · ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}
            </div>
          ))}
        </section>
      )}

      {achievements?.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Achievements</h2>
          {achievements.map((a, i) => (
            <div key={i} className="mb-1 text-gray-700">
              <span className="font-medium">{a.title}</span>
              {a.description && <span className="text-gray-500"> — {a.description}</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default MinimalTemplate;
