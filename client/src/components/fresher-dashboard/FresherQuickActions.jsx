const FresherQuickActions = ({ onSelectTab }) => {
  const actions = [
    {
      label: "Find Jobs",
      tab: "jobs",
      icon: "💼",
      bg: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100",
    },
    {
      label: "Internships",
      tab: "internships",
      icon: "🏢",
      bg: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    },
    {
      label: "Interviews",
      tab: "interviews",
      icon: "🎤",
      bg: "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100",
    },
    {
      label: "Courses",
      tab: "courses",
      icon: "🎓",
      bg: "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100",
    },
    {
      label: "Upload Resume",
      tab: "resume",
      icon: "📄",
      bg: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    },
    {
      label: "Update Skills",
      tab: "skills",
      icon: "⚡",
      bg: "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Quick Actions
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Fast shortcuts to explore opportunities and enhance your profile
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectTab && onSelectTab(act.tab)}
            className={`p-3 rounded-xl border ${act.bg} hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex flex-col items-center text-center gap-1.5 cursor-pointer`}
          >
            <span className="text-xl">{act.icon}</span>
            <span className="text-xs font-bold leading-tight">{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FresherQuickActions;
