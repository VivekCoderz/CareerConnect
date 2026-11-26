import { useState } from "react";
import { Link } from "react-router-dom";
import ProgramsShell from "../../components/programs/ProgramsShell";
import useSeo from "../../hooks/useSeo";
import { LEVELS, PROGRAMS, TRACKS } from "./programList";

// What every programme includes (Ram Mohan sir's delivery framework). Certification and
// placement wording stay off until C02 and C03 settle them.
const INCLUDES = ["Live, expert-led sessions", "2+ hands-on projects", "A personal mentor", "Internship exposure"];

const chipClass = (active) =>
  `min-h-[40px] px-4 rounded-full text-sm font-bold border transition ${
    active
      ? "bg-[#1e3a8a] border-[#1e3a8a] text-white"
      : "bg-white border-[#e6ebf5] text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]"
  }`;

// C12: the programmes list page, in the home page's design.
export default function ProgramsPage() {
  const [track, setTrack] = useState("");
  const shown = track ? PROGRAMS.filter((p) => p.track === track) : PROGRAMS;

  useSeo({
    title: "Career Accelerator Programmes",
    description:
      "Industry-ready programmes in AI, data analytics, full stack development, cybersecurity and cloud. Live classes, hands-on projects and a personal mentor. 8–16 weeks.",
    path: "/programs",
  });

  return (
    <ProgramsShell>
        {/* Campaign banner */}
        <section className="relative overflow-hidden">
          <div className="e2h-mesh e2h-m1" aria-hidden="true" />
          <div className="e2h-mesh e2h-m2" aria-hidden="true" />
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-10 lg:pt-16 flex flex-col gap-5">
            <span className="self-start text-[13px] font-extrabold text-amber-700 tracking-[.1em] uppercase">
              Career Accelerator Programmes
            </span>
            <h1 className="e2h-display m-0 text-[34px] sm:text-[46px] lg:text-[54px] leading-[1.08] tracking-[-0.035em] font-bold text-[#0f1f4d] max-w-3xl">
              Don't just earn a degree. Build a career.
            </h1>
            <p className="m-0 text-lg text-slate-600 max-w-2xl">
              Become industry-ready in 8–16 weeks. Learn. Build. Get Industry-Ready.
            </p>
            <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
              {INCLUDES.map((item) => (
                <li key={item} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 lg:pb-24 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by track">
            <button type="button" className={chipClass(!track)} aria-pressed={!track} onClick={() => setTrack("")}>
              All programmes
            </button>
            {TRACKS.map((t) => (
              <button key={t.id} type="button" className={chipClass(track === t.id)} aria-pressed={track === t.id} onClick={() => setTrack(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <p className="m-0 text-sm text-slate-500" aria-live="polite">
            {shown.length} {shown.length === 1 ? "programme" : "programmes"}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((p) => (
              <article key={p.slug} className="e2h-feature rounded-[24px] p-6 bg-white border border-[#e6ebf5] flex flex-col gap-4">
                <div className="flex flex-wrap gap-2 text-[12px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-[#eef3ff] text-[#1e3a8a]">{p.duration}</span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Live classes</span>
                </div>
                <h2 className="e2h-display m-0 text-xl font-bold text-slate-900">{p.title}</h2>
                <p className="m-0 text-[13px] text-slate-500">
                  <span className="font-semibold text-slate-700">Levels:</span> {LEVELS.join(" · ")}
                </p>
                <div>
                  <p className="m-0 mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Key tools</p>
                  <ul className="flex flex-wrap gap-1.5 p-0 m-0 list-none">
                    {p.tools.map((tool) => (
                      <li key={tool} className="px-2 py-1 rounded-lg bg-slate-100 text-[12px] font-semibold text-slate-700">
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={`/programs/${p.slug}`}
                  className="mt-auto inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-[#1e3a8a] text-sm font-bold text-white hover:bg-[#0f1f4d]"
                  aria-label={`View details: ${p.title}`}
                >
                  View details →
                </Link>
              </article>
            ))}
          </div>
        </section>
    </ProgramsShell>
  );
}
