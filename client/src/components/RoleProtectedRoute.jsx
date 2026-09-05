import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../utils/dashboardRedirect";

/**
 * RoleProtectedRoute — guards routes based on user role/type.
 *
 * Now trusts the global AuthInitializer in App.jsx for the initial session check.
 * By the time any protected route renders, isInitialized is already true (the
 * loading spinner in AuthInitializer has completed).
 *
 * Behavior:
 *  - isInitialized = false → show loading (shouldn't happen since AuthInitializer runs first)
 *  - user = null → redirect to /login
 *  - user has no valid role → redirect to /select-role
 *  - user accessing wrong role's route → redirect to their own dashboard
 *  - everything OK → render the protected page (Outlet or children)
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

  // 2. Determine effective role
  const effectiveRole = user.role === "employer" ? "employer" : user.userType;

  const validRoles = ["student", "fresher", "professional", "employer"];
  if (!effectiveRole || !validRoles.includes(effectiveRole)) {
    return <Navigate to="/select-role" replace />;
  }

  // 3. Wrong role's route → redirect to their own dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
    const ownDashboard = getDashboardPath(effectiveRole, user);
    return <Navigate to={ownDashboard} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleProtectedRoute;
