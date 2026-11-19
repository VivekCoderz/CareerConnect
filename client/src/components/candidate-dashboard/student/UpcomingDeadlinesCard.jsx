const UpcomingDeadlinesCard = ({ deadlines = [] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Upcoming Deadlines</h2>
          <p className="text-xs text-slate-500 mt-0.5">Application cut-offs and hiring milestone dates</p>
        </div>
      </div>

      {deadlines && deadlines.length > 0 ? (
        <div className="space-y-3">
          {deadlines.map((dl) => (
            <div
              key={dl.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                dl.urgency === "urgent"
                  ? "bg-rose-50/50 border-rose-200 text-rose-900"
                  : dl.urgency === "medium"
                  ? "bg-amber-50/50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200/80 text-slate-900"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold">{dl.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-600">
                    {dl.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Due Date: {dl.date}</p>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    dl.urgency === "urgent"
                      ? "bg-rose-600 text-white animate-pulse"
                      : dl.urgency === "medium"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {dl.daysRemaining} days left
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">No pressing deadlines right now.</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesCard;
