import { useEffect } from "react";
import { Link } from "react-router-dom";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "jobs", label: "Find Jobs", link: "/jobs", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "internships", label: "Internships", link: "/internships", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "growth", label: "Career Growth", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { id: "skills", label: "Skills", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { id: "courses", label: "Courses", link: "/courses", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "resume", label: "Resume", link: "/resume-builder", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "applications", label: "Applications", link: "/applications", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { id: "profile", label: "My Profile", link: "/professional/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const ProfessionalSidebar = ({
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
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity animate-fade-in"
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
        <div>
          <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-100">
            <Link to="/professional/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/20 text-base shrink-0">
                GU
              </div>
              {!collapsed && (
                <div className="transition-opacity duration-200 whitespace-nowrap">
                  <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                    CareerConnect
                  </span>
                  <span className="block text-[10px] font-semibold text-purple-600 tracking-wider uppercase mt-0.5">
                    Professional Hub
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse/Expand Toggle Button ("Andar-Bahar") */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 items-center justify-center transition shadow-2xs"
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
          <div className="py-4 px-2.5 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">
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
                    } rounded-xl text-sm font-medium transition text-slate-600 hover:bg-slate-50 hover:text-slate-900 group`}
                  >
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
            <div className="pt-3 pb-1">
              <div className="h-px bg-slate-100" />
            </div>

            {/* Secondary links */}
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
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
            } rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition text-left`}
          >
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default ProfessionalSidebar;
