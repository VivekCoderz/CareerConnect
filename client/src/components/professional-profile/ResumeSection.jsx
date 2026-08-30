import { useState } from "react";

const ResumeSection = ({ profile, user, onChange }) => {
  const [resumeUrl, setResumeUrl] = useState(profile?.resume?.resumeUrl || "");
  const [resumeName, setResumeName] = useState(
    profile?.resume?.resumeName || `${user?.fullName || "Professional"}_Executive_Resume.pdf`
  );
  const [isGenerated, setIsGenerated] = useState(profile?.resume?.isGenerated ?? true);
  const [viewMode, setViewMode] = useState("preview"); // 'preview' or 'custom_link'

  const handleUpdate = (url, name, generated) => {
    setResumeUrl(url);
    setResumeName(name);
    setIsGenerated(generated);
    onChange({
      resume: {
        resumeUrl: url,
        resumeName: name,
        isGenerated: generated,
        uploadedAt: new Date(),
      },
    });
  };

  const handlePrintResume = () => {
    window.print();
  };

  const experienceList = profile?.experience || [];
  const skills = profile?.skills || {};
  const currentEmp = profile?.currentEmployment || {};
  const projects = profile?.projects || [];
  const achievements = profile?.achievements || [];
  const certifications = profile?.certifications || [];
  const leadership = profile?.leadership || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
            📄
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Executive ATS Resume</h2>
            <p className="text-xs text-slate-500">
              Auto-compiled directly from your verified career milestones, technical stack, and achievements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "preview" ? "custom_link" : "preview")}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            {viewMode === "preview" ? "🔗 Attach External Cloud Link" : "📄 View Auto-Compiled ATS Resume"}
          </button>

          <button
            type="button"
            onClick={handlePrintResume}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition shadow-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {viewMode === "custom_link" ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Attach Custom Resume File Link</h3>
          <p className="text-xs text-slate-500">
            Paste a link to your Google Drive, Dropbox, or hosted PDF resume.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resume Document URL</label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => handleUpdate(e.target.value, resumeName, false)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Label</label>
              <input
                type="text"
                value={resumeName}
                onChange={(e) => handleUpdate(resumeUrl, e.target.value, false)}
                placeholder="e.g. Senior_Staff_Engineer_Resume.pdf"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Live Auto-Generated ATS Resume Preview */
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-300 shadow-md font-sans text-slate-900 space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center sm:text-left sm:flex sm:justify-between sm:items-end">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {user?.fullName || profile?.userId?.fullName || "Professional Name"}
              </h1>
              <p className="text-sm font-bold text-violet-700 mt-1">
                {profile?.professionalHeadline || "Senior Software Engineer"}
              </p>
            </div>
            <div className="text-xs text-slate-600 mt-3 sm:mt-0 sm:text-right space-y-0.5 font-medium">
              <p>{user?.email || profile?.userId?.email || "email@example.com"}</p>
              <p>{user?.phone || profile?.userId?.phone || "+91 98765 43210"}</p>
              <p>{profile?.location?.city || "Bangalore"}, {profile?.location?.country || "India"}</p>
            </div>
          </div>

          {/* Summary */}
          {profile?.professionalSummary && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Executive Summary
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">{profile.professionalSummary}</p>
            </div>
          )}

          {/* Core Technical Competencies */}
          <div className="space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Core Competencies & Technology Stack
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {skills.cloud?.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800">Cloud & DevOps: </span>
                  <span className="text-slate-600">{skills.cloud.map((s) => s.name).join(", ")}</span>
                </div>
              )}
              {skills.programmingLanguages?.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800">Languages: </span>
                  <span className="text-slate-600">{skills.programmingLanguages.map((s) => s.name).join(", ")}</span>
                </div>
              )}
              {skills.frameworks?.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800">Frameworks: </span>
                  <span className="text-slate-600">{skills.frameworks.map((s) => s.name).join(", ")}</span>
                </div>
              )}
              {skills.databases?.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800">Databases: </span>
                  <span className="text-slate-600">{skills.databases.map((s) => s.name).join(", ")}</span>
                </div>
              )}
              {skills.management?.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800">Architecture & Leadership: </span>
                  <span className="text-slate-600">{skills.management.map((s) => s.name).join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Work Experience */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              Professional Work Experience
            </h2>

            {experienceList.length > 0 ? (
              experienceList.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900">{exp.jobTitle}</span>
                    <span className="text-slate-500 font-semibold">
                      {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""} —{" "}
                      {exp.currentlyWorking ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 italic">
                    <span>{exp.companyName}</span>
                    <span>{exp.location || "Bangalore"} ({exp.workMode})</span>
                  </div>
                  {exp.description && <p className="text-xs text-slate-700 mt-1">{exp.description}</p>}
                  {exp.responsibilities && (
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">Key Responsibilities:</span> {exp.responsibilities}
                    </p>
                  )}
                  {exp.achievements && (
                    <p className="text-xs text-emerald-900 font-medium bg-emerald-50/50 p-1.5 rounded">
                      <span className="font-bold">Measurable Impact:</span> {exp.achievements}
                    </p>
                  )}
                </div>
              ))
            ) : currentEmp?.company ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{currentEmp.jobTitle}</span>
                  <span>Present</span>
                </div>
                <p className="text-xs italic text-slate-600">{currentEmp.company}</p>
                <p className="text-xs text-slate-700">{currentEmp.responsibilities}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No experience records added.</p>
            )}
          </div>

          {/* Key Projects */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Selected High-Scale Projects
              </h2>
              {projects.map((p, idx) => (
                <div key={idx} className="space-y-0.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{p.name}</span>
                    {p.role && <span className="font-semibold text-slate-500">{p.role}</span>}
                  </div>
                  <p className="text-slate-700">{p.description}</p>
                  {p.businessImpact && (
                    <p className="text-teal-900 font-medium">
                      <span className="font-bold">Impact:</span> {p.businessImpact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Achievements & Certifications */}
          {(achievements.length > 0 || certifications.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {achievements.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                    Key Achievements
                  </h2>
                  {achievements.map((a, idx) => (
                    <div key={idx} className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-900">{a.title}</p>
                      <p className="text-slate-600">{a.impact || a.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {certifications.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                    Verified Certifications
                  </h2>
                  {certifications.map((c, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-slate-500">{c.issuingOrganization}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeSection;
