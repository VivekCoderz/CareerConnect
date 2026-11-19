import { useEffect } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import UnreadBadge from "../notifications/UnreadBadge";
import { CANDIDATE_TYPES, SETTINGS_ICON, navItemsFor } from "./candidateNav";

const NavIcon = ({ d, className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {(Array.isArray(d) ? d : [d]).map((path) => (
      <path key={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={path} />
    ))}
  </svg>
);

/** The left menu of every candidate dashboard; the items come from candidateNav.js. */
const CandidateSidebar = ({
  type,
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  onLogout,
  collapsed = false,
  onToggleCollapse,
  unreadNotifications = 0,
}) => {
  const config = CANDIDATE_TYPES[type];
  const { theme, settings } = config;

  // No page scrolling behind the open menu on phones.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const selectTab = (id) => {
    onSelectTab(id);
    onCloseMobile();
  };
  const spacing = collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5";

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-fade-in"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } w-64 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand, collapse (desktop) and close (phone) */}
          <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button onClick={() => selectTab("dashboard")} className="flex items-center gap-2.5 overflow-hidden text-left">
              <BrandLogo markOnly className="w-9 h-9 shrink-0" />
              {!collapsed && (
                <div className="transition-opacity duration-200 whitespace-nowrap">
                  <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">E2Job</span>
                  <span className={`block text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${theme.hubText}`}>
                    {config.hubLabel}
                  </span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`hidden lg:flex w-7 h-7 rounded-lg border border-slate-200 text-slate-500 items-center justify-center transition shadow-sm ${theme.buttonHover}`}
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

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

          {/* Menu */}
          <nav className="py-4 px-2.5 space-y-0.5 overflow-y-auto flex-1 scrollbar-thin">
            {navItemsFor(type).map((item) => {
              if (item.link) {
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${spacing} rounded-xl text-sm font-medium transition group ${theme.navIdle}`}
                  >
                    <NavIcon d={item.icon} className={`w-5 h-5 text-slate-400 shrink-0 ${theme.linkIconHover}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              }
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative w-full flex items-center ${spacing} rounded-xl text-sm font-medium transition text-left ${
                    isActive ? theme.navActive : theme.navIdle
                  }`}
                >
                  <NavIcon d={item.icon} className={`w-5 h-5 shrink-0 transition ${isActive ? "text-white" : "text-slate-400"}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {item.id === "notifications" && (
                    <UnreadBadge count={unreadNotifications} collapsed={collapsed} active={isActive} />
                  )}
                </button>
              );
            })}

            {settings && (
              <>
                <div className="pt-2 pb-1">
                  <div className="h-px bg-slate-100" />
                </div>
                {settings.link ? (
                  <Link
                    to={settings.link}
                    onClick={onCloseMobile}
                    title={collapsed ? settings.label : undefined}
                    className={`flex items-center ${collapsed ? "justify-center px-2 py-2" : "gap-3 px-3.5 py-2"} rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition`}
                  >
                    <NavIcon d={SETTINGS_ICON} className="w-4 h-4 text-slate-400 shrink-0" />
                    {!collapsed && <span>{settings.label}</span>}
                  </Link>
                ) : (
                  <button
                    onClick={() => selectTab(settings.tab)}
                    title={collapsed ? settings.label : undefined}
                    className={`w-full flex items-center ${collapsed ? "justify-center px-2 py-2" : "gap-3 px-3.5 py-2"} rounded-xl text-xs font-medium transition text-left ${
                      activeTab === settings.tab ? theme.navActive : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <NavIcon d={SETTINGS_ICON} className="w-4 h-4 shrink-0 text-inherit" />
                    {!collapsed && <span>{settings.label}</span>}
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${spacing} rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition text-left`}
          >
            <NavIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-5 h-5 text-red-500 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default CandidateSidebar;
