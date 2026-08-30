const ProfessionalProfileHeader = ({
  profile,
  completion = 0,
  careerStrength = 0,
  isSaving = false,
  onSaveDraft,
  onOpenReview,
  onOpenPublicPreview,
  onVisibilityChange,
}) => {
  const isComplete = completion >= 75;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Bar: Nav & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-violet-100 text-violet-800">
              Executive Profile
            </span>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                profile?.profileVisibility === "public"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : profile?.profileVisibility === "recruiter-only"
                  ? "bg-violet-50 text-violet-700 border border-violet-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  profile?.profileVisibility === "public"
                    ? "bg-emerald-500"
                    : profile?.profileVisibility === "recruiter-only"
                    ? "bg-violet-500"
                    : "bg-slate-400"
                }`}
              />
              {profile?.profileVisibility === "public"
                ? "Public Profile"
                : profile?.profileVisibility === "recruiter-only"
                ? "Recruiter Confidential"
                : "Private"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Professional & Leadership Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Highlight your career milestones, technical expertise, leadership scope, and compensation preferences for senior & executive opportunities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenPublicPreview}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Recruiter View
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition shadow-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Save Progress
          </button>

          <button
            type="button"
            onClick={onOpenReview}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition shadow-sm hover:shadow flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Review & Finalize
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        {/* Profile Completion Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span>Profile Completion</span>
            <span className="text-violet-700 font-bold">{completion}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-violet-500" : "bg-blue-500"
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {isComplete ? "⭐ Comprehensive profile ready for executive search" : "Complete experience history to reach 100%"}
          </p>
        </div>

        {/* Career Strength Score */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100/80">
          <div className="flex items-center justify-between text-xs font-semibold text-violet-900 mb-2">
            <span className="flex items-center gap-1">
              <span>💎</span> Career Strength Score
            </span>
            <span className="text-sm font-extrabold text-violet-700">{careerStrength} / 100</span>
          </div>
          <div className="w-full bg-violet-200/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-violet-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${careerStrength}%` }}
            />
          </div>
          <p className="text-[11px] text-violet-800/80 mt-2">
            {careerStrength >= 80 ? "High leadership & recruiter ranking" : "Add achievements & certifications"}
          </p>
        </div>

        {/* Profile Visibility Switcher */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-800">Recruiter Visibility</span>
            <select
              value={profile?.profileVisibility || "recruiter-only"}
              onChange={(e) => onVisibilityChange(e.target.value)}
              className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white text-violet-700 outline-none"
            >
              <option value="recruiter-only">Recruiters Only</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            {profile?.profileVisibility === "recruiter-only"
              ? "Confidential: Visible only to verified tech recruiters"
              : profile?.profileVisibility === "public"
              ? "Publicly indexed in search engines"
              : "Hidden from external searches"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfileHeader;
