/**
 * Returns the appropriate dashboard route based on user type or role.
 * @param {string} userType - "student" | "fresher" | "professional" | "employer"
 * @param {object} user - User object containing role and userType
 * @returns {string} - Dashboard path or fallback to select-role
 */
export const getDashboardPath = (userType, user = null) => {
  const roleOrType =
    user?.role === "employer"
      ? "employer"
      : user?.userType ||
        userType ||
        (user?.role && user.role !== "user" ? user.role : null);

  switch (roleOrType) {
    case "employer":
      return "/employer/dashboard";

    case "student":
      return "/student/dashboard";

    case "fresher":
      return "/fresher/dashboard";

    case "professional":
      return "/professional/dashboard";

    default:
      return "/select-role";
  }
};

export default getDashboardPath;
