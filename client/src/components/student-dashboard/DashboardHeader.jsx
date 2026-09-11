import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import InternshipDiscoveryMenu from "../internships/InternshipDiscoveryMenu";
import recruitmentService from "../../services/recruitmentService";

const DashboardHeader = ({
  user,
  profile,
  searchQuery,
  onSearchChange,
  notifications = [],
  onOpenMobileSidebar,
  onToggleSidebar,
  onLogout,
  onNavigateTab,
}) => {
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState(notifications);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const studentName = user?.fullName || "Student";
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = studentName.charAt(0).toUpperCase();

  const fetchLiveNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await recruitmentService.getNotifications();
      if (res?.success && Array.isArray(res.notifications)) {
        setLiveNotifications(res.notifications);
      }
    } catch (err) {
      // Keep existing notifications on background error
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();
    // Refresh periodically every 45s
    const interval = setInterval(fetchLiveNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      setLiveNotifications(notifications);
    }
  }, [notifications]);

  const unreadCount = liveNotifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await recruitmentService.markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        setLiveNotifications((prev) =>
          prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item))
        );
        await recruitmentService.markNotificationRead(n._id);
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }

    setShowNotifs(false);

    if (
      n.notificationType?.startsWith("INTERVIEW") ||
      n.relatedInterviewId ||
      n.actionUrl?.includes("interviews") ||
      n.title?.toLowerCase().includes("interview")
    ) {
      if (onNavigateTab) {
        onNavigateTab("interviews");
      } else {
        navigate("/student/dashboard?tab=interviews");
      }
    } else if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle + Welcome Summary + Category Discovery Menu */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar || onOpenMobileSidebar}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-700 transition cursor-pointer"
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
            <InternshipDiscoveryMenu studentCity={profile?.location?.city || "Bangalore"} />
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

        {/* Right: Actions, Notifications & Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifs((v) => !v);
                if (!showNotifs) fetchLiveNotifications();
              }}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-blue-600 cursor-pointer hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mt-2">
                  {liveNotifications.length > 0 ? (
                    liveNotifications.map((n) => {
                      const isInterview = n.notificationType?.startsWith("INTERVIEW");
                      const notifDate = n.createdAt
                        ? new Date(n.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })
                        : n.date || "";

                      return (
                        <div
                          key={n._id || n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 rounded-xl cursor-pointer transition flex items-start gap-2.5 ${
                            !n.isRead
                              ? "bg-blue-50/50 hover:bg-blue-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="pt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full block ${
                                !n.isRead ? "bg-blue-600" : "bg-transparent"
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <h4
                                className={`text-xs truncate ${
                                  !n.isRead
                                    ? "font-extrabold text-slate-900"
                                    : "font-semibold text-slate-700"
                                }`}
                              >
                                {n.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                {notifDate}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            {isInterview && (
                              <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mt-1">
                                Interview Update →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center space-y-1">
                      <div className="text-2xl">🔔</div>
                      <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                    </div>
                  )}
                </div>

                {/* Footer Quick Link */}
                <div className="pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifs(false);
                      if (onNavigateTab) {
                        onNavigateTab("interviews");
                      } else {
                        navigate("/student/dashboard?tab=interviews");
                      }
                    }}
                    className="text-xs font-bold text-[#1e3a8a] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Interview Schedule</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
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
                    to="/student/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                  >
                    Manage Settings
                  </Link>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
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
