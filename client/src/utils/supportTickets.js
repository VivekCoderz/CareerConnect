// Mirrors the server's SupportTicket model.
export const TICKET_CATEGORIES = ["Account", "Profile", "Jobs & Internships", "Applications", "Interviews", "Payments", "Technical Issue", "Other"];
export const TICKET_STATUSES = ["Open", "In Progress", "Reopened", "Solved", "Not Solved", "Closed", "Expired"];
// Admin verdicts: the ticket waits for the user's feedback and is locked for the admin.
export const VERDICT_STATUSES = ["Solved", "Not Solved"];
// Statuses an admin can set.
export const ADMIN_STATUSES = ["In Progress", ...VERDICT_STATUSES];
export const FINAL_STATUSES = ["Closed", "Expired"];
// The user's MAX_NOT_SOLVED-th "not solved" expires the ticket.
export const MAX_NOT_SOLVED = 3;

export const formatTicketDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
