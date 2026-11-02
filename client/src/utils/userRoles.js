// Mirrors isCandidate() in server/middleware/roleMiddleware.js: only candidates can apply.
const CANDIDATE_TYPES = ["student", "fresher", "professional"];
const NON_CANDIDATE_ROLES = ["employer", "admin", "SUPER_ADMIN", "COMPANY_ADMIN"];

export const isCandidateUser = (user) =>
  Boolean(user) &&
  CANDIDATE_TYPES.includes(user.userType) &&
  !NON_CANDIDATE_ROLES.includes(user.role) &&
  user.adminLevel !== "COMPANY_ADMIN";

const ADMIN_ROLES = ["admin", "SUPER_ADMIN", "COMPANY_ADMIN"];

// Signup isn't finished, so the user goes to onboarding first. Employers are done once they
// gave their company details (the mobile number is optional for them); candidates need a
// phone and a completed profile. Admins never onboard.
export const needsOnboarding = (user) => {
  if (!user || ADMIN_ROLES.includes(user.role)) return false;
  if (user.role === "employer") return !user.onboardingComplete && !user.phone?.trim();
  return !user.phone?.trim() || !user.isProfileComplete;
};
