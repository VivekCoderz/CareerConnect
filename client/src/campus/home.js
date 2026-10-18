/** Where a signed-in person starts: staff, manager or student. */
export const homeFor = ({ member, staff, needsConsent }) => {
  if (staff) return "/ops/students";
  if (!member) return "/";
  if (needsConsent) return "/welcome";
  return member.role === "manager" ? "/manager" : "/dashboard";
};
