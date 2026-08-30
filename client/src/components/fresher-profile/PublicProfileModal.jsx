const PublicProfileModal = ({ isOpen, onClose, profile, user }) => {
  if (!isOpen) return null;

  const fullName = user?.fullName || profile?.userId?.fullName || "Fresher Candidate";
  const email = user?.email || profile?.userId?.email || "";
  const phone = user?.phone || profile?.userId?.phone || "";
  const city = profile?.location?.city || "";
  const state = profile?.location?.state || "";
  const country = profile?.location?.country || "India";
  const headline = profile?.professionalHeadline || "Software Engineering Graduate";
  const objective = profile?.careerObjective || "";
  const education = profile?.education || [];
  const projects = profile?.projects || [];
  const internships = profile?.internships || [];
  const certifications = profile?.certifications || [];
  const achievements = profile?.achievements || [];
  const codingProfiles = profile?.codingProfiles || [];
  const socialLinks = profile?.socialLinks || {};

  const skills = profile?.skills || {};
  const languages = skills.programmingLanguages || [];
  const frameworks = skills.frameworks || [];
  const databases = skills.databases || [];
  const tools = skills.tools || [];
  const softSkills = skills.softSkills || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Recruiter Preview Mode
            </span>
            <span className="text-xs text-slate-500">How hiring managers see your portfolio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center text-sm font-bold transition shadow-xs"
          >
            ✕
          </button>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-md">
              {fullName.charAt(0).toUpperCase()}
            </div>

            <div className="text-center sm:text-left flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Verified Candidate ✓
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-700">{headline}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
                {city && <span>📍 {city}, {state || country}</span>}
                {email && <span>📧 {email}</span>}
                {phone && <span>📞 {phone}</span>}
              </div>

              {/* Social Link Badges */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {socialLinks.github && (
                  <a
                    href={socialLinks.github}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
                  >
                    GitHub ↗
                  </a>
                )}
                {socialLinks.portfolio && (
                  <a
                    href={socialLinks.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold text-emerald-700 transition"
                  >
                    Portfolio ↗
                  </a>
                )}
                {codingProfiles.map((cp, idx) => (
                  <a
                    key={idx}
                    href={cp.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold text-amber-800 transition"
                  >
                    {cp.platform}: @{cp.username} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>

          {objective && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">About & Career Goal</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{objective}</p>
            </div>
          )}
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Cols: Projects & Experience */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projects */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🚀</span> Technical Projects ({projects.length})
              </h3>
              {projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map((p, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {p.projectType}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{p.title}</h4>
                        </div>
                        <div className="flex gap-2 text-xs font-semibold text-emerald-600">
                          {p.githubUrl && (
                            <a href={p.githubUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              Source ↗
                            </a>
                          )}
                          {p.liveUrl && (
                            <a href={p.liveUrl} target="_blank" rel="noreferrer" className="hover:underline">
                              Live Demo ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(p.technologies || []).map((t, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded border border-slate-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No projects listed yet.</p>
              )}
            </div>

            {/* Internships */}
            {internships.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🏢</span> Internship Experience
                </h3>
                <div className="space-y-3">
                  {internships.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.role}</h4>
                          <p className="text-xs font-semibold text-emerald-700">{item.companyName}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">{item.workMode}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🎓</span> Educational Background
              </h3>
              <div className="space-y-3">
                {education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-start p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{edu.degree}</h4>
                      <p className="text-xs text-slate-600">{edu.institution}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{edu.graduationYear}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Skills & Certifications */}
          <div className="space-y-6">
            {/* Skills */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>⚡</span> Technical Skills
              </h3>

              {languages.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Languages</span>
                  <div className="flex flex-wrap gap-1.5">
                    {languages.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {frameworks.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Frameworks & Libs</span>
                  <div className="flex flex-wrap gap-1.5">
                    {frameworks.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {databases.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Databases</span>
                  <div className="flex flex-wrap gap-1.5">
                    {databases.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-100">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tools.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Developer Tools</span>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-100">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Certifications & Achievements */}
            {(certifications.length > 0 || achievements.length > 0) && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🏆</span> Certifications & Awards
                </h3>
                <div className="space-y-2">
                  {certifications.map((c, idx) => (
                    <div key={`c-${idx}`} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.issuingOrganization}</div>
                    </div>
                  ))}
                  {achievements.map((a, idx) => (
                    <div key={`a-${idx}`} className="text-xs p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                      <div className="font-bold text-amber-900">{a.title}</div>
                      <div className="text-[11px] text-amber-700">{a.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileModal;
