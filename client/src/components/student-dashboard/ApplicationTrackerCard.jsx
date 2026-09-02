const ApplicationTrackerCard = ({ applications }) => {
  const stats = applications?.stats || {
    applied: 0,
    underReview: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
  };
  const recent = applications?.recent || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "selected":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "interview":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "under review":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Applications Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status updates for applied internships and full-time jobs</p>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-slate-900">{stats.applied}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Applied</div>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-amber-700">{stats.underReview}</div>
          <div className="text-[11px] font-semibold text-amber-800 mt-0.5">Under Review</div>
        </div>
        <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-blue-700">{stats.shortlisted}</div>
          <div className="text-[11px] font-semibold text-blue-800 mt-0.5">Shortlisted</div>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-purple-700">{stats.interview}</div>
          <div className="text-[11px] font-semibold text-purple-800 mt-0.5">Interview</div>
        </div>
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-emerald-700">{stats.selected}</div>
          <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">Selected</div>
        </div>
        <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-2xl text-center">
          <div className="text-xl font-extrabold text-rose-700">{stats.rejected}</div>
          <div className="text-[11px] font-semibold text-rose-800 mt-0.5">Rejected</div>
        </div>
      </div>

      {/* Recent Applications List */}
      {recent && recent.length > 0 ? (
        <div className="space-y-3">
          {recent.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">{app.title}</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {app.company} • Applied on {app.appliedDate}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(
                    app.status
                  )}`}
                >
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">No applications sent yet. Apply to recommended internships to start tracking.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationTrackerCard;
