import { applyToJob, applyToInternship } from "../services/applicationService";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const opportunityId = (item) => String(item?._id || item?.id || "");

// Only E2Job listings (real database ids) accept applications here; scraped and
// partner listings are applied to on the employer's own site.
export const isExternalOpportunity = (item) =>
  item?.isExternal === true || !OBJECT_ID.test(opportunityId(item));

export const externalApplyUrl = (item) => {
  const url = item?.applyLink || item?.applyUrl || "";
  return /^https?:\/\//i.test(url) ? url : null;
};

/**
 * Where a listing card should link: the public detail page for E2Job listings, or
 * the source site for external ones (scraped ids change on every request until I04).
 * @param {object} item - listing from a discovery/dashboard feed
 * @param {"Job"|"Internship"} type
 * @returns {{ to: string } | { href: string } | null}
 */
export const opportunityLink = (item, type = "Job") => {
  if (isExternalOpportunity(item)) {
    const href = externalApplyUrl(item);
    return href ? { href } : null;
  }
  return { to: `${type === "Internship" ? "/internships" : "/jobs"}/${opportunityId(item)}` };
};

// Feed names that say nothing about where the listing comes from.
const GENERIC_SOURCES = new Set(["", "careerconnect", "e2job", "external", "api", "database", "in-memory-cache", "original"]);

/**
 * The site an external listing comes from, for "View on …": the feed name
 * (Remotive, LinkedIn…) or else the apply link's domain.
 * @param {object} item - listing from a discovery/dashboard feed
 * @returns {string|null}
 */
export const opportunitySourceName = (item) => {
  const name = [item?.platformSource, item?.source].find((s) => typeof s === "string" && !GENERIC_SOURCES.has(s.trim().toLowerCase()));
  if (name) return name.trim();
  const url = externalApplyUrl(item);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Same wording as the server's 400 when a candidate applies without a resume. */
export const resumeRequiredMessage = (type = "Job") =>
  `Please upload your resume before applying for this ${type === "Internship" ? "internship" : "job"}.`;

/** True when the candidate has a resume saved on their account. */
export const hasSavedResume = (user) => typeof user?.resumeUrl === "string" && user.resumeUrl.trim() !== "";

/**
 * Applies the signed-in candidate to a E2Job job or internship, or opens an
 * external listing's apply link in a new tab. Without a saved resume it throws
 * before sending anything; the server enforces the same rule (JP-01).
 * @param {object} item - listing from a discovery/dashboard feed
 * @param {"Job"|"Internship"} type
 * @param {object} [user] - signed-in candidate from the auth store
 * @returns {Promise<{ external: boolean, opened?: boolean, success?: boolean, message?: string }>}
 */
export const applyToOpportunity = async (item, type = "Job", user) => {
  if (isExternalOpportunity(item)) {
    const url = externalApplyUrl(item);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    return { external: true, opened: Boolean(url) };
  }

  if (user && !hasSavedResume(user)) throw new Error(resumeRequiredMessage(type));

  const id = opportunityId(item);
  const res = type === "Internship" ? await applyToInternship(id, {}) : await applyToJob(id, {});
  return { external: false, ...res };
};
