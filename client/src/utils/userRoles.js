// Mirrors isCandidate() in server/middleware/roleMiddleware.js: only candidates can apply.
const CANDIDATE_TYPES = ["student", "fresher", "professional"];
const NON_CANDIDATE_ROLES = ["employer", "admin", "SUPER_ADMIN", "COMPANY_ADMIN"];

export const isCandidateUser = (user) =>
  Boolean(user) &&
  CANDIDATE_TYPES.includes(user.userType) &&
  !NON_CANDIDATE_ROLES.includes(user.role) &&
  user.adminLevel !== "COMPANY_ADMIN";
