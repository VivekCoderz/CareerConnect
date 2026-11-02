import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { LEGAL, isLegalComplete } from "../../config/legal";

const PAGES = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/contact", label: "Contact" },
];

/** A value from config/legal.js, or a highlighted "[label]" marker while it is still empty. */
export const Fill = ({ value, label }) =>
  value !== null && value !== undefined && value !== "" ? (
    <>{value}</>
  ) : (
    <mark className="bg-amber-100 text-amber-900 px-1 rounded">[{label}]</mark>
  );

/** An email from config/legal.js as a mailto link, or a marker while it is still empty. */
export const Email = ({ value, label }) =>
  value ? (
    <a href={`mailto:${value}`} className="text-blue-700 font-semibold hover:underline break-all">
      {value}
    </a>
  ) : (
    <Fill value={value} label={label} />
  );

export const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">{children}</div>
  </section>
);

export const List = ({ children }) => <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;

/**
 * Shared shell for the public legal pages: header, title with last-updated date and
 * version, a draft banner while config/legal.js still has empty values, and links
 * between the three pages.
 */
export default function LegalLayout({ title, intro, children }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      <title>{`${title} | E2Job`}</title>

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/home" aria-label="E2Job home">
            <BrandLogo className="h-9 w-40 sm:w-44" />
          </Link>
          <Link to="/jobs" className="text-xs font-bold text-[#1e3a8a] hover:underline shrink-0">
            Browse jobs →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {!isLegalComplete && (
          <div role="note" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <strong>Draft.</strong> Highlighted details are still being finalised and will be filled in before launch.
          </div>
        )}

        <article className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-10 space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-500">
              Last updated: <Fill value={LEGAL.lastUpdated} label="date of publishing" /> ·{" "}
              <span className="whitespace-nowrap">Version {LEGAL.version}</span>
            </p>
            {intro && <div className="text-sm text-slate-700 leading-relaxed space-y-3 pt-2">{intro}</div>}
          </div>
          {children}
        </article>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <nav className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
          {PAGES.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              className={({ isActive }) => (isActive ? "text-[#1e3a8a]" : "hover:text-slate-800")}
            >
              {page.label}
            </NavLink>
          ))}
          <span className="sm:ml-auto">© {new Date().getFullYear()} E2Job</span>
        </nav>
      </footer>
    </div>
  );
}
