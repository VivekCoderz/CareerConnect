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

module.exports = {
  pickListingUpdate,
  requiresReapproval,
  escapeRegex,
  isPlatformAdmin,
  resolveNewListingModeration,
  checkEmployerStatusChange,
};
