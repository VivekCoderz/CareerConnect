import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const FresherNavbar = ({ user, onOpenMobileSidebar, onToggleSidebar, onLogout, onSearch }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  const displayName = user?.fullName || "Fresher Graduate";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
        {/* Toggle & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
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

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search jobs, skills, companies..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition"
            />
          </form>
        </div>

        {/* Right Section: Notifications & User Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <Link
            to="/notifications"
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 relative transition"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2.5 right-2.5 ring-2 ring-white" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={displayName}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-blue-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {userInitials}
                </div>
              )}
              <div className="hidden md:block text-left pr-1">
                <p className="text-xs font-bold text-slate-800 leading-none">{displayName}</p>
                <p className="text-[10px] font-semibold text-[#f59e0b] mt-0.5">Fresher</p>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    to="/fresher/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </Link>
                  <Link
                    to="/fresher/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
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

export default FresherNavbar;
