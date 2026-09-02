import { Link } from "react-router-dom";

const QuickActionsCard = ({ onNavigateTab }) => {
  const actions = [
    { label: "+ Add Project", link: "/student/profile", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100" },
    { label: "+ Add Skill", link: "/student/profile", color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100" },
    { label: "+ Add Certification", link: "/student/profile", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100" },
    { label: "📄 Build Resume", link: "/student/profile", color: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-100" },
    { label: "🔍 Find Internships", tab: "internships", color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100" },
    { label: "💼 Browse Jobs", tab: "jobs", color: "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border-cyan-100" },
    { label: "📚 Explore Courses", tab: "courses", color: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100" },
    { label: "✏️ Edit Profile", link: "/student/profile", color: "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200" },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Quick Actions</h2>
      <p className="text-xs text-slate-500 mb-4">Direct shortcuts to accelerate your profile and applications</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {actions.map((act, idx) => {
          if (act.link) {
            return (
              <Link
                key={idx}
                to={act.link}
                className={`p-3 rounded-2xl border text-xs font-bold text-center transition flex items-center justify-center ${act.color}`}
              >
                {act.label}
              </Link>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => onNavigateTab(act.tab)}
              className={`p-3 rounded-2xl border text-xs font-bold text-center transition flex items-center justify-center cursor-pointer ${act.color}`}
            >
              {act.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsCard;
