const LEVEL_COLORS = {
  Expert: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Advanced: "text-purple-700 bg-purple-50 border-purple-200",
  Intermediate: "text-blue-700 bg-blue-50 border-blue-200",
  Beginner: "text-amber-700 bg-amber-50 border-amber-200",
};

/** Top skills from the professional's own profile ({ name, level }); empty until they add some. */
const SkillFocusCard = ({
  skills = [],
  onViewSkills,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Skill Focus</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your strongest skills from your profile</p>
        </div>

        <button
          type="button"
          onClick={onViewSkills}
          className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline shrink-0"
        >
          {skills.length ? "View Skills" : "Add Skills"}
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-xs text-slate-500">Add your skills to your profile and your strongest ones show here.</p>
      ) : (
        <div className="space-y-2.5">
          {skills.map((s, idx) => (
            <div
              key={`${s.name}-${idx}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70"
            >
              <span className="text-xs font-bold text-slate-800">{s.name}</span>
              {s.level && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${LEVEL_COLORS[s.level] || LEVEL_COLORS.Intermediate}`}>
                  {s.level}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillFocusCard;
