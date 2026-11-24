import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

/** Shared shell for the public career programme pages (C13). */
export default function ProgramsLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/home" aria-label="E2Job home">
            <BrandLogo className="h-9 w-40 sm:w-44" />
          </Link>
          <nav className="flex items-center gap-4 text-xs font-bold text-[#1e3a8a]">
            <Link to="/programs" className="hover:underline">
              Programmes
            </Link>
            <Link to="/jobs" className="hover:underline">
              Browse jobs
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} E2Job</span>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:underline">Terms of Use</Link>
          <Link to="/contact" className="hover:underline">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
