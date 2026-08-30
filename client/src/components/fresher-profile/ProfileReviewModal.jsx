const ProfileReviewModal = ({
  isOpen,
  onClose,
  profile,
  user,
  completion,
  readiness,
  onCompleteProfile,
  isSubmitting,
  onJumpToStep,
}) => {
  if (!isOpen) return null;

  const fullName = user?.fullName || profile?.userId?.fullName || "Fresher";
  const headline = profile?.professionalHeadline || "Not specified";
  const highestEdu = profile?.education?.[0];
  const skillsCount =
    (profile?.skills?.programmingLanguages?.length || 0) +
    (profile?.skills?.frameworks?.length || 0) +
    (profile?.skills?.databases?.length || 0) +
    (profile?.skills?.tools?.length || 0) +
    (profile?.skills?.softSkills?.length || 0) +
    (profile?.skills?.technical?.length || 0);

  const projectsCount = profile?.projects?.length || 0;
  const certsCount = profile?.certifications?.length || 0;
  const achievesCount = profile?.achievements?.length || 0;
  const prefRoles = profile?.jobPreferences?.preferredRoles || [];
  const prefLocations = profile?.jobPreferences?.preferredLocations || [];
  const hasResume = !!(profile?.resume?.resumeUrl || profile?.resume?.isGenerated);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
              Final Verification
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Review Your Fresher Profile
            </h2>
            <p className="text-xs text-slate-500">
              Verify your information before completing your profile and entering the Fresher Workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Score Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">Profile Completion</span>
              <span className="text-base font-extrabold text-emerald-600">{completion}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {completion >= 75 ? "✅ Ready for recruiter submission" : "⚠️ Add more details to maximize visibility"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-950">Job Readiness Score</span>
              <span className="text-base font-extrabold text-emerald-700">{readiness?.score || 0} / 100</span>
            </div>
            <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${readiness?.score || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-800 mt-2">
              {readiness?.tips?.[0] || "Top candidate match profile"}
            </p>
          </div>
        </div>

        {/* Section Review Cards */}
        <div className="space-y-3">
          {/* 1. Basic & Professional Headline */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">👤</span>
                <h4 className="text-xs font-bold text-slate-900">Personal & Professional Identity</h4>
              </div>
              <p className="text-xs font-semibold text-slate-800">{fullName}</p>
              <p className="text-[11px] text-slate-600 font-medium">{headline}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(0);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>

          {/* 2. Education */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎓</span>
                <h4 className="text-xs font-bold text-slate-900">Highest Qualification</h4>
              </div>
              {highestEdu ? (
                <p className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">{highestEdu.degree}</span> at{" "}
                  {highestEdu.institution} ({highestEdu.graduationYear})
                </p>
              ) : (
                <p className="text-xs text-rose-500 font-medium">⚠️ No education added yet</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(2);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>

          {/* 3. Skills */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <h4 className="text-xs font-bold text-slate-900">Skills & Proficiencies</h4>
              </div>
              <p className="text-xs text-slate-700">
                {skillsCount > 0 ? (
                  <span className="font-semibold text-emerald-700">✓ {skillsCount} skills categorized across languages, frameworks & tools</span>
                ) : (
                  <span className="text-rose-500 font-medium">⚠️ Add at least 1 technical skill</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(3);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>

          {/* 4. Projects */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">🚀</span>
                <h4 className="text-xs font-bold text-slate-900">Featured Projects</h4>
              </div>
              <p className="text-xs text-slate-700">
                {projectsCount > 0 ? (
                  <span className="font-semibold text-emerald-700">✓ {projectsCount} projects attached with repository details</span>
                ) : (
                  <span className="text-amber-600">No projects added (Recommended for recruiters)</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(4);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>

          {/* 5. Job Preferences */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <h4 className="text-xs font-bold text-slate-900">Job Preferences</h4>
              </div>
              <p className="text-xs text-slate-700">
                Roles: <span className="font-semibold text-slate-900">{prefRoles.join(", ") || "General"}</span> | Locations:{" "}
                <span className="font-semibold text-slate-900">{prefLocations.join(", ") || "Any"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(8);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>

          {/* 6. Resume */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">📄</span>
                <h4 className="text-xs font-bold text-slate-900">Fresher Resume</h4>
              </div>
              <p className="text-xs font-semibold text-emerald-700">
                {hasResume ? "✓ ATS Standard Resume Ready" : "⚠️ Pending"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToStep(9);
                onClose();
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Continue Editing
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCompleteProfile}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Finalizing Profile...
              </>
            ) : (
              "Complete Profile & Go to Dashboard →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileReviewModal;
