// Shows the moderation state of a job/internship listing to its employer.
const STYLES = {
  "Pending Approval": { label: "Pending approval", className: "bg-amber-50 text-amber-800 border-amber-200" },
  Rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  Draft: { label: "Draft", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function ModerationBadge({ status, className = "" }) {
  const style = STYLES[status];
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}
