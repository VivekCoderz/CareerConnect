import { Link } from "react-router-dom";

const ACTIVITY_ICONS = {
  profile: { emoji: "👤", color: "bg-blue-100 text-blue-700" },
  project: { emoji: "🚀", color: "bg-purple-100 text-purple-700" },
  resume: { emoji: "📄", color: "bg-rose-100 text-rose-700" },
  application: { emoji: "📋", color: "bg-slate-100 text-slate-700" },
  skill: { emoji: "⚡", color: "bg-amber-100 text-amber-700" },
  course: { emoji: "🎓", color: "bg-indigo-100 text-indigo-700" },
  saved: { emoji: "⭐", color: "bg-yellow-100 text-yellow-700" },
  internship: { emoji: "🏢", color: "bg-emerald-100 text-emerald-700" },
  interview: { emoji: "📅", color: "bg-cyan-100 text-cyan-700" },
};

const FresherRecentActivity = ({ activities = [] }) => {
  const hasActivities = Array.isArray(activities) && activities.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {hasActivities ? "Timeline of recent workspace actions" : "Your activity stream"}
          </p>
        </div>
        {hasActivities && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            Live
          </span>
        )}
      </div>

      {!hasActivities ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg">
            ⏱️
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">No recent activity</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px]">
              Apply for jobs or update your profile to build your activity history.
            </p>
          </div>
          <Link
            to="/fresher/profile"
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-[11px] font-bold transition shadow-2xs mt-1"
          >
            Update Profile →
          </Link>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {activities.map((act, idx) => {
            const iconConfig = ACTIVITY_ICONS[act.type] || { emoji: "📌", color: "bg-slate-100 text-slate-700" };
            return (
              <div
                key={act.id || idx}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${iconConfig.color}`}>
                  {iconConfig.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.subtitle}</p>
                </div>
                {act.timestamp && (
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 px-1.5 py-0.5">
                    {act.timestamp}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FresherRecentActivity;
