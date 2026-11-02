import { Link } from "react-router-dom";
import { opportunityLink } from "../../utils/opportunityApply";

/**
 * Wraps a listing card's title so it opens the listing's shareable page
 * (/jobs/:id or /internships/:id), or the source site for external listings.
 * @param {object} item - listing from a discovery/dashboard feed
 * @param {"Job"|"Internship"} [type]
 */
export default function OpportunityTitleLink({ item, type = "Job", className = "hover:underline", children }) {
  const link = opportunityLink(item, type);
  if (!link) return children;
  if (link.to) {
    return <Link to={link.to} className={className}>{children}</Link>;
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
