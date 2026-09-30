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

const escapeRegex = (value) => String(value || "").slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isPlatformAdmin = (user) =>
  user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

// New listings from employers always go to moderation unless explicitly saved as a draft.
// Only platform admins may create a listing that is published straight away.
const resolveInitialListingStatus = (user, requestedStatus) => {
  if (isPlatformAdmin(user)) {
    return ["Draft", "Pending Approval", "Published"].includes(requestedStatus)
      ? requestedStatus
      : "Published";
  }
  return requestedStatus === "Draft" ? "Draft" : "Pending Approval";
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
  // Approving clears rejectedAt, so a set rejectedAt means the last moderation decision was a rejection.
  const approved = Boolean(listing.approvedAt) && !listing.rejectedAt;
  if (REOPENABLE_STATUSES.includes(listing.status) && approved) return null;
  return { code: 403, message: "This listing must be approved by an admin before it can be published" };
};

module.exports = {
  pickListingUpdate,
  escapeRegex,
  isPlatformAdmin,
  resolveInitialListingStatus,
  checkEmployerStatusChange,
};
