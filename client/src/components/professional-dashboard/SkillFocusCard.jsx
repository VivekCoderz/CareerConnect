const SKILLS_DATA = [
  { name: "System Design", level: "Strong", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { name: "Cloud Architecture", level: "Advanced", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { name: "Engineering Leadership", level: "Developing", color: "text-amber-700 bg-amber-50 border-amber-200" },
];

const SkillFocusCard = ({
  skills = SKILLS_DATA,
  onViewSkills,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Skill Focus</h2>
          <p className="text-xs text-slate-500 mt-0.5">Core capabilities aligned to target role</p>
        </div>

        <button
          type="button"
          onClick={onViewSkills}
          className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline shrink-0"
        >
          View Skills
        </button>
      </div>

      {/* Skills list with badge indicators (no excessive bars) */}
      <div className="space-y-2.5">
        {skills.map((s, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70"
          >
            <span className="text-xs font-bold text-slate-800">{s.name}</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${s.color}`}>
              {s.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillFocusCard;
