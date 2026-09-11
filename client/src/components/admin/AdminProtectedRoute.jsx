import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * AdminProtectedRoute — strictly guards Admin routes.
 *
 * Rules:
 * 1. If not authenticated → redirects to /admin/login (with return location).
 * 2. If authenticated as non-admin (student, fresher, professional, employer) → redirects to /admin/login or their dashboard.
 * 3. If authenticated as ADMIN → renders protected page.
 */
const AdminProtectedRoute = ({ children }) => {
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
  if (user.role !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Authenticated Admin
  return children ? children : <Outlet />;
};

export default AdminProtectedRoute;
