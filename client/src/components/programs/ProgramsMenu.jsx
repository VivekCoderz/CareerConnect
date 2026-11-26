import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FEATURES } from "../../config/features";
import { PROGRAMS } from "../../pages/programs/programList";

// C06: the "Courses" dropdown that lists the career programmes, for the public and
// logged-in navbars. Renders nothing while the programmes flag is off. The campus portal
// has its own app and never mounts it.
// buttonClassName restyles the trigger to match the navbar it sits in.
const DEFAULT_BUTTON =
  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/40 transition shadow-2xs";

export default function ProgramsMenu({ buttonClassName, label = "Courses" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!FEATURES.programs) return null;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName || DEFAULT_BUTTON}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>{label}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-[min(440px,92vw)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-3">
          <p className="px-3 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-amber-700">Career Accelerator Programmes</p>
          <ul className="m-0 p-0 list-none flex flex-col">
            {PROGRAMS.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/programs/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 no-underline"
                >
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-900">{p.title}</span>
                    <span className="text-xs text-slate-500 truncate">{p.tools.slice(0, 4).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-[#1e3a8a]">{p.duration}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/programs"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-[#1e3a8a] hover:bg-indigo-50 no-underline"
          >
            View all programmes <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
