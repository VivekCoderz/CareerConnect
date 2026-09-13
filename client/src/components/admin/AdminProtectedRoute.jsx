import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * AdminProtectedRoute — strictly guards Admin routes.
 *
 * Rules:
 * 1. If not authenticated → redirects to /admin/login (with return location).
 * 2. If authenticated as non-admin (student, fresher, professional, employer) → redirects to /admin/login.
 * 3. If requiredRole is specified (e.g. "SUPER_ADMIN") and user does not match → redirects to /admin/dashboard.
 * 4. If authenticated Admin → renders protected page.
 */
const AdminProtectedRoute = ({ allowedRoles = [], children }) => {
  const location = useLocation();
  const { user, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Authenticating administrative session...</p>
      </div>
    );
  }

  // 1. Not authenticated
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 2. Authenticated, but NOT an admin
  const isAdmin =
    user.role === "SUPER_ADMIN" ||
    user.role === "COMPANY_ADMIN" ||
    user.role === "admin";

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Check role-specific restriction (e.g., SUPER_ADMIN only for Companies & Company Admins)
  if (allowedRoles.length > 0) {
    const isSuperAdmin = user.role === "SUPER_ADMIN" || (user.role === "admin" && !user.companyId);
    const isCompanyAdmin = user.role === "COMPANY_ADMIN";

    let hasRole = false;
    if (allowedRoles.includes("SUPER_ADMIN") && isSuperAdmin) {
      hasRole = true;
    } else if (allowedRoles.includes("COMPANY_ADMIN") && isCompanyAdmin) {
      hasRole = true;
    } else if (allowedRoles.includes(user.role)) {
      hasRole = true;
    }

    if (!hasRole) {
      if (isCompanyAdmin && allowedRoles.includes("SUPER_ADMIN")) {
        return <Navigate to="/admin/company" replace />;
      }
      if (isSuperAdmin && allowedRoles.includes("COMPANY_ADMIN")) {
        return <Navigate to="/admin/companies" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // 4. Authenticated Admin
  return children ? children : <Outlet />;
};

export default AdminProtectedRoute;
