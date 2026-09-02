const DEFAULT_STATS = {
  applied: 4,
  underReview: 2,
  shortlisted: 1,
  interview: 1,
};

const DEFAULT_RECENT = [
  {
    id: "app-1",
    title: "Staff Software Engineer",
    company: "Stripe",
    status: "Interview Scheduled",
    statusType: "interview",
  },
  {
    id: "app-2",
    title: "Engineering Lead",
    company: "Razorpay",
    status: "Under Review",
    statusType: "review",
  },
];

const ApplicationPipelineCard = ({
  stats = DEFAULT_STATS,
  recent = DEFAULT_RECENT,
  onViewAllApplications,
}) => {
  const getStatusBadge = (statusType) => {
    switch (statusType) {
      case "interview":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "review":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Application Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track your active senior transitions and status</p>
        </div>

        <button
          type="button"
          onClick={onViewAllApplications}
          className="text-xs font-bold text-purple-700 hover:text-purple-900 transition inline-flex items-center gap-1 group self-start sm:self-center"
        >
          <span>View All Applications</span>
          <span className="group-hover:translate-x-0.5 transition">→</span>
        </button>
      </div>

      {/* Four Compact Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Applied */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {stats.applied ?? 4}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Applied
          </div>
        </div>

        {/* Under Review */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-amber-800">
            {stats.underReview ?? 2}
          </div>
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mt-0.5">
            Under Review
          </div>
        </div>

        {/* Shortlisted */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-blue-800">
            {stats.shortlisted ?? 1}
          </div>
          <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider mt-0.5">
            Shortlisted
          </div>
        </div>

        {/* Interview */}
        <div className="p-3.5 bg-purple-50/70 border border-purple-200/70 rounded-2xl text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-purple-900">
            {stats.interview ?? 1}
          </div>
          <div className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider mt-0.5">
            Interview
          </div>
        </div>
      </div>

      {/* Two Most Recent Applications */}
      <div className="space-y-3 pt-1">
        {recent.slice(0, 2).map((app) => (
          <div
            key={app.id}
            className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {app.title} <span className="text-slate-400 font-normal">·</span> {app.company}
              </h3>
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(
                  app.statusType || (app.status?.toLowerCase().includes("interview") ? "interview" : "review")
                )}`}
              >
                Status: {app.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationPipelineCard;
