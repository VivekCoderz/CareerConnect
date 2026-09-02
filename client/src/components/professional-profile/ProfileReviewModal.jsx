const ProfileReviewModal = ({
  isOpen,
  profile,
  user,
  completion = 0,
  careerStrength = 0,
  onClose,
  onComplete,
  onNavigateTab,
  isCompleting = false,
}) => {
  if (!isOpen) return null;

  const currentEmp = profile?.currentEmployment || {};
  const experience = profile?.experience || [];
  const skills = profile?.skills || {};
  const projects = profile?.projects || [];
  const achievements = profile?.achievements || [];
  const leadership = profile?.leadership || [];
  const certifications = profile?.certifications || [];
  const careerGoal = profile?.careerGoal || {};
  const availability = profile?.availability || {};
  const compensation = profile?.compensation || {};

  const totalSkillCount = Object.values(skills).reduce(
    (acc, list) => acc + (list?.length || 0),
    0
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-1">
              ⭐ Executive Submission Review
            </div>
            <h2 className="text-xl font-bold text-slate-900">Review Your Professional Profile</h2>
            <p className="text-xs text-slate-500">
              Verify your leadership scope, work history, and confidential preferences before completing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
            aria-label="Close Review"
          >
            ✕
          </button>
        </div>

        {/* Completion & Career Strength Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Profile Completion</span>
              <h3 className="text-xl font-extrabold text-slate-900">{completion}% Ready</h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                completion >= 75
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {completion >= 75 ? "Profile Ready" : "Partially Complete"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Career Strength Index</span>
              <h3 className="text-xl font-extrabold text-purple-900">{careerStrength} / 100</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
              Executive Tier
            </span>
          </div>
        </div>

        {/* Snapshot Sections */}
        <div className="space-y-4">
          {/* Identity & Current Role */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Identity & Current Employment
              </span>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab("professional");
                  }}
                  className="text-xs font-bold text-purple-700 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {profile?.professionalHeadline || currentEmp.jobTitle || "Senior Software Engineer"}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentEmp.company ? `${currentEmp.company} • ${currentEmp.location || "Bangalore"}` : "No company listed"}
            </p>
          </div>

          {/* Work History */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Work History & Experience ({experience.length} Positions)
              </span>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab("professional");
                  }}
                  className="text-xs font-bold text-purple-700 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {experience.length > 0 ? (
              <div className="space-y-2 mt-2">
                {experience.slice(0, 3).map((exp, idx) => (
                  <div key={idx} className="text-xs flex justify-between items-baseline border-b border-slate-100 last:border-none pb-1.5 last:pb-0">
                    <div>
                      <span className="font-bold text-slate-900">{exp.jobTitle}</span>
                      <span className="text-slate-500"> @ {exp.companyName}</span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-medium">{exp.location}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No work experience history entries added.</p>
            )}
          </div>

          {/* Skills & Stack */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Expertise & Skills ({totalSkillCount} Skills Indexed)
              </span>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab("expertise");
                  }}
                  className="text-xs font-bold text-purple-700 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.values(skills).flat().slice(0, 8).map((s, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold">
                  {s.name} ({s.proficiency})
                </span>
              ))}
              {totalSkillCount > 8 && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold">
                  +{totalSkillCount - 8} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Back to Editing
          </button>

          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-60"
          >
            {isCompleting ? "Finalizing Profile..." : "Confirm & Complete Profile ✨"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileReviewModal;
