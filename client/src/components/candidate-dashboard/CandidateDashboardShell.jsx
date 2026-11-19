import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CandidateSidebar from "./CandidateSidebar";
import CandidateTopBar from "./CandidateTopBar";
import { CANDIDATE_TYPES } from "./candidateNav";

/**
 * The one dashboard layout for students, freshers and professionals (H22): sidebar, top bar
 * and the main area. Each dashboard page renders only its own tab content and cards inside.
 *
 * @param {"student"|"fresher"|"professional"} type
 * @param {string} activeTab
 * @param {(tab: string) => void} [onSelectTab] - without it (a page outside the dashboard),
 *   choosing a tab opens the dashboard on that tab
 * @param {React.ReactNode} [topBarContent] - page-specific top bar area (search, filters)
 * @param {string} [topBarSubtitle] - under the name in the top bar
 * @param {React.ReactNode} [overlays] - modals and toasts, rendered outside the main area
 * @param {string} [mainClassName] - width and spacing of the main area
 */
const CandidateDashboardShell = ({
  type,
  user,
  activeTab,
  onSelectTab,
  onLogout,
  unreadNotifications = 0,
  topBarContent,
  topBarSubtitle,
  overlays,
  mainClassName = "max-w-7xl space-y-6",
  children,
}) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const selectTab = onSelectTab || ((tab) => navigate(`${CANDIDATE_TYPES[type].homePath}?tab=${encodeURIComponent(tab)}`));

  // On phones the menu button opens the sidebar; on desktop it collapses it.
  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setMobileOpen(true);
    else setCollapsed((value) => !value);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans">
      <CandidateSidebar
        type={type}
        activeTab={activeTab}
        onSelectTab={selectTab}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        unreadNotifications={unreadNotifications}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <CandidateTopBar
          type={type}
          user={user}
          subtitle={topBarSubtitle}
          onMenuClick={handleMenuClick}
          onSelectTab={selectTab}
          onLogout={onLogout}
        >
          {topBarContent}
        </CandidateTopBar>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 w-full mx-auto ${mainClassName}`}>{children}</main>
      </div>

      {overlays}
    </div>
  );
};

export default CandidateDashboardShell;
