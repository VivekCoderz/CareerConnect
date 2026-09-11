import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/features/authSlice";
import { searchAdminData, getAdminNotifications, adminLogout } from "../../services/adminService";
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  Briefcase,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const notifContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchAdminData(searchQuery);
        if (res?.success) {
          setSearchResults(res.results);
          setSearchDropdownOpen(true);
        }
      } catch (err) {
        console.error("Admin search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
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

  // EXACT TEAM 3 SPECIFICATION: ONLY 7 ITEMS IN SIDEBAR
  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Students", path: "/admin/students", icon: GraduationCap },
    { label: "Employers", path: "/admin/employers", icon: Building2 },
    { label: "Opportunities", path: "/admin/opportunities", icon: Briefcase },
    { label: "Applications", path: "/admin/applications", icon: FileSpreadsheet },
    { label: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const totalResultsCount = searchResults
    ? Object.values(searchResults).reduce((acc, curr) => acc + (curr?.length || 0), 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 tracking-tight">CareerConnect</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Platform Command Center</p>
            </div>
          </Link>
        </div>

        {/* Center: Global Search */}
        <div ref={searchContainerRef} className="relative hidden md:block w-72 lg:w-96">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults) setSearchDropdownOpen(true);
              }}
              placeholder="Search users, jobs, employers, interviews..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchDropdownOpen && searchResults && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Search Results</span>
                <span className="text-[11px] font-normal text-slate-400">{totalResultsCount} found</span>
              </div>

              {totalResultsCount === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching platform records found for "{searchQuery}"
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {Object.entries(searchResults).map(([category, items]) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category} className="p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                          {category} ({items.length})
                        </p>
                        <div className="space-y-0.5">
                          {items.map((item) => (
                            <Link
                              key={item.id}
                              to={item.link || "#"}
                              onClick={() => setSearchDropdownOpen(false)}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition text-xs group"
                            >
                              <div className="truncate pr-2">
                                <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate">
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                              </div>
                              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {item.badge}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          )}

          {/* Notifications Dropdown */}
          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
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
                            {new Date(notif.timestamp).toLocaleDateString()}
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
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition"
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
        {/* Sidebar for Desktop */}
        <aside className="hidden lg:flex w-60 bg-white border-r border-slate-200/90 flex-col justify-between p-4">
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
                  {isHighlighted && (
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
              Direct telemetry from CareerConnect MongoDB cluster.
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
                  <span className="text-xs font-bold text-slate-900">CareerConnect Admin</span>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
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
                      {isHighlighted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
