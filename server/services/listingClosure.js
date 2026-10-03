// When a job or internship closes, candidates still waiting on it get one
// "position filled" notification (in-app now, included in the daily summary email).
// Application statuses are left alone, because an employer can re-open a listing.

const Application = require("../models/Application");
const { notifyApplicationUpdates } = require("./applicationNotifications");

const FINAL_STATUSES = ["Hired", "Rejected", "Withdrawn"];

/**
 * type: "job" or "internship". Call only when the listing changes to Closed.
 * Returns how many candidates were notified.
 */
const notifyListingClosed = async (type, listingId, { senderId = null } = {}) => {
  const field = type === "internship" ? "internshipId" : "jobId";
  const waiting = await Application.find({ [field]: listingId, status: { $nin: FINAL_STATUSES } })
    .select("_id candidateId opportunityTitle companyName")
    .lean();
  if (waiting.length === 0) return 0;
  const created = await notifyApplicationUpdates(waiting, "PositionFilled", { senderId });
  return created.length;
};

/** Fire-and-forget wrapper for request handlers. */
const notifyListingClosedInBackground = (type, listingId, options) => {
  setImmediate(() => {
    notifyListingClosed(type, listingId, options)
      .catch((err) => console.warn(`Position-filled notifications failed for ${type} ${listingId}: ${err.message}`));
  });
};

module.exports = { notifyListingClosed, notifyListingClosedInBackground };
