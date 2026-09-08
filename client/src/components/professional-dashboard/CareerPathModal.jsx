const CareerPathModal = ({ isOpen, onClose, currentRole, targetRole, focusAreas }) => {
  if (!isOpen) return null;

  const milestones = [
    {
      title: "Current Foundation",
      role: currentRole || "Senior Software Engineer",
      status: "Completed",
      highlights: ["High-concurrency microservices", "Multi-tenant API architecture", "Deep backend mastery"],
    },
    {
      title: "Target Transition",
      role: targetRole || "Engineering Lead",
      status: "In Progress",
      highlights: ["System Design & Cloud Architecture", "Tech Leadership & Sprint Direction", "Cross-functional Strategy"],
    },
    {
      title: "Next Horizon",
      role: "Staff / Principal Architect",
      status: "Upcoming",
      highlights: ["Enterprise-wide Architecture", "Org-level Technology Strategy", "C-suite Alignment"],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Career Trajectory Map</h3>
            <p className="text-xs text-slate-500">Milestones to reach {targetRole}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${
                m.status === "In Progress"
                  ? "bg-purple-50/70 border-purple-200"
                  : m.status === "Completed"
                  ? "bg-emerald-50/60 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900">{m.role}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.status === "In Progress"
                      ? "bg-purple-200 text-purple-900"
                      : m.status === "Completed"
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 mt-2">
                {m.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-purple-600">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerPathModal;
