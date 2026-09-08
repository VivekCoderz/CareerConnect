const ACTIVITY_ICONS = {
  profile: "👤",
  project: "🚀",
  resume: "📄",
  application: "📋",
  skill: "⚡",
  course: "🎓",
  saved: "⭐",
};

const FresherRecentActivity = ({ activities = [] }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Timeline of recent workspace and application actions</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm shrink-0">
                {ACTIVITY_ICONS[act.type] || "📌"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
              </div>
              <span className="text-[10px] font-medium text-slate-400 shrink-0">{act.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FresherRecentActivity;
