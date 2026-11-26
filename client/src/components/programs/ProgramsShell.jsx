import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import "../../pages/home/home.css";

const NAV_LINK = "hidden sm:inline-flex items-center h-10 px-3 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0f1f4d]";

/** Header and footer of the career programme pages (C12, C13), in the new home page's design. */
export default function ProgramsShell({ children }) {
  return (
    <div className="e2h-root min-h-screen bg-[#fbfcff] text-slate-900 flex flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e6ebf5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" aria-label="E2Job home" className="shrink-0">
            <BrandLogo className="h-8 w-32 sm:w-36" />
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Main">
            <Link to="/programs" className={NAV_LINK}>Programmes</Link>
            <Link to="/jobs" className={NAV_LINK}>Jobs</Link>
            <Link to="/internships" className={NAV_LINK}>Internships</Link>
            <Link to="/login" className="inline-flex items-center h-10 px-4 rounded-xl text-sm font-semibold text-[#0f1f4d] hover:bg-slate-100">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#121b2b] text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="m-0">© {new Date().getFullYear()} E2Job. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/privacy" className="hover:text-slate-200">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-200">Terms & Conditions</Link>
            <Link to="/contact" className="hover:text-slate-200">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
