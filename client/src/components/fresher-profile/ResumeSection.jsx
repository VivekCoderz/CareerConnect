import { useState } from "react";

const ResumeSection = ({ profile, user, onChange }) => {
  const [resumeData, setResumeData] = useState({
    resumeUrl: profile?.resume?.resumeUrl || "",
    resumeName: profile?.resume?.resumeName || "CareerConnect_Fresher_Resume.pdf",
    isGenerated: profile?.resume?.isGenerated ?? true,
    uploadedAt: profile?.resume?.uploadedAt || new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState("builder"); // 'builder' | 'upload'
  const [uploadUrl, setUploadUrl] = useState(profile?.resume?.resumeUrl || "");

  const handleSetGenerated = () => {
    const updated = {
      resumeUrl: "",
      resumeName: `${(user?.fullName || "Fresher").replace(/\s+/g, "_")}_Resume.pdf`,
      isGenerated: true,
      uploadedAt: new Date().toISOString(),
    };
    setResumeData(updated);
    onChange({ resume: updated });
  };

  const handleSaveUpload = (e) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    const updated = {
      resumeUrl: uploadUrl.trim(),
      resumeName: uploadUrl.split("/").pop() || "Uploaded_Resume.pdf",
      isGenerated: false,
      uploadedAt: new Date().toISOString(),
    };
    setResumeData(updated);
    onChange({ resume: updated });
  };

  const handlePrint = () => {
    window.print();
  };

  // Compile full user and profile data for the live ATS Resume
  const fullName = user?.fullName || profile?.userId?.fullName || "Candidate Name";
  const email = user?.email || profile?.userId?.email || "candidate@example.com";
  const phone = user?.phone || profile?.userId?.phone || "+91 98765 43210";
  const city = profile?.location?.city || "Bangalore";
  const state = profile?.location?.state || "India";
  const headline = profile?.professionalHeadline || "Computer Science Graduate | Software Engineer";
  const objective =
    profile?.careerObjective ||
    "Motivated software engineering graduate looking to leverage technical skills in full-stack web development and problem solving.";
  const education = profile?.education || [];
  const projects = profile?.projects || [];
  const internships = profile?.internships || [];
  const certifications = profile?.certifications || [];
  const achievements = profile?.achievements || [];
  const codingProfiles = profile?.codingProfiles || [];
  const socialLinks = profile?.socialLinks || {};

  const allSkills = [
    ...(profile?.skills?.programmingLanguages || []).map((s) => s.name),
    ...(profile?.skills?.frameworks || []).map((s) => s.name),
    ...(profile?.skills?.databases || []).map((s) => s.name),
    ...(profile?.skills?.tools || []).map((s) => s.name),
    ...(profile?.skills?.technical || []).map((s) => s.name),
  ];

  const softSkills = (profile?.skills?.softSkills || []).map((s) => s.name);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            📄
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resume & Portfolio Generator</h2>
            <p className="text-xs text-slate-500">
              Live ATS-compliant resume automatically populated from your profile data
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "builder"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ⚡ Auto ATS Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            📁 Link / Upload
          </button>
        </div>
      </div>

      {activeTab === "builder" ? (
        <div className="space-y-4">
          {/* Builder Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <div>
              <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <span>✨</span> Live Dynamic Sync Active
              </div>
              <p className="text-[11px] text-blue-800/80 mt-0.5">
                Every edit to your education, projects, skills, and certifications is instantly reflected below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF
              </button>
            </div>
          </div>

          {/* ATS Resume Preview Sheet */}
          <div
            id="ats-fresher-resume"
            className="p-6 sm:p-10 bg-white border border-slate-300 rounded-2xl shadow-sm text-slate-800 font-sans space-y-5 print:border-none print:shadow-none print:p-0"
          >
            {/* Header */}
            <div className="text-center border-b border-slate-300 pb-4 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <p className="text-xs font-bold text-slate-700">{headline}</p>

              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 pt-1 font-medium">
                <span>📧 {email}</span>
                <span>•</span>
                <span>📞 {phone}</span>
                <span>•</span>
                <span>📍 {city}, {state}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-blue-700 font-semibold pt-1">
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn ↗
                  </a>
                )}
                {socialLinks.github && (
                  <a href={socialLinks.github} target="_blank" rel="noreferrer">
                    GitHub ↗
                  </a>
                )}
                {socialLinks.portfolio && (
                  <a href={socialLinks.portfolio} target="_blank" rel="noreferrer">
                    Portfolio ↗
                  </a>
                )}
                {codingProfiles.map((cp, idx) => (
                  <a key={idx} href={cp.profileUrl} target="_blank" rel="noreferrer">
                    {cp.platform} ↗
                  </a>
                ))}
              </div>
            </div>

            {/* Career Objective */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                Career Objective
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">{objective}</p>
            </div>

            {/* Education */}
            {education.length > 0 && (
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  Education
                </h2>
                <div className="space-y-2">
                  {education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {edu.degree} {edu.qualificationType ? `(${edu.qualificationType})` : ""}
                        </div>
                        <div className="text-slate-600">
                          {edu.institution} {edu.university ? `• ${edu.university}` : ""}
                        </div>
                        {edu.academicAchievements && (
                          <div className="text-[11px] text-slate-500 italic">
                            {edu.academicAchievements}
                          </div>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-bold text-slate-800">{edu.graduationYear}</span>
                        {edu.percentageOrCgpa && (
                          <div className="text-[11px] text-slate-600">{edu.percentageOrCgpa}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Skills */}
            {allSkills.length > 0 && (
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                  Technical & Programming Skills
                </h2>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {allSkills.join(" • ")}
                </p>
                {softSkills.length > 0 && (
                  <p className="text-[11px] text-slate-600 mt-1">
                    <span className="font-bold">Interpersonal Skills:</span> {softSkills.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  Technical Projects
                </h2>
                <div className="space-y-3">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">
                          {proj.title}{" "}
                          <span className="font-normal text-slate-500">
                            | {proj.technologies?.join(", ")}
                          </span>
                        </span>
                        <div className="flex gap-2 text-[11px] text-blue-700 font-semibold">
                          {proj.githubUrl && (
                            <a href={proj.githubUrl} target="_blank" rel="noreferrer">
                              Source ↗
                            </a>
                          )}
                          {proj.liveUrl && (
                            <a href={proj.liveUrl} target="_blank" rel="noreferrer">
                              Live Demo ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 mt-1 leading-relaxed">{proj.description}</p>
                      {proj.keyFeatures && proj.keyFeatures.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] text-slate-600 mt-1 space-y-0.5">
                          {proj.keyFeatures.map((feat, fIdx) => (
                            <li key={fIdx}>{feat}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internships (If Any) */}
            {internships.length > 0 && (
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  Internship Experience
                </h2>
                <div className="space-y-2.5">
                  {internships.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">
                          {item.role} <span className="font-normal text-slate-600">at {item.companyName}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {item.workMode}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-slate-700 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications & Achievements */}
            {(certifications.length > 0 || achievements.length > 0) && (
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                  Certifications & Key Achievements
                </h2>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  {certifications.map((c, idx) => (
                    <li key={`c-${idx}`}>
                      <span className="font-semibold">{c.name}</span> — {c.issuingOrganization}
                    </li>
                  ))}
                  {achievements.map((a, idx) => (
                    <li key={`a-${idx}`}>
                      <span className="font-semibold">{a.title}</span> ({a.category})
                      {a.organization ? ` — ${a.organization}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Upload Tab */
        <form onSubmit={handleSaveUpload} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Direct Resume URL / Cloud Drive Link
            </label>
            <input
              type="url"
              required
              placeholder="https://drive.google.com/... or https://domain.com/my-resume.pdf"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Ensure permissions are set to "Anyone with the link can view".
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleSetGenerated}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              ← Switch back to Auto-generated ATS Resume
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
            >
              Save Resume Link
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ResumeSection;
