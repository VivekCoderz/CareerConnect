import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useCampus } from "../useCampus";

const NAV = {
  student: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/classes", label: "Classes" },
    { to: "/profile", label: "Profile" },
  ],
  manager: [{ to: "/manager", label: "University dashboard" }],
  staff: [
    { to: "/ops/students", label: "Students" },
    { to: "/ops/review", label: "Review" },
    { to: "/ops/classes", label: "Classes" },
    { to: "/manager", label: "University view" },
  ],
};

// The university logo already carries its name, so the name text only shows without a logo.
export const BrandMark = ({ institution, compact = false }) => {
  const [logoOk, setLogoOk] = useState(true);
  const showLogo = Boolean(institution?.logoUrl) && logoOk;
  return (
    <span className="flex items-center gap-3">
      {showLogo && (
        <img src={institution.logoUrl} alt={institution.name} className={compact ? "h-9 w-auto sm:h-10" : "h-11 w-auto sm:h-14"} onError={() => setLogoOk(false)} />
      )}
      <span className="leading-tight">
        {!showLogo && <span className="block text-sm font-bold text-slate-900 sm:text-base">{institution?.name}</span>}
        <span className={`block text-xs text-slate-500 ${showLogo ? "hidden border-l border-slate-200 pl-3 sm:block" : ""}`}>Assessment Portal</span>
      </span>
    </span>
  );
};

// White-label: the portal shows only the university's name (no vendor branding anywhere).
export const Footer = () => {
  const { institution } = useCampus();
  return (
    <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
      © {new Date().getFullYear()} {institution?.name}
      {" · "}
      <Link to="/privacy" className="hover:underline">Privacy</Link>
    </footer>
  );
};

const Layout = ({ children, wide = false }) => {
  const { institution, member, staff, signOut } = useCampus();
  const role = staff ? "staff" : member?.role;
  const links = NAV[role] || [];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-3 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
          <Link to={role === "staff" ? "/ops/students" : role === "manager" ? "/manager" : "/dashboard"}>
            <BrandMark institution={institution} compact />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <nav className="hidden gap-1 sm:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <button type="button" onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" title="Sign out">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        {links.length > 0 && (
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className={`mx-auto px-4 py-6 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
