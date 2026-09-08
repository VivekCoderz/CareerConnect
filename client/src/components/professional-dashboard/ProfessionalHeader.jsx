import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const ProfessionalHeader = ({
  user,
  profile,
  activeTab,
  onSelectTab,
  notifications = [],
  onOpenMobileSidebar,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const professionalName = user?.fullName || profile?.userId?.fullName || "Arya";
  const headline =
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Senior Software Engineer";
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = professionalName.charAt(0).toUpperCase();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { id: "dashboard", label: "Dashboard", isTab: true },
    { id: "opportunities", label: "Opportunities", isTab: true },
    { id: "growth", label: "Career Growth", isTab: true },
    { id: "applications", label: "Applications", isTab: true },
    { id: "profile", label: "Profile", link: "/professional/profile" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand & Top Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            aria-label="Open navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/professional/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-purple-600/30 text-base">
              C
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-lg hidden sm:inline">
              CareerConnect
            </span>
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

        {/* Right: Notifications, Avatar, Name & Dropdown */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-purple-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">Notifications</span>
                  <span className="text-[11px] font-semibold text-purple-600 cursor-pointer hover:underline">
                    Mark all as read
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-2">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n, idx) => (
                      <div key={idx} className="py-3 first:pt-1 last:pb-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.date || "Today"}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications at this time
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || "arya@careerconnect.com"}</p>
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
