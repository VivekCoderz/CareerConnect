import { useEffect } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "jobs",
    label: "Find Jobs",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    id: "internships",
    label: "Internships",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    id: "applications",
    label: "Applications",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    id: "interviews",
    label: "Interviews",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    id: "courses",
    label: "Courses",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    id: "skills",
    label: "Skills",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    id: "resume",
    label: "Resume",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: "ats-resume",
    label: "ATS Resume Lab",
    link: "/ats-resume",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    id: "projects",
    label: "Projects",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  },
  {
    id: "recommendations",
    label: "Career Advice",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    id: "profile",
    label: "My Profile",
    link: "/fresher/profile",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

const FresherSidebar = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) => {
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } w-64 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Branding & Toggle */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button
              onClick={() => { onSelectTab("dashboard"); onCloseMobile(); }}
              className="flex items-center gap-2.5 overflow-hidden text-left"
            >
              <BrandLogo markOnly className="w-9 h-9 shrink-0" />
              {!collapsed && (
                <div className="transition-opacity duration-200 whitespace-nowrap">
                  <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                    CareerConnect
                  </span>
                  <span className="block text-[10px] font-semibold text-[#f59e0b] tracking-wider uppercase mt-0.5">
                    Fresher Hub
                  </span>
                </div>
              )}
            </button>

            {/* Desktop Collapse/Expand Toggle */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 items-center justify-center transition shadow-sm"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav List */}
          <div className="py-4 px-2.5 space-y-0.5 overflow-y-auto flex-1 scrollbar-thin">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;

              if (item.link) {
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${
                      collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
                    } rounded-xl text-sm font-medium transition text-slate-600 hover:bg-blue-50 hover:text-[#1e3a8a] group`}
                  >
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a8a] shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={item.icon} />
                    </svg>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
                  } rounded-xl text-sm font-medium transition text-left ${
                    isActive
                      ? "bg-[#1e3a8a] text-white font-semibold shadow-sm shadow-blue-900/20"
                      : "text-slate-600 hover:bg-blue-50 hover:text-[#1e3a8a]"
                  }`}
                >
                  <svg
                    className={`w-5 h-5 shrink-0 transition ${isActive ? "text-white" : "text-slate-400"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={item.icon} />
                  </svg>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}

            {/* Divider */}
            <div className="pt-2 pb-1">
              <div className="h-px bg-slate-100" />
            </div>

            {/* Settings */}
            <Link
              to="/settings"
              onClick={onCloseMobile}
              title={collapsed ? "Settings" : undefined}
              className={`flex items-center ${
                collapsed ? "justify-center px-2 py-2" : "gap-3 px-3.5 py-2"
              } rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition`}
            >
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!collapsed && <span>Settings</span>}
            </Link>

            <Link
              to="/help"
              onClick={onCloseMobile}
              title={collapsed ? "Help & Support" : undefined}
              className={`flex items-center ${
                collapsed ? "justify-center px-2 py-2" : "gap-3 px-3.5 py-2"
              } rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition`}
            >
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!collapsed && <span>Help & Support</span>}
            </Link>
          </div>
        </div>

        {/* Bottom Sign Out */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition text-left`}
          >
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default FresherSidebar;
