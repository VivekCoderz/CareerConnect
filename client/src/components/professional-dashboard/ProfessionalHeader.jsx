import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

const ProfessionalHeader = ({
  user,
  profile,
  professionalName: propName,
  professionalRole: propRole,
  activeTab,
  onSelectTab,
  onOpenMobileSidebar,
  onToggleSidebar,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  const professionalName =
    propName || user?.fullName || profile?.userId?.fullName || "Arya";
  const headline =
    propRole ||
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Not set yet";
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = professionalName.charAt(0).toUpperCase();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { id: "dashboard", label: "Dashboard", isTab: true },
    { id: "opportunities", label: "Opportunities", isTab: true },
    { id: "jobs", label: "Jobs", isTab: true },
    { id: "courses", label: "Courses", isTab: true },
    { id: "interviews", label: "Interviews", isTab: true },
    { id: "applications", label: "Applications", isTab: true },
    { id: "profile", label: "Profile", link: "/professional/profile" },
  ];

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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & Brand & Top Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={handleMenuClick}
            className="p-2.5 -ml-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-purple-600 active:bg-slate-200 transition flex items-center justify-center min-w-[40px] min-h-[40px] cursor-pointer"
            aria-label="Toggle navigation"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/professional/dashboard" className="flex items-center gap-2.5 shrink-0">
            <BrandLogo markOnly className="w-9 h-9 sm:hidden" />
            <BrandLogo className="hidden h-9 w-44 sm:block" />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-5">
            {navLinks.map((item) => {
              const isActive = activeTab === item.id;
              if (item.link) {
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition text-slate-600 hover:text-purple-700 hover:bg-purple-50/60"
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab && onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    isActive
                      ? "text-purple-700 bg-purple-50 font-bold border border-purple-100"
                      : "text-slate-600 hover:text-purple-700 hover:bg-purple-50/60"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Avatar, Name & Dropdown */}
        <div className="flex items-center gap-3">
          {/* Profile / Avatar / Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={professionalName}
                  className="w-8 h-8 rounded-lg object-cover border border-purple-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {initial}
                </div>
              )}

              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-slate-900 leading-tight">
                  {professionalName}
                </span>
                <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                  {headline}
                </span>
              </div>

              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{professionalName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || ""}</p>
                </div>
                <div className="py-1 space-y-0.5">
                  <Link
                    to="/professional/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition"
                  >
                    View & Edit Profile
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onSelectTab) onSelectTab("settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition text-left"
                  >
                    Career & Privacy Settings
                  </button>
                  <Link
                    to="/account"
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition text-left"
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

export default ProfessionalHeader;
