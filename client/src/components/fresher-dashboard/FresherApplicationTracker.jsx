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

const SAMPLE_APPLICATIONS = [
  { company: "Google", title: "Software Engineer Intern", appliedDate: "Sep 10, 2026", status: "Under Review" },
  { company: "Amazon", title: "Associate Developer", appliedDate: "Sep 7, 2026", status: "Applied" },
  { company: "Flipkart", title: "Full Stack Developer", appliedDate: "Sep 4, 2026", status: "Shortlisted" },
];

const FresherApplicationTracker = ({ applications = {} }) => {
  const stats = applications?.stats || {};
  const recentList = applications?.recent || [];

  const totalApplied = stats.applied ?? recentList.length ?? 0;
  const underReview = stats.underReview ?? recentList.filter((a) => a.status === "Under Review" || a.status === "Screening").length;
  const shortlisted = stats.shortlisted ?? recentList.filter((a) => a.status === "Shortlisted").length;
  const interviews = stats.interview ?? recentList.filter((a) => a.status === "Interview" || a.status === "Assessment").length;

  const hasApplications = recentList.length > 0;

  const STAT_ITEMS = [
    { label: "Applied", value: totalApplied, color: "text-[#1e3a8a] bg-blue-50 border-blue-200" },
    { label: "Under Review", value: underReview, color: "text-amber-700 bg-amber-50 border-amber-200" },
    { label: "Shortlisted", value: shortlisted, color: "text-purple-700 bg-purple-50 border-purple-200" },
    { label: "Interviews", value: interviews, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Application Tracker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live status tracking for your submitted job applications
          </p>
        </div>
        <Link
          to="/applications"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1 shrink-0"
        >
          View All Applications →
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_ITEMS.map((stat) => (
          <div
            key={stat.label}
            className={`p-3 rounded-xl border text-center ${stat.color}`}
          >
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-[11px] font-semibold mt-0.5 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Applications Table or Empty State */}
      {!hasApplications ? (
        <div className="py-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1e3a8a] mx-auto flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              No applications yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Start applying to recommended jobs. Track all your applications in one place.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-block mt-2 px-5 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition shadow-sm"
          >
            Find Jobs to Apply
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 px-4">Role</th>
                <th className="pb-3 px-4 hidden sm:table-cell">Applied</th>
                <th className="pb-3 pl-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {recentList.slice(0, 5).map((app, idx) => {
                const badgeClass =
                  STATUS_BADGES[app.status] || "bg-slate-100 text-slate-700 border-slate-200";
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition group">
                    <td className="py-3.5 pr-4 font-bold text-slate-900">{app.company}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">{app.title}</td>
                    <td className="py-3.5 px-4 text-slate-400 hidden sm:table-cell text-[11px]">
                      {app.appliedDate}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}
                      >
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
