import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import InternshipDiscoveryMenu from "../internships/InternshipDiscoveryMenu";

const DashboardHeader = ({
  user,
  profile,
  searchQuery,
  onSearchChange,
  onOpenMobileSidebar,
  onToggleSidebar,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const studentName = user?.fullName || "Student";
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = studentName.charAt(0).toUpperCase();

  // Close the profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
        return;
      }
    }
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Welcome Summary + Category Discovery Menu */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMenuClick}
            className="p-2.5 -ml-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-700 active:bg-slate-200 transition cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px]"
            aria-label="Toggle navigation menu"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Welcome back, {studentName}!
            </h1>
            <p className="text-xs text-slate-500">
              Build your profile and discover your next opportunity.
            </p>
          </div>

          {/* Internshala-style Category Discovery Menu */}
          <div className="hidden md:block pl-2">
            <InternshipDiscoveryMenu studentCity={profile?.location?.city || ""} />
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search jobs, internships, courses, skills..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm outline-none transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Right: Profile Menu */}
        <div className="flex items-center gap-3">
          {/* User Profile Avatar & Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={studentName}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {initial}
                </div>
              )}
              <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{studentName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1 space-y-0.5">
                  <Link
                    to="/student/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                  >
                    View & Edit Profile
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                  >
                    Account Settings
                  </Link>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
