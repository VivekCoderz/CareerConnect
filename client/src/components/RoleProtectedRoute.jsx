import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../utils/dashboardRedirect";

/**
 * RoleProtectedRoute — guards routes based on user role/type.
 *
 * Trusts the global AuthInitializer in App.jsx for the initial session check.
 *
 * @param {Array<string>} allowedRoles - e.g. ["student"], ["employer"]
 */
const RoleProtectedRoute = ({ allowedRoles = [], children }) => {
  const location = useLocation();
  const { user, isInitialized } = useSelector((state) => state.auth);

  // Fallback loading (should rarely be seen since AuthInitializer handles this)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#f59e0b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading your workspace...</p>
      </div>
    );
  }

  // 1. Not authenticated → redirect to login, preserving current location
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1b. Password not set yet (first-time Google users) → redirect to set-password
  if (user.hasPassword === false) {
    return <Navigate to="/set-password" replace />;
  }

  const isAdminRole =
    user.role === "admin" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "COMPANY_ADMIN";

<<<<<<< HEAD
  // 1c. Profile information not collected yet (phone empty) → redirect to onboarding (skip for admins)
  if (!isAdminRole && !user.phone?.trim()) {
=======
  // 1c. Incomplete profiles finish onboarding before entering a dashboard.
  if (!isAdminRole && (!user.phone?.trim() || (user.role !== "employer" && !user.isProfileComplete))) {
>>>>>>> a199183776cf01392a84dcd335f05d512164538e
    if (user.role === "employer") {
      return <Navigate to="/onboarding/employer" replace />;
    }
    return <Navigate to="/onboarding/profile" replace />;
  }

  // 2. Determine effective role
  const effectiveRole = isAdminRole
    ? user.role
    : user.role === "employer"
    ? "employer"
    : user.userType || (user.role && user.role !== "user" ? user.role : "student");

  const validRoles = [
    "student",
    "fresher",
    "professional",
    "employer",
    "admin",
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
  ];
  if (!effectiveRole || !validRoles.includes(effectiveRole)) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  // 3. Wrong role's route → redirect to their own dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
    if (isAdminRole) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    const ownDashboard = getDashboardPath(effectiveRole, user);
    return <Navigate to={ownDashboard} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleProtectedRoute;
