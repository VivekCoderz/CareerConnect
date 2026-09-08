import { Link } from "react-router-dom";

const STATUS_BADGES = {
  Applied: "bg-blue-50 text-blue-700 border-blue-200",
  "Under Review": "bg-amber-50 text-amber-800 border-amber-200",
  Screening: "bg-amber-50 text-amber-800 border-amber-200",
  Shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
  Interview: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Assessment: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Offer: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Hired: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const FresherApplicationTracker = ({ applications = {} }) => {
  const recentList = applications?.recent || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">Live status tracking for your submitted job applications</p>
        </div>

        <Link
          to="/applications"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1"
        >
          View All Applications →
        </Link>
      </div>

      {recentList.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-slate-50 border border-slate-200/70 p-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1e3a8a] mx-auto flex items-center justify-center text-xl mb-3">
            📋
          </div>
          <h3 className="text-sm font-bold text-slate-800">You haven’t applied to any opportunities yet.</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Browse through recommended jobs and apply with one click using your CareerConnect profile.
          </p>
          <Link
            to="/jobs"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#1e40af] transition shadow-xs"
          >
            Find Jobs
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 px-4">Role</th>
                <th className="pb-3 px-4">Applied Date</th>
                <th className="pb-3 pl-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {recentList.slice(0, 5).map((app, idx) => {
                const badgeClass = STATUS_BADGES[app.status] || "bg-slate-100 text-slate-700 border-slate-200";
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 pr-4 font-bold text-slate-900">{app.company}</td>
                    <td className="py-3.5 px-4 text-slate-700">{app.title}</td>
                    <td className="py-3.5 px-4 text-slate-500">{app.appliedDate}</td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FresherApplicationTracker;
