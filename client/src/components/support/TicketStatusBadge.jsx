const STATUS_STYLES = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Reopened: "bg-violet-50 text-violet-700 border-violet-200",
  Solved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Not Solved": "bg-rose-50 text-rose-700 border-rose-200",
  Closed: "bg-emerald-600 text-white border-emerald-600",
  Expired: "bg-slate-100 text-slate-600 border-slate-200",
};

const TicketStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.Open}`}>
    {status}
  </span>
);

export default TicketStatusBadge;
