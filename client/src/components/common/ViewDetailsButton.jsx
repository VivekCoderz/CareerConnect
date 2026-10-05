import { Link } from "react-router-dom";
import { opportunityLink, opportunitySourceName } from "../../utils/opportunityApply";

const BASE_CLASS =
  "inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-400 transition";
const SIZES = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-4 py-2.5 text-xs",
};

/**
 * Secondary button on a listing card: "View details" opens /jobs/:id or /internships/:id
 * for E2Job listings; external feed listings get "View on <source>" (new tab).
 * Renders nothing when the listing has nowhere to go.
 * @param {object} item - listing from a discovery/dashboard feed
 * @param {"Job"|"Internship"} [type]
 * @param {"sm"|"md"} [size]
 */
export default function ViewDetailsButton({ item, type = "Job", size = "md", className = "" }) {
  const link = opportunityLink(item, type);
  if (!link) return null;
  const cls = `${BASE_CLASS} ${SIZES[size] || SIZES.md} ${className}`.trim();

  if (link.to) {
    return (
      <Link to={link.to} className={cls}>
        View details
      </Link>
    );
  }
  const source = opportunitySourceName(item);
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {source ? `View on ${source}` : "View listing"} <span aria-hidden="true">↗</span>
    </a>
  );
}
