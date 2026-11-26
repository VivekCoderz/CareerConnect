import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProgramsShell from "../../components/programs/ProgramsShell";
import JourneyLoader from "../../components/common/JourneyLoader";
import useSeo, { toDescription } from "../../hooks/useSeo";
import { getProgram } from "../../services/programService";
import NotFound from "../NotFound";
import { CAREER_SUPPORT, SHARED_ON_THE_CALL, WHO_ITS_FOR } from "./programFramework";
import { LEVELS, TRACKS } from "./programList";

const CARD = "rounded-[24px] p-6 sm:p-7 bg-white border border-[#e6ebf5]";
const H2 = "e2h-display m-0 text-xl sm:text-2xl font-bold text-[#0f1f4d]";

// A section with nothing in it (content not written yet, C05) is not shown at all.
const Section = ({ title, children }) => (
  <section className={CARD}>
    <h2 className={H2}>{title}</h2>
    <div className="mt-4 text-[15px] leading-relaxed text-slate-700">{children}</div>
  </section>
);

const Bullets = ({ items }) => (
  <ul className="m-0 pl-5 list-disc space-y-1.5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const scrollToEnquiry = () =>
  document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth", block: "start" });

const EnquireButton = ({ className = "" }) => (
  <button
    type="button"
    onClick={scrollToEnquiry}
    className={`inline-flex items-center justify-center min-h-[48px] px-7 rounded-[14px] bg-amber-500 text-[#1c1300] text-base font-bold hover:bg-amber-400 ${className}`}
  >
    Enquire now
  </button>
);

// C13: one career programme, read from GET /api/programs/:slug (C09). Fees, trainer and
// timings are never shown: the team shares them on the call after an enquiry.
export default function ProgramDetailPage() {
  const { slug } = useParams();
  // The answer for one slug; until it matches the current slug, the page is loading.
  const [result, setResult] = useState({ slug: null, program: null, status: "loading" });
  const [heroOut, setHeroOut] = useState(false);
  const heroRef = useRef(null);
  const state = result.slug === slug ? result.status : "loading"; // loading | ready | missing | error
  const program = state === "ready" ? result.program : null;

  useEffect(() => {
    let active = true;
    getProgram(slug)
      .then((data) => {
        if (active) setResult({ slug, program: data, status: data ? "ready" : "missing" });
      })
      .catch((err) => {
        if (active) setResult({ slug, program: null, status: err.response?.status === 404 ? "missing" : "error" });
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // The sticky "Enquire now" bar shows once the hero's button has scrolled away (always on phones).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setHeroOut(!entry.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
  }, [state]);

  useSeo({
    title: program?.title,
    description: toDescription(
      program?.summary ||
        `${program?.title}: a ${program?.duration} career programme from E2Job with live classes, hands-on projects and a personal mentor. Enquire and our team will call you.`
    ),
    path: `/programs/${slug}`,
    enabled: state === "ready",
  });

  if (state === "missing") return <NotFound />;

  if (state !== "ready") {
    return (
      <ProgramsShell>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 flex flex-col items-center gap-4 text-center">
          {state === "loading" ? (
            <JourneyLoader variant="access" size="hero" />
          ) : (
            <>
              <p className="m-0 text-lg font-semibold text-slate-800">We couldn't load this programme.</p>
              <button type="button" onClick={() => window.location.reload()} className="min-h-[44px] px-5 rounded-xl bg-[#1e3a8a] text-white text-sm font-bold">
                Try again
              </button>
            </>
          )}
        </div>
      </ProgramsShell>
    );
  }

  const track = TRACKS.find((t) => t.id === program.track);
  const outcomes = program.outcomes || [];
  const syllabus = program.syllabus || [];
  const projects = program.projects || [];
  const faq = program.faq || [];

  return (
    <ProgramsShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="e2h-mesh e2h-m1" aria-hidden="true" />
        <div className="e2h-mesh e2h-m2" aria-hidden="true" />
        <div ref={heroRef} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10 lg:pt-12 flex flex-col gap-5">
          <Link to="/programs" className="self-start text-sm font-semibold text-[#1e3a8a] hover:underline">
            ← All programmes
          </Link>
          <span className="self-start text-[13px] font-extrabold text-amber-700 tracking-[.1em] uppercase">
            {track ? track.label : "Career Accelerator Programme"}
          </span>
          <h1 className="e2h-display m-0 text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.08] tracking-[-0.035em] font-bold text-[#0f1f4d] max-w-3xl">
            {program.title}
          </h1>
          {program.summary && <p className="m-0 text-lg text-slate-600 max-w-2xl">{program.summary}</p>}
          <ul className="flex flex-wrap gap-2 p-0 m-0 list-none text-[13px] font-bold">
            <li className="px-3 py-1.5 rounded-full bg-[#eef3ff] text-[#1e3a8a]">{program.duration}</li>
            <li className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">Live classes</li>
            <li className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">Levels: {LEVELS.join(" · ")}</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <EnquireButton />
            <span className="text-sm text-slate-500">{SHARED_ON_THE_CALL}</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-28 sm:pb-20 grid gap-5">
        {outcomes.length > 0 && (
          <Section title="What you'll learn">
            <Bullets items={outcomes} />
          </Section>
        )}

        {syllabus.length > 0 && (
          <Section title="Syllabus">
            <div className="flex flex-col gap-2">
              {syllabus.map((module, index) => (
                <details key={module.title} open={index === 0} className="group rounded-2xl border border-[#e6ebf5] px-4 py-3">
                  <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between gap-3">
                    {module.title}
                    <span className="text-slate-400 group-open:rotate-180 transition" aria-hidden="true">⌄</span>
                  </summary>
                  {module.topics?.length > 0 && (
                    <div className="mt-3">
                      <Bullets items={module.topics} />
                    </div>
                  )}
                </details>
              ))}
            </div>
          </Section>
        )}

        {program.tools?.length > 0 && (
          <Section title="Tools you'll use">
            <ul className="flex flex-wrap gap-2 p-0 m-0 list-none">
              {program.tools.map((tool) => (
                <li key={tool} className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                  {tool}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {projects.length > 0 && (
          <Section title="Projects you'll build">
            <Bullets items={projects} />
          </Section>
        )}

        {program.mentorship && (
          <Section title="Mentorship">
            <p className="m-0">{program.mentorship}</p>
          </Section>
        )}

        {program.internship && (
          <Section title="Internship exposure">
            <p className="m-0">{program.internship}</p>
          </Section>
        )}

        <Section title="Portfolio and career support">
          <Bullets items={CAREER_SUPPORT} />
        </Section>

        {program.certificate && (
          <Section title="Certificate">
            <p className="m-0">{program.certificate}</p>
            {program.certificateImage && (
              <img
                src={program.certificateImage}
                alt={`Sample certificate for ${program.title}`}
                className="mt-4 w-full max-w-xl rounded-xl border border-[#e6ebf5]"
                loading="lazy"
              />
            )}
          </Section>
        )}

        <Section title="Who it's for">
          <p className="m-0">{WHO_ITS_FOR}</p>
        </Section>

        {faq.length > 0 && (
          <Section title="Frequently asked questions">
            <div className="flex flex-col gap-2">
              {faq.map((item) => (
                <details key={item.question} className="rounded-2xl border border-[#e6ebf5] px-4 py-3">
                  <summary className="cursor-pointer font-semibold text-slate-900">{item.question}</summary>
                  <p className="m-0 mt-2">{item.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

        {/* C14 puts the enquiry form here. */}
        <section id="enquire" className="scroll-mt-20 rounded-[28px] bg-[#0f1f4d] text-white px-6 py-10 sm:px-10 flex flex-col gap-3">
          <h2 className="e2h-display m-0 text-2xl sm:text-3xl font-bold">Interested in {program.title}?</h2>
          <p className="m-0 text-indigo-200">{SHARED_ON_THE_CALL}</p>
          <Link to="/contact" className="self-start inline-flex items-center min-h-[48px] px-6 rounded-[14px] bg-amber-500 text-[#1c1300] font-bold hover:bg-amber-400">
            Contact our team
          </Link>
        </section>
      </div>

      {/* Sticky enquiry bar: always on phones, on wider screens once the hero has scrolled away */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-[#e6ebf5] bg-white/95 backdrop-blur-md shadow-[0_-10px_30px_-20px_rgba(15,31,77,.5)] ${heroOut ? "sm:block" : "sm:hidden"}`}
        data-testid="sticky-enquire"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-bold text-slate-900 truncate">{program.title}</p>
            <p className="m-0 text-xs text-slate-500">{program.duration} · Live classes</p>
          </div>
          <EnquireButton className="shrink-0" />
        </div>
      </div>
    </ProgramsShell>
  );
}
