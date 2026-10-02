// Listing deadlines (Job.deadline, Internship.deadline) mean "applications close at the
// end of that day in India (IST, UTC+05:30)". India has no daylight saving time, so the
// offset is fixed.
//
// Rather than converting every stored deadline, compare it with one cutoff: the instant
// today started in IST. A deadline anywhere on today's IST date (or later) is >= that
// cutoff, so the listing stays open until 23:59:59.999 IST on its deadline day. A deadline
// on an earlier IST date is < the cutoff, so it has expired. A date-only value such as
// "2026-10-15" is stored as 2026-10-15T00:00Z = 05:30 IST on the 15th, so it lands on the
// intended day. The comparison is a plain range on `deadline`, so it can use an index.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant today began in IST (00:00 Asia/Kolkata), as a Date. */
const startOfTodayIST = (now = new Date()) => {
  const istMs = now.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(istMs / DAY_MS) * DAY_MS - IST_OFFSET_MS);
};

/** True when the listing has a deadline whose IST day is already over. */
const isListingExpired = (listing, now = new Date()) => {
  if (!listing?.deadline) return false;
  const deadline = new Date(listing.deadline);
  return !Number.isNaN(deadline.getTime()) && deadline < startOfTodayIST(now);
};

/** Mongo clause matching listings that have no deadline or whose deadline day hasn't ended. */
const openDeadlineClause = (now = new Date()) => ({
  $or: [{ deadline: null }, { deadline: { $gte: startOfTodayIST(now) } }],
});

/**
 * Adds the open-deadline clause to `query` under $and (so an existing $or is kept).
 * Mutates and returns `query`.
 */
const withOpenDeadline = (query, now = new Date()) => {
  query.$and = [...(query.$and || []), openDeadlineClause(now)];
  return query;
};

/** Query for listings candidates may see: Published and not past the deadline. */
const openListingQuery = (extra = {}, now = new Date()) =>
  withOpenDeadline({ status: "Published", ...extra, $and: [...(extra.$and || [])] }, now);

const APPLICATIONS_CLOSED = "Applications for this listing are closed";

/** True when candidates may apply: the listing is Published and its deadline day hasn't ended. */
const acceptsApplications = (listing, now = new Date()) =>
  listing?.status === "Published" && !isListingExpired(listing, now);

/** Mongo clause matching Published listings whose deadline day has ended. */
const expiredPublishedClause = (now = new Date()) => ({
  status: "Published",
  deadline: { $lt: startOfTodayIST(now) },
});

/**
 * Closes Published jobs and internships whose deadline has passed. Uses the
 * { status, deadline } index. Returns the number of listings closed per model.
 */
const closeExpiredListings = async ({ now = new Date(), onChange } = {}) => {
  const Job = require("../models/Job");
  const Internship = require("../models/Internship");
  const filter = expiredPublishedClause(now);
  const update = { $set: { status: "Closed", closedReason: "expired", closedAt: now } };
  const [jobs, internships] = await Promise.all([
    Job.updateMany(filter, update),
    Internship.updateMany(filter, update),
  ]);
  const result = { jobs: jobs.modifiedCount, internships: internships.modifiedCount };
  if ((result.jobs || result.internships) && onChange) onChange(result);
  return result;
};

module.exports = {
  APPLICATIONS_CLOSED,
  acceptsApplications,
  startOfTodayIST,
  isListingExpired,
  openDeadlineClause,
  withOpenDeadline,
  openListingQuery,
  closeExpiredListings,
};
