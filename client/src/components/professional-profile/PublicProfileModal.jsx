const PublicProfileModal = ({ profile, user, onClose }) => {
  const currentEmp = profile?.currentEmployment || {};
  const experience = profile?.experience || [];
  const skills = profile?.skills || {};
  const projects = profile?.projects || [];
  const achievements = profile?.achievements || [];
  const certifications = profile?.certifications || [];
  const leadership = profile?.leadership || [];
  const socialLinks = profile?.socialLinks || user?.socialLinks || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Top Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recruiter Portfolio Preview
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-800 via-purple-800 to-slate-900 text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {user?.profileImage || profile?.profileImage ? (
                <img
                  src={user?.profileImage || profile?.profileImage}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/40"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 text-white font-black text-2xl flex items-center justify-center border border-white/30">
                  {user?.fullName?.charAt(0) || "P"}
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{user?.fullName || "Senior Professional"}</h1>
                <p className="text-violet-200 text-xs sm:text-sm mt-0.5">
                  {profile?.professionalHeadline || "Senior Software Engineer"}
                </p>
                <p className="text-[11px] text-violet-300 mt-1">
                  📍 {profile?.location?.city || "Bangalore"}, {profile?.location?.country || "India"} • {currentEmp.workMode || "Hybrid"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/10"
                >
                  LinkedIn ↗
                </a>
              )}
              {socialLinks.github && (
                <a
                  href={socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/10"
                >
                  GitHub ↗
                </a>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-violet-200 block">Total Experience</span>
              <span className="text-xs font-bold">{profile?.totalExperienceYears || 4}+ Years</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-violet-200 block">Current Role</span>
              <span className="text-xs font-bold truncate block">{currentEmp.jobTitle || "Lead Engineer"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-violet-200 block">Notice Period</span>
              <span className="text-xs font-bold">{profile?.availability?.noticePeriod || "30 Days"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-violet-200 block">Target Role</span>
              <span className="text-xs font-bold truncate block">{profile?.careerGoal?.targetRole || "Lead / Staff"}</span>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {profile?.professionalSummary && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Executive Summary
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">{profile.professionalSummary}</p>
          </div>
        )}

        {/* Work Experience */}
        {experience.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Employment History & Career Timeline
            </h2>
            <div className="space-y-3">
              {experience.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-slate-900 text-sm">{exp.jobTitle}</h3>
                    <span className="text-xs font-bold text-violet-700">
                      {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""} —{" "}
                      {exp.currentlyWorking ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Present"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    {exp.companyName} • {exp.location} ({exp.workMode})
                  </p>
                  {exp.description && <p className="text-xs text-slate-600 mt-1">{exp.description}</p>}
                  {exp.achievements && (
                    <p className="text-xs text-emerald-800 font-medium bg-emerald-50/70 p-2 rounded-lg mt-2">
                      Impact: {exp.achievements}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects & Achievements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Key Technical Projects
              </h2>
              {projects.map((p, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <h3 className="font-bold text-xs text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {achievements.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Key Achievements
              </h2>
              {achievements.map((a, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <h3 className="font-bold text-xs text-slate-900">{a.title}</h3>
                  <p className="text-xs text-amber-900 font-medium">{a.impact || a.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileModal;
