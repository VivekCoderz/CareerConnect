import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CANDIDATE_TYPES } from "./candidateNav";

const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * The top bar of every candidate dashboard: menu button, an optional page-specific area
 * (`children`, such as the student search) and the account menu.
 * @param {string} [subtitle] - under the name; defaults to the candidate type ("Fresher")
 */
const CandidateTopBar = ({ type, user, subtitle, onMenuClick, onSelectTab, onLogout, children }) => {
  const config = CANDIDATE_TYPES[type];
  const { theme, settings } = config;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const name = user?.fullName || config.label;
  const menuItem = `flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left ${theme.menuHover}`;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className={`p-2.5 -ml-1.5 rounded-xl text-slate-600 active:bg-slate-200 transition cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px] shrink-0 ${theme.buttonHover}`}
          aria-label="Toggle navigation menu"
          title="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-4">{children}</div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt={name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
            ) : (
              <div className={`w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs ${theme.avatar}`}>
                {initialsOf(name)}
              </div>
            )}
            <div className="hidden md:block text-left">
              <span className="block text-xs font-bold text-slate-900 leading-tight">{name}</span>
              <span className={`block text-[10px] font-semibold truncate max-w-[140px] ${subtitle ? "text-slate-500" : theme.typeText}`}>
                {subtitle || config.label}
              </span>
            </div>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50" role="menu">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1 space-y-0.5">
                <Link to={config.profilePath} onClick={() => setMenuOpen(false)} className={menuItem}>
                  View & Edit Profile
                </Link>
                {settings?.tab && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectTab(settings.tab);
                    }}
                    className={menuItem}
                  >
                    {settings.menuLabel || settings.label}
                  </button>
                )}
                <Link to="/account" onClick={() => setMenuOpen(false)} className={menuItem}>
                  Account Settings
                </Link>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMenuOpen(false);
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
    </header>
  );
};

export default CandidateTopBar;
