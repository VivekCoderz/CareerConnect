import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Bell,
  CheckCircle2,
  User,
  LogOut,
  ChevronDown,
  Building2,
  Activity,
  Clock,
  Briefcase,
  Calendar,
  ShieldCheck,
  X,
  ExternalLink,
  Users,
  MessageSquare,
} from "lucide-react";
import useLogout from "../../hooks/useLogout";
import BrandLogo from "../common/BrandLogo";
import MessagingDrawer from "../common/MessagingDrawer";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "—";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
};

const EmployerNavbar = ({
  onOpenMobileSidebar,
  profile = {},
  company = {},
  profileCompletion = null,
  unreadNotifications = 0,
  activity = [],
  onSelectTab,
}) => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activityMenuOpen, setActivityMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  // Take top recent activities (up to 5 real notifications)
  const recentActivities = useMemo(() => {
    return (activity || []).slice(0, 5);
  }, [activity]);

  const handleLogout = () => {
    logout();
  };

  const companyName = company?.name || profile?.companyName || user?.companyName || "Company";
  const isVerified =
    (company?.verificationStatus || "").toLowerCase() === "verified" ||
    (profile?.verificationStatus || "").toLowerCase() === "verified" ||
    profile?.isVerified === true;

  const completionPct =
    profileCompletion !== null && profileCompletion !== undefined
      ? profileCompletion
      : profile?.profileCompletion !== undefined
      ? profile.profileCompletion
      : user?.profileCompletion !== undefined
      ? user.profileCompletion
      : 0;

  const displayBadgeCount = recentActivities.length || unreadNotifications || 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Brand / Logo & Company Chip */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-amber-700 active:bg-slate-200 transition flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer"
          aria-label="Open navigation menu"
          title="Open sidebar menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link to="/employer/dashboard" className="flex items-center gap-2 shrink-0">
          <BrandLogo markOnly className="h-8 w-10 sm:hidden" />
          <BrandLogo className="hidden h-8 w-40 sm:block" />
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-100 text-amber-800 rounded-md">
            Employer Hub
          </span>
        </Link>

        {/* Company Chip with Name + Connected & Verified */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span className="font-bold text-slate-800 max-w-[140px] truncate">{companyName}</span>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
              <span>Connected &amp; Verified</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Right Controls: Actions + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Profile Completion pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Profile
            </span>
            <span className="text-xs font-bold text-slate-800">{completionPct}%</span>
          </div>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(completionPct, 0), 100)}%` }}
            />
          </div>
        </div>

        {/* Messages Button */}
        <button
          type="button"
          onClick={() => setMessagesOpen(true)}
          className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#1e3a8a] bg-white hover:bg-slate-50 transition flex items-center justify-center cursor-pointer"
          title="Direct Messages"
          aria-label="Open messages"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Recent Activity Bell with Dropdown Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivityMenuOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
              activityMenuOpen
                ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-400/20"
                : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200"
            }`}
            title="Real-Time Notifications"
            aria-label="View notifications and activities"
            aria-expanded={activityMenuOpen}
            aria-haspopup="true"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {displayBadgeCount > 0 ? (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#f59e0b] text-white text-[9px] font-black flex items-center justify-center shadow-2xs">
                {displayBadgeCount > 9 ? "9+" : displayBadgeCount}
              </span>
            ) : null}
          </button>

          {/* Recent Activity Dropdown Popover */}
          {activityMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setActivityMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden text-xs animate-fade-in"
                role="dialog"
                aria-label="Real-Time Notifications"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-amber-50/40 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">Real-Time Notifications</h3>
                      <p className="text-[10.5px] text-slate-500">Live candidate &amp; organization updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {recentActivities.length} recent
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivityMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Close notifications menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body: Real Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                  {recentActivities.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-1.5">
                      <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                        <Activity className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-slate-700 text-xs">No recent notifications</p>
                      <p className="text-[11px] text-slate-400">
                        Candidate applications and organization events will appear here.
                      </p>
                    </div>
                  ) : (
                    recentActivities.map((event) => {
                      const isApp = event.type?.toLowerCase() === "application";
                      const isOrg =
                        event.type?.toLowerCase() === "organization" ||
                        event.type?.toLowerCase() === "settings";

                      return (
                        <div
                          key={event.id}
                          onClick={() => {
                            setActivityMenuOpen(false);
                            if (event.tab && onSelectTab) {
                              onSelectTab(event.tab);
                            } else if (isApp && onSelectTab) {
                              onSelectTab("ats");
                            } else if (event.link) {
                              navigate(event.link);
                            }
                          }}
                          className="p-3.5 hover:bg-amber-50/40 transition flex items-start gap-3 cursor-pointer group"
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-black text-[11px] transition ${
                              isApp
                                ? "bg-blue-50 border border-blue-200 text-blue-800 group-hover:bg-blue-100"
                                : isOrg
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800 group-hover:bg-emerald-100"
                                : "bg-amber-50 border border-amber-200 text-amber-800 group-hover:bg-amber-100"
                            }`}
                          >
                            {isApp ? (
                              <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : isOrg ? (
                              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <span>{event.actorName?.[0] || "N"}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-slate-800 font-semibold text-[11.5px] leading-snug break-words group-hover:text-amber-900 transition">
                              {event.message}
                            </p>
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-medium">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                                  isApp
                                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                                    : isOrg
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {event.type || "Update"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatRelativeTime(event.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 px-2">Live MongoDB verified events</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActivityMenuOpen(false);
                      if (onSelectTab) {
                        onSelectTab("ats");
                      } else {
                        navigate("/employer/dashboard");
                      }
                    }}
                    className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-900 transition px-2 py-1 rounded-lg hover:bg-amber-100/50 cursor-pointer"
                  >
                    <span>View ATS Pipeline</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* User Menu (Profile + Logout) */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen((prev) => !prev);
              setActivityMenuOpen(false);
            }}
            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer focus:outline-none"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-xs text-[#92400e] overflow-hidden">
              {profile.logo ? (
                <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                companyName?.[0] || user?.fullName?.[0] || "E"
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-40 text-xs animate-fade-in">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{user?.fullName || "Employer"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/employer/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-amber-800 font-semibold transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Company Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-semibold transition text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Messaging Drawer */}
      <MessagingDrawer isOpen={messagesOpen} onClose={() => setMessagesOpen(false)} />
    </header>
  );
};

export default EmployerNavbar;
