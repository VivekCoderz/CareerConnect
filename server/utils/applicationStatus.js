// One transition map for every endpoint that changes Application.status (BUG-05..13):
// single status, ATS stage, move-next, bulk, pipeline select/reject/round, interviews,
// offers, candidate withdraw and the admin override.
//
// Rules:
// - While in the pipeline (Applied .. Interview Completed) an application can move to any
//   later or earlier pipeline stage except back to Applied, or to Selected / Rejected.
// - An offer can be sent once the candidate is past screening (Shortlisted onwards).
// - Selected -> Offered / Hired / Rejected; Offered -> Hired / Rejected (or a new offer).
// - Hired, Rejected and Withdrawn are final. Rejected can come back only through an
//   explicit reopen (to Under Review). Withdrawn is the candidate's decision and is never
//   reopened by an employer.
// - Only the candidate (or a platform admin) can set Withdrawn.

const Application = require("../models/Application");

// Old lowercase / snake_case values still exist in stored applications.
const LEGACY_STATUS = {
  applied: "Applied",
  approved: "Approved",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  interview: "Interview",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  in_progress: "In Progress",
  selected: "Selected",
  offer: "Offered",
  offered: "Offered",
  Offer: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const normalizeStatus = (status) => LEGACY_STATUS[status] || status || "Applied";

// "Approved" and "In Progress" are older pipeline values: accepted as a current status,
// never set as a new one.
const PIPELINE = [
  "Applied", "Approved", "Under Review", "In Progress", "Shortlisted", "Assessment",
  "Interview", "Interview Scheduled", "Interview Completed",
];
const PIPELINE_TARGETS = ["Under Review", "Shortlisted", "Assessment", "Interview", "Interview Scheduled", "Interview Completed"];
const OFFERABLE = ["Shortlisted", "Assessment", "Interview", "Interview Scheduled", "Interview Completed", "Selected"];
const FINAL_STATUSES = ["Hired", "Rejected", "Withdrawn"];

const TRANSITIONS = Object.fromEntries(PIPELINE.map((status) => [
  status,
  [...PIPELINE_TARGETS, "Selected", "Rejected", "Withdrawn", ...(OFFERABLE.includes(status) ? ["Offered"] : [])],
]));
TRANSITIONS.Selected = ["Offered", "Hired", "Rejected", "Withdrawn"];
TRANSITIONS.Offered = ["Offered", "Hired", "Rejected", "Withdrawn"];
TRANSITIONS.Hired = [];
TRANSITIONS.Rejected = [];
TRANSITIONS.Withdrawn = [];

// Explicit reopen: Rejected -> Under Review.
const REOPEN = { Rejected: ["Under Review"] };

// Statuses only some actors may set.
const RESTRICTED_TARGETS = { Withdrawn: ["candidate", "admin"] };

/**
 * Returns null when `from` -> `to` is allowed, otherwise a message for the client.
 * actor: "employer" (default), "candidate" or "admin". reopen: true for an explicit reopen.
 */
const checkTransition = (from, to, { actor = "employer", reopen = false } = {}) => {
  const current = normalizeStatus(from);
  const target = normalizeStatus(to);
  const allowedActors = RESTRICTED_TARGETS[target];
  if (allowedActors && !allowedActors.includes(actor)) {
    return `Only the candidate can mark an application as ${target}`;
  }
  if (current === target && !FINAL_STATUSES.includes(current)) return null;
  const allowed = reopen ? REOPEN[current] || [] : TRANSITIONS[current] || [];
  if (allowed.includes(target)) return null;
  if (FINAL_STATUSES.includes(current)) {
    return current === "Rejected" && !reopen
      ? "This application is rejected. Reopen it before changing its status."
      : `This application is ${current} and can no longer change`;
  }
  return `Cannot move an application from ${current} to ${target}`;
};

const canTransition = (from, to, options) => checkTransition(from, to, options) === null;

/** Every stored status (legacy spellings included) that may move to `to`. */
const statusesThatCanMoveTo = (to, options) => {
  const stored = Application.schema.path("status").enumValues;
  return [...new Set(stored)].filter((status) => canTransition(status, to, options));
};

/**
 * Atomically sets status `to` (plus `update`) only if the application's current status may
 * move there. If it may not, `update` is still applied without the status fields (so notes
 * are kept) and `applied` is false. Returns { applied, previous } with the document as it was.
 */
const guardedStatusUpdate = async (applicationId, to, update = {}, options = {}) => {
  const { $set = {}, ...rest } = update;
  const previous = await Application.findOneAndUpdate(
    { _id: applicationId, status: { $in: statusesThatCanMoveTo(to, options) } },
    { ...rest, $set: { ...$set, status: to } },
  );
  if (previous) return { applied: true, previous };

  const statusFields = new Set(["status", "stage", "overallStatus"]);
  const keptSet = Object.fromEntries(Object.entries($set).filter(([key]) => !statusFields.has(key)));
  const fallback = { ...rest, ...(Object.keys(keptSet).length ? { $set: keptSet } : {}) };
  const unchanged = Object.keys(fallback).length
    ? await Application.findByIdAndUpdate(applicationId, fallback)
    : await Application.findById(applicationId);
  return { applied: false, previous: unchanged };
};

module.exports = {
  FINAL_STATUSES,
  OFFERABLE,
  checkTransition,
  canTransition,
  guardedStatusUpdate,
  normalizeStatus,
  statusesThatCanMoveTo,
};
