// Same rule as server/utils/listingExpiry.js: a listing deadline means "applications close at
// the end of that day in India (IST, UTC+05:30)". India has no daylight saving, so the offset
// is fixed. A date-only deadline such as "2026-10-15" is stored as 2026-10-15T00:00Z, which is
// 05:30 IST on the 15th, so it falls on the intended day.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const istDayStart = (date) => {
  const istMs = date.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(istMs / DAY_MS) * DAY_MS - IST_OFFSET_MS);
};

/** True when the deadline's IST day is already over (no deadline: never). */
export const isPastDeadline = (deadline, now = new Date()) => {
  if (!deadline) return false;
  const date = new Date(deadline);
  return !Number.isNaN(date.getTime()) && date < istDayStart(now);
};

/** The last instant applications are open: 23:59:59.999 IST on the deadline day, or null. */
export const deadlineEndIST = (deadline) => {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(istDayStart(date).getTime() + DAY_MS - 1);
};
