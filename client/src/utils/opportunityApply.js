import { applyToJob, applyToInternship } from "../services/applicationService";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const opportunityId = (item) => String(item?._id || item?.id || "");

// Only CareerConnect listings (real database ids) accept applications here; scraped and
// partner listings are applied to on the employer's own site.
export const isExternalOpportunity = (item) =>
  item?.isExternal === true || !OBJECT_ID.test(opportunityId(item));

export const externalApplyUrl = (item) => {
  const url = item?.applyLink || item?.applyUrl || "";
  return /^https?:\/\//i.test(url) ? url : null;
};

/**
 * Applies the signed-in candidate to a CareerConnect job or internship, or opens an
 * external listing's apply link in a new tab.
 * @param {object} item - listing from a discovery/dashboard feed
 * @param {"Job"|"Internship"} type
 * @returns {Promise<{ external: boolean, opened?: boolean, success?: boolean, message?: string }>}
 */
export const applyToOpportunity = async (item, type = "Job") => {
  if (isExternalOpportunity(item)) {
    const url = externalApplyUrl(item);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    return { external: true, opened: Boolean(url) };
  }

  const id = opportunityId(item);
  const res = type === "Internship" ? await applyToInternship(id, {}) : await applyToJob(id, {});
  return { external: false, ...res };
};
