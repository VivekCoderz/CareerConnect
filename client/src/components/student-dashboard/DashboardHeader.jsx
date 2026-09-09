import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import InternshipDiscoveryMenu from "../internships/InternshipDiscoveryMenu";
import NotificationInboxDrawer from "../notifications/NotificationInboxDrawer";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeToNotifications,
} from "../../services/notificationService";

const DashboardHeader = ({
  user,
  profile,
  searchQuery,
  onSearchChange,
  notifications: propNotifications = [],
  onOpenMobileSidebar,
  onLogout,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Live Notification State
  const [notifList, setNotifList] = useState([]);
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  const studentName = user?.fullName || "Student";
  const profileImage = user?.profileImage || profile?.userId?.profileImage;
  const initial = studentName.charAt(0).toUpperCase();

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications({ limit: 30 });
      if (data?.notifications) {
        setNotifList(data.notifications);
        setLiveUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Could not load notifications:", err.message);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time SSE notification stream
    const unsubscribe = subscribeToNotifications((newNotif) => {
      setNotifList((prev) => [newNotif, ...prev.filter((item) => (item._id || item.id) !== (newNotif._id || newNotif.id))]);
      setLiveUnreadCount((c) => c + 1);
    });

    return () => unsubscribe();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setLiveUnreadCount(0);
    } catch (e) {
      console.warn("Failed to mark all read:", e);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await markNotificationRead(notif._id || notif.id);
        setNotifList((prev) =>
          prev.map((n) =>
            (n._id || n.id) === (notif._id || notif.id) ? { ...n, isRead: true } : n
          )
        );
        setLiveUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.warn("Failed to mark read:", e);
    }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await deleteNotification(id);
      setNotifList((prev) => prev.filter((n) => (n._id || n.id) !== id));
    } catch (e) {
      console.warn("Failed to delete notification:", e);
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
        {/* Left: Mobile Hamburger + Welcome Summary + Category Discovery Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              onClick={() => setShowNotifs((v) => !v)}
              className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Notification Inbox"
              title="Notification Inbox"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {liveUnreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse shadow-xs">
                  {liveUnreadCount > 9 ? "9+" : liveUnreadCount}
                </span>
              )}
            </button>

            <NotificationInboxDrawer
              isOpen={showNotifs}
              onClose={() => setShowNotifs(false)}
              notifications={notifList}
              unreadCount={liveUnreadCount}
              onNotificationClick={handleNotificationClick}
              onMarkAllRead={handleMarkAllRead}
              onDeleteNotification={handleDeleteNotif}
              onRefresh={loadNotifications}
            />
          </div>

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
