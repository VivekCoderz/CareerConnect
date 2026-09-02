import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../services/authService";
import { logout } from "../../redux/features/authSlice";

const EmployerNavbar = ({ onOpenMobileSidebar, profile = {} }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      // ignore
    }
    dispatch(logout());
    navigate("/login?type=employer", { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link to="/employer/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#92400e] to-[#b45309] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            GU
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              GEETA UNIVERSITY
            </h1>
            <p className="text-[10px] text-[#b45309] font-bold tracking-wide uppercase mt-0.5">
              CareerConnect · Employer Hub
            </p>
          </div>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Link
          to={`/companies/${profile._id || profile.userId || "preview"}`}
          className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-700 hover:text-[#b45309] bg-slate-50 hover:bg-amber-50 transition"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Public Profile View
        </Link>

        <Link
          to="/employer/profile"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Company Setup
        </Link>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Account */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-xs text-[#92400e] overflow-hidden">
            {profile.logo ? (
              <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              profile.companyName?.[0] || user?.fullName?.[0] || "E"
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-red-600 font-semibold p-1 transition"
            title="Sign Out"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};

export default EmployerNavbar;
