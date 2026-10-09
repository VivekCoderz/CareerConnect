import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/features/authSlice";
import { getAdminNotifications, adminLogout } from "../../services/adminService";
import BrandLogo from "../common/BrandLogo";
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  Briefcase,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Clock,
  Sparkles,
  RefreshCw,
  LifeBuoy,
} from "lucide-react";

// Pending-alert count beside a sidebar item.
const NavBadge = ({ count, active }) => (
  <span
    className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
      active ? "bg-white text-slate-900" : "bg-amber-500 text-white"
    }`}
  >
    {count > 9 ? "9+" : count}
  </span>
);

const AdminLayout = ({ children, onRefresh, isRefreshing = false }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleAdminLogout = async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.warn("Admin logout error:", err);
    }
    dispatch(setUser(null));
    navigate("/admin/login", { replace: true });
  };

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const notifContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // Load Admin Notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await getAdminNotifications();
        if (res?.success) {
          setNotifications(res.notifications || []);
          setUnreadNotifCount(res.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch admin notifications:", err);
      }
    };
    fetchNotifs();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || (user?.role === "admin" && !user?.companyId);

  // FL-12: Companies and Company Admins are hidden from the Super Admin navigation.
  // Company Admins keep their own Company page; Employers stays Super Admin only.
  const navItems = isSuperAdmin
    ? [
        { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Notifications", path: "/admin/notifications", icon: Bell, badge: unreadNotifCount },
        { label: "Users", path: "/admin/users", icon: GraduationCap },
        { label: "Employers", path: "/admin/employers", icon: Building2 },
        { label: "Opportunities", path: "/admin/opportunities", icon: Briefcase },
        { label: "Applications", path: "/admin/applications", icon: FileSpreadsheet },
        { label: "Reports", path: "/admin/reports", icon: BarChart3 },
        { label: "Support Tickets", path: "/admin/support-tickets", icon: LifeBuoy },
        { label: "Settings", path: "/admin/settings", icon: Settings },
      ]
    : [
        { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Notifications", path: "/admin/notifications", icon: Bell, badge: unreadNotifCount },
        { label: "Company", path: "/admin/company", icon: Building2 },
        { label: "Users", path: "/admin/users", icon: GraduationCap },
        { label: "Opportunities", path: "/admin/opportunities", icon: Briefcase },
        { label: "Applications", path: "/admin/applications", icon: FileSpreadsheet },
        { label: "Reports", path: "/admin/reports", icon: BarChart3 },
        { label: "Settings", path: "/admin/settings", icon: Settings },
      ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <BrandLogo markOnly className="h-8 w-9 sm:hidden" />
            <BrandLogo className="hidden h-8 w-44 sm:block" />
            <div className="flex flex-col border-l border-slate-200 pl-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                    isSuperAdmin
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isSuperAdmin ? "Super Admin" : "Company Admin"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block">
                {isSuperAdmin ? "Global Platform Center" : user?.company?.name || "Assigned Company Workspace"}
              </p>
            </div>
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Action */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Synchronize Database Metrics"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          )}

          {/* Notifications Dropdown */}
          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
              aria-label="Admin notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Admin Action Alerts</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {unreadNotifCount} pending
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-emerald-500" />
                      All platform reviews are caught up.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-slate-50 transition text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={profileContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {user?.fullName ? user.fullName[0].toUpperCase() : "A"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.fullName || "Administrator"}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-none">Platform Admin</p>
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 p-1.5">
                <div className="p-2.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.fullName || "Admin"}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Platform Settings
                </Link>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Shell: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* FL-10: Fixed Desktop Sidebar */}
        <aside className="hidden lg:flex lg:fixed lg:top-16 lg:left-0 lg:bottom-0 lg:w-60 bg-white border-r border-slate-200/90 flex-col justify-between p-4 z-30 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isHighlighted = location.pathname === item.path;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isHighlighted
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isHighlighted ? "text-indigo-400" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 ? (
                    <NavBadge count={item.badge} active={isHighlighted} />
                  ) : isHighlighted && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Real-time Synced
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Direct telemetry from E2Job MongoDB cluster.
            </p>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 bg-white h-full shadow-2xl p-4 flex flex-col justify-between z-10">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BrandLogo className="h-7 w-36" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isHighlighted = location.pathname === item.path;

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        isHighlighted
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isHighlighted ? "text-indigo-400" : "text-slate-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge > 0 ? (
                        <NavBadge count={item.badge} active={isHighlighted} />
                      ) : isHighlighted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace (offset by fixed sidebar on desktop) */}
        <main className="flex-1 lg:pl-60 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
export default AdminLayout;
