// Mirrors server/utils/listingSecurity.js: an employer may only (re)publish a
// Paused/Closed listing whose latest moderation decision was an approval.
export const canEmployerRepublish = (listing) =>
  ["Paused", "Closed"].includes(listing?.status) &&
  Boolean(listing?.approvedAt) &&
  !listing?.rejectedAt;
