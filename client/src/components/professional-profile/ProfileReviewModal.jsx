const ProfileReviewModal = ({
  profile,
  user,
  completion = 0,
  careerStrength = 0,
  onClose,
  onComplete,
  onNavigateTab,
  isCompleting = false,
}) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-1">
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
              {completion >= 75 ? "Qualified" : "Needs More Details"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-violet-700">Career Strength Score</span>
              <h3 className="text-xl font-extrabold text-violet-900">{careerStrength} / 100</h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-violet-800 border border-violet-200">
              {careerStrength >= 80 ? "Top 5% Executive" : "Strong Profile"}
            </span>
          </div>
        </div>

        {/* Sections Summary Grid */}
        <div className="space-y-4">
          {/* Identity & Current Employment */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Current Position & Positioning</h3>
              <button
                type="button"
                onClick={() => onNavigateTab("employment")}
                className="text-xs font-bold text-violet-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Headline:</span>
                <p className="font-semibold text-slate-900">{profile?.professionalHeadline || "Not specified"}</p>
              </div>
              <div>
                <span className="text-slate-500">Current Role:</span>
                <p className="font-semibold text-slate-900">
                  {currentEmp.jobTitle || "Engineer"} at {currentEmp.company || "Company"} ({currentEmp.workMode || "Hybrid"})
                </p>
              </div>
            </div>
          </div>

          {/* Work History */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                Work Experience ({experience.length} records)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab("experience")}
                className="text-xs font-bold text-violet-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              {experience.map((exp, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-white p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900">{exp.jobTitle}</span>
                    <span className="text-slate-500 ml-1">@ {exp.companyName}</span>
                  </div>
                  <span className="text-slate-500 font-semibold">{exp.currentlyWorking ? "Present" : "Past"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Projects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900">Skills ({totalSkillCount})</h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab("skills")}
                  className="text-xs font-bold text-violet-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-xs text-slate-600">
                {skills.cloud?.length || 0} Cloud • {skills.programmingLanguages?.length || 0} Languages • {skills.frameworks?.length || 0} Frameworks • {skills.management?.length || 0} Leadership
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-900">Projects ({projects.length})</h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab("projects")}
                  className="text-xs font-bold text-violet-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-xs text-slate-600">
                {projects.map((p) => p.name).slice(0, 2).join(", ") || "None added"}
              </p>
            </div>
          </div>

          {/* Availability, Notice & Compensation */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Notice Period & Compensation</h3>
              <button
                type="button"
                onClick={() => onNavigateTab("availability")}
                className="text-xs font-bold text-violet-600 hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Notice Period:</span>
                <p className="font-semibold text-slate-900">{availability.noticePeriod || "30 Days"}</p>
              </div>
              <div>
                <span className="text-slate-500">Expected CTC:</span>
                <p className="font-bold text-emerald-700">
                  ₹{compensation.expectedMinSalary || 30} - {compensation.expectedMaxSalary || 45} LPA
                </p>
              </div>
              <div>
                <span className="text-slate-500">Current Salary:</span>
                <p className="font-semibold text-slate-900">
                  {compensation.isCurrentSalaryConfidential ? "Confidential 🔒" : `₹${compensation.currentSalary} LPA`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Edit
          </button>

          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {isCompleting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🚀</span>
            )}
            Complete Profile & Launch Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileReviewModal;
