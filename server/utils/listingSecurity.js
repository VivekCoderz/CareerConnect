const { isListingExpired } = require("./listingExpiry");
const { sanitizeProfileUpdate } = require("./profileUpdate");

// Status is intentionally absent: it only changes through the moderation-aware
// status endpoints (employer) or the admin approve/reject endpoints.
const editableListingFields = new Set([
  "title", "department", "category", "subCategory", "employmentType", "workMode",
  "location", "city", "state", "country", "isPaid", "hasJobOffer",
  "isInternational", "stipend", "stipendAmount", "duration", "openings",
  "description", "responsibilities", "requiredSkills", "preferredSkills",
  "bonusSkills", "education", "eligibility", "deadline", "salaryRange",
  "experience", "benefits", "applicationDeadline", "applyUrl",
  "interviewRounds",
]);

const pickListingUpdate = (body) => Object.fromEntries(
  Object.entries(sanitizeProfileUpdate(body)).filter(([key]) => editableListingFields.has(key))
);

// Edits to these fields don't change what candidates read, so a published
// listing stays live. Any other content change sends it back to moderation.
const fieldsNotNeedingReview = new Set(["openings", "deadline", "applicationDeadline", "interviewRounds"]);

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const requiresReapproval = (listing, updates) => {
  if (listing.status !== "Published") return false;
  const current = listing.toObject({ depopulate: true });
  return Object.entries(updates).some(
    ([key, value]) => !fieldsNotNeedingReview.has(key) && !sameValue(current[key], value)
  );
};

// Pay ranges by listing field. A max of 0 means "no maximum" (shown as "₹X+").
const PAY_RANGE_FIELDS = { salaryRange: "Salary", stipendAmount: "Stipend" };

/**
 * BUG-20 / BUG-21: returns a message when the listing input is invalid, otherwise null.
 * - A deadline can't be in the past. Today is fine: listings stay open until the end of
 *   their deadline day in IST (utils/listingExpiry.js). Re-sending the stored deadline
 *   unchanged is allowed, so an expired listing can still be edited.
 * - A pay range's minimum can't be above its maximum. On update `existing` is the stored
 *   listing, so when only one side is sent it is compared with the stored other side.
 */
const checkListingInput = (input, existing = null) => {
  const { deadline } = input;
  if (deadline !== undefined && deadline !== null && deadline !== "") {
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return "Invalid deadline";
    const unchanged = existing?.deadline && new Date(existing.deadline).getTime() === date.getTime();
    if (!unchanged && isListingExpired({ deadline: date })) return "Deadline cannot be in the past";
  }

  for (const [field, label] of Object.entries(PAY_RANGE_FIELDS)) {
    const sent = input[field];
    if (sent === undefined || sent === null) continue;
    if (typeof sent !== "object" || Array.isArray(sent)) return `${label} range is invalid`;
    const stored = existing?.[field] || {};
    const min = Number(sent.min !== undefined ? sent.min : stored.min ?? 0);
    const max = Number(sent.max !== undefined ? sent.max : stored.max ?? 0);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < 0) {
      return `${label} must be zero or more`;
    }
    if (max > 0 && min > max) return `${label} minimum cannot be more than the maximum`;
  }
  return null;
};

/** On update, a pay range with only one side sent keeps the stored other side. Mutates `updates`. */
const mergePayRanges = (updates, existing) => {
  for (const field of Object.keys(PAY_RANGE_FIELDS)) {
    const sent = updates[field];
    if (!sent || typeof sent !== "object") continue;
    const stored = existing?.[field]?.toObject?.() || existing?.[field] || {};
    updates[field] = { ...stored, ...sent };
  }
  return updates;
};

const escapeRegex = (value) => String(value || "").slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isPlatformAdmin = (user) =>
  user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

// Moderation fields for a new listing. Employer listings go to moderation unless saved
// as a draft, or unless autoApproveJobs is on and the employer is verified. Platform
// admins may publish directly. Never auto-publishes for unverified employers.
const resolveNewListingModeration = (user, requestedStatus, { autoApproveJobs = false, employerApproved = false } = {}) => {
  const published = (approvalMethod, approvedBy) => ({
    status: "Published",
    approvedBy,
    approvedAt: new Date(),
    approvalMethod,
  });
  const unpublished = (status) => ({ status, approvedBy: null, approvedAt: null, approvalMethod: null });

  if (isPlatformAdmin(user)) {
    if (["Draft", "Pending Approval"].includes(requestedStatus)) return unpublished(requestedStatus);
    return published("admin", user._id);
  }
  if (requestedStatus === "Draft") return unpublished("Draft");
  if (autoApproveJobs && employerApproved) return published("auto", null);
  return unpublished("Pending Approval");
};

const EMPLOYER_SETTABLE_STATUSES = ["Draft", "Pending Approval", "Paused", "Closed", "Published"];
const REOPENABLE_STATUSES = ["Paused", "Closed"];

// Returns null when the employer may move `listing` to `nextStatus`,
// otherwise { code, message } describing why not.
const checkEmployerStatusChange = (listing, nextStatus) => {
  if (!EMPLOYER_SETTABLE_STATUSES.includes(nextStatus)) {
    return { code: 400, message: `Invalid status. Allowed: ${EMPLOYER_SETTABLE_STATUSES.join(", ")}` };
  }
  if (nextStatus !== "Published" || listing.status === "Published") return null;
  if (isListingExpired(listing)) {
    return { code: 400, message: "This listing's deadline has passed. Set a future deadline before re-opening it." };
  }
  // Approving clears rejectedAt, so a set rejectedAt means the last moderation decision was a rejection.
  const approved = Boolean(listing.approvedAt) && !listing.rejectedAt;
  if (REOPENABLE_STATUSES.includes(listing.status) && approved) return null;
  return { code: 403, message: "This listing must be approved by an admin before it can be published" };
};

// Moderation details are for the listing's owner and platform admins only; the
// public detail pages must not show them.
const INTERNAL_LISTING_FIELDS = [
  "adminNote", "rejectionReason", "rejectedBy", "rejectedAt", "approvedBy", "approvalMethod",
];

const toPublicListing = (listing, user) => {
  const plain = typeof listing?.toObject === "function" ? listing.toObject() : { ...listing };
  const ownerId = plain.createdBy?._id || plain.createdBy;
  if (isPlatformAdmin(user) || (user && String(ownerId) === String(user._id))) return plain;
  for (const field of INTERNAL_LISTING_FIELDS) delete plain[field];
  return plain;
};

/** Listings in `extra` whose id is not already in `listed` (feed fallbacks can repeat a DB result). */
const withoutListed = (extra, listed) => {
  const ids = new Set(listed.map((item) => String(item._id)));
  return extra.filter((item) => !ids.has(String(item._id)));
};

module.exports = {
  checkListingInput,
  mergePayRanges,
  pickListingUpdate,
  toPublicListing,
  requiresReapproval,
  escapeRegex,
  isPlatformAdmin,
  resolveNewListingModeration,
  checkEmployerStatusChange,
  withoutListed,
};
