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
};

const STATIC_ACTIVITIES = [
  { id: "a1", type: "profile", title: "Profile Created", subtitle: "Welcome to CareerConnect! Complete your profile.", timestamp: "Today" },
  { id: "a2", type: "resume", title: "Upload Your Resume", subtitle: "Add a resume to apply faster to jobs.", timestamp: "Pending" },
  { id: "a3", type: "skill", title: "Add Your Skills", subtitle: "Help recruiters find you for the right roles.", timestamp: "Pending" },
  { id: "a4", type: "project", title: "Showcase a Project", subtitle: "Demonstrate your work with a portfolio project.", timestamp: "Pending" },
];

const FresherRecentActivity = ({ activities = [] }) => {
  const displayItems = activities.length > 0 ? activities : STATIC_ACTIVITIES;
  const isStatic = activities.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStatic ? "Complete actions to see your timeline" : "Timeline of recent workspace actions"}
          </p>
        </div>
        {!isStatic && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            Live
          </span>
        )}
      </div>

      <div className="space-y-2 flex-1">
        {displayItems.map((act, idx) => {
          const iconConfig = ACTIVITY_ICONS[act.type] || { emoji: "📌", color: "bg-slate-100 text-slate-700" };
          return (
            <div
              key={act.id || idx}
              className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition ${isStatic ? "opacity-70" : ""}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${iconConfig.color}`}>
                {iconConfig.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.subtitle}</p>
              </div>
              <span className={`text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md ${
                act.timestamp === "Pending"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-400"
              }`}>
                {act.timestamp}
              </span>
            </div>
          );
        })}
      </div>

      {isStatic && (
        <div className="shrink-0 pt-2 border-t border-slate-100">
          <Link
            to="/fresher/profile"
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-sm"
          >
            Complete Your Profile →
          </Link>
        </div>
      )}
    </div>
  );
};

export default FresherRecentActivity;
