import { Link } from "react-router-dom";

const FresherQuickActions = () => {
  const actions = [
    { label: "Find Jobs", link: "/jobs", icon: "💼", bg: "bg-blue-50 text-blue-800 border-blue-200" },
    { label: "Upload Resume", link: "/resume-builder", icon: "📄", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { label: "Add Project", link: "/fresher/profile?step=3", icon: "🚀", bg: "bg-purple-50 text-purple-800 border-purple-200" },
    { label: "Add Internship", link: "/fresher/profile?step=2", icon: "🏢", bg: "bg-amber-50 text-amber-800 border-amber-200" },
    { label: "Explore Courses", link: "/courses", icon: "🎓", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    { label: "Update Skills", link: "/fresher/profile?step=4", icon: "⚡", bg: "bg-rose-50 text-rose-800 border-rose-200" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Actions</h2>
        <p className="text-xs text-slate-500 mt-0.5">Fast shortcuts to enhance your profile and applications</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map((act, idx) => (
          <Link
            key={idx}
            to={act.link}
            className={`p-3 rounded-xl border ${act.bg} hover:shadow-xs hover:scale-[1.02] transition flex flex-col items-center text-center gap-1.5`}
          >
            <span className="text-lg">{act.icon}</span>
            <span className="text-xs font-bold leading-tight">{act.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FresherQuickActions;
