import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import InternshipDiscoveryMenu from "../components/internships/InternshipDiscoveryMenu";
import JobDiscoveryMenu from "../components/jobs/JobDiscoveryMenu";
import ProgramsMenu from "../components/programs/ProgramsMenu";
import { getDashboardPath } from "../utils/dashboardRedirect";
import internshipService from "../services/internshipService";
import jobService from "../services/jobService";
import BrandLogo from "../components/common/BrandLogo";
import { opportunityLink } from "../utils/opportunityApply";
import { FEATURES } from "../config/features";
import useSeo from "../hooks/useSeo";
import { needsOnboarding } from "../utils/userRoles";
import { FEATURES_LIST, STEPS } from "./home/homeContent";
import "./home/home.css";

// The public home page (design option D, "premium light"). Signed-in people never see it:
// they go straight to their dashboard or onboarding.

// Navbar items: plain text, underlined on hover; the discovery menus take this look via buttonClassName.
const NAV_LINK = "e2h-navlink inline-flex items-center h-10 px-3 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0f1f4d] transition";
const NAV_MENU_BUTTON = "flex items-center gap-1 h-10 px-3 rounded-lg text-sm font-medium text-slate-600 hover:text-[#0f1f4d] hover:bg-slate-100/70 transition";

const LOGO_TINTS = [
  "bg-indigo-50 text-[#1e3a8a]",
  "bg-amber-100 text-amber-800",
  "bg-green-100 text-green-800",
  "bg-sky-100 text-sky-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-rose-100 text-rose-800",
];

const initialsOf = (title = "") =>
  title
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "E2";

const companyOf = (item) => item.company?.name || item.companyName || (typeof item.company === "string" ? item.company : "");

const payOf = (item) =>
  item.salary ||
  (item.stipend?.amount ? `₹${item.stipend.amount}/month` : typeof item.stipend === "string" ? item.stipend : "");

const Icon = ({ d, className = "w-5 h-5", strokeWidth = 2.2 }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} pathLength="100" />
  </svg>
);

/** One listing on the live board; links to its page, or to the employer's site for external listings. */
const BoardCard = ({ item, type, tint }) => {
  const link = opportunityLink(item, type);
  const company = companyOf(item);
  const place = item.location || item.workMode || "";
  const body = (
    <>
      <span className="flex gap-2.5 items-center">
        <span className={`w-10 h-10 shrink-0 rounded-[11px] flex items-center justify-center font-extrabold text-[13px] ${tint}`}>
          {initialsOf(item.title)}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-bold text-sm text-slate-900 truncate">{item.title}</span>
          <span className="text-xs text-slate-600 truncate">{[company, place].filter(Boolean).join(" · ")}</span>
        </span>
      </span>
      <span className="flex gap-1.5 flex-wrap">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">{type}</span>
        {payOf(item) && <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-green-100 text-green-800">{payOf(item)}</span>}
      </span>
    </>
  );
  const className = "rounded-[18px] bg-white border border-[#e6ebf5] p-4 flex flex-col gap-3 no-underline transition hover:scale-[1.03] hover:shadow-[0_24px_40px_-22px_rgba(15,31,77,.45)]";
  if (link?.to) return <Link to={link.to} className={className}>{body}</Link>;
  if (link?.href) return <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>;
  return <div className={className}>{body}</div>;
};

const Home = () => {
  const navigate = useNavigate();
  useSeo({ path: "/" });
  const { user, isInitialized } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isInitialized && user) {
      if (user.hasPassword === false) {
        navigate("/set-password", { replace: true });
      } else if (needsOnboarding(user)) {
        navigate(user.role === "employer" ? "/onboarding/employer" : "/onboarding/profile", { replace: true });
      } else {
        navigate(getDashboardPath(user.userType || user.role, user), { replace: true });
      }
    }
  }, [user, isInitialized, navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("job");
  const [internships, setInternships] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // The navbar gets its frosted background once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The 3D card eases toward the cursor and sways on its own otherwise, so it always reads as 3D.
  // One animation-frame loop writes CSS variables to the element (no re-render). Reduced motion
  // keeps the static tilt from home.css.
  const sceneRef = useRef(null);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const target = { x: 0, y: 0 };
    const current = { x: -0.4, y: 0.2 };
    let pointing = false;
    let frame = 0;
    const startedAt = performance.now();

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      const rect = scene.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
      pointing = true;
    };
    const onLeave = () => {
      pointing = false;
    };
    const tick = (now) => {
      if (!pointing) {
        const t = (now - startedAt) / 1000;
        target.x = Math.sin(t * 0.55) * 0.5 - 0.15;
        target.y = Math.cos(t * 0.4) * 0.3 + 0.1;
      }
      current.x += (target.x - current.x) * 0.075;
      current.y += (target.y - current.y) * 0.075;
      scene.style.setProperty("--tx", current.x.toFixed(4));
      scene.style.setProperty("--ty", current.y.toFixed(4));
      scene.style.setProperty("--gx", `${((current.x + 1) * 50).toFixed(2)}%`);
      scene.style.setProperty("--gy", `${((current.y + 1) * 50).toFixed(2)}%`);
      frame = requestAnimationFrame(tick);
    };

    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
    };
  }, [isInitialized, user]);

  // Only real listings from the API; with none, the board shows a link to browse instead.
  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [intRes, jobRes] = await Promise.all([
          internshipService.getInternships({ limit: 8, sort: "latest" }).catch(() => ({ internships: [] })),
          jobService.getJobs({ limit: 8, sort: "latest" }).catch(() => ({ jobs: [] })),
        ]);
        if (intRes?.success && Array.isArray(intRes.internships || intRes.data)) {
          setInternships((intRes.internships || intRes.data).slice(0, 8));
        }
        if (jobRes?.success && Array.isArray(jobRes.jobs || jobRes.data)) {
          setJobs((jobRes.jobs || jobRes.data).slice(0, 8));
        }
      } catch (err) {
        console.warn("Home data fetch error:", err.message);
      }
    };
    loadHomeData();
  }, []);

  const handleHeroSearchSubmit = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams({ type: searchType });
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    navigate(`/opportunities?${params.toString()}`);
  };

  if (!isInitialized || user) {
    return null;
  }

  // Jobs and internships interleaved, then dealt into three columns that scroll on a loop.
  const listings = [];
  for (let i = 0; i < Math.max(jobs.length, internships.length); i += 1) {
    if (jobs[i]) listings.push({ item: jobs[i], type: "Job" });
    if (internships[i]) listings.push({ item: internships[i], type: "Internship" });
  }
  const columns = [0, 1, 2].map((c) => listings.filter((_, i) => i % 3 === c));
  const tabClass = (active) =>
    `min-h-[40px] px-[18px] rounded-[10px] text-sm font-bold transition ${active ? "bg-white text-[#1e3a8a] shadow-[0_6px_14px_-8px_rgba(15,31,77,.5)]" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <div className="e2h-root min-h-screen bg-[#fbfcff] text-slate-900 flex flex-col overflow-x-clip">
      {/* ================= NAVBAR (sticky) ================= */}
      <header className={`e2h-nav sticky top-0 z-40 border-b border-transparent ${scrolled || mobileMenuOpen ? "is-scrolled backdrop-blur-md" : ""}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-6 min-w-0">
              <Link to="/" aria-label="E2Job home" className="shrink-0">
                <BrandLogo className="h-8 w-32 sm:w-36" />
              </Link>
              <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
                <JobDiscoveryMenu buttonClassName={NAV_MENU_BUTTON} />
                <InternshipDiscoveryMenu buttonClassName={NAV_MENU_BUTTON} />
                <ProgramsMenu buttonClassName={NAV_MENU_BUTTON} />
                {FEATURES.courses && <Link to="/courses" className={NAV_LINK}>Courses</Link>}
                <Link to="/organizations/request-access" className={NAV_LINK}>For Organizations</Link>
              </nav>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* The wrapper hides it below xl; NAV_LINK's own display would override `hidden`. */}
              <span className="hidden xl:block">
                <Link to="/register/employer" className={NAV_LINK}>For employers</Link>
              </span>
              <Link to="/login" className="hidden sm:inline-flex items-center h-10 px-4 rounded-xl text-sm font-semibold text-[#0f1f4d] hover:bg-slate-100 transition">Log in</Link>
              <Link to="/register/student" className="inline-flex items-center h-10 px-4 rounded-xl bg-[#1e3a8a] text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(30,58,138,.8)] hover:bg-[#0f1f4d] transition">Sign up free</Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-700 hover:bg-slate-100"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                <Icon d={mobileMenuOpen ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"} className="w-6 h-6" />
              </button>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="lg:hidden pb-3">
              <nav className="rounded-2xl bg-white border border-slate-200 shadow-xl p-2 flex flex-col" aria-label="Mobile">
                {[
                  ["/jobs", "Jobs"],
                  ["/internships", "Internships"],
                  ["/opportunities?source=campus", "Campus hiring"],
                  ...(FEATURES.programs ? [["/programs", "Courses"]] : FEATURES.courses ? [["/courses", "Courses"]] : []),
                  ["/organizations/request-access", "For Organizations"],
                  ["/register/employer", "Hire talent"],
                  ["/login", "Log in"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-xl text-[15px] font-semibold text-slate-800 hover:bg-slate-50">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pb-10 lg:pb-14 -mt-16 pt-16">
        <div className="e2h-mesh e2h-m1" aria-hidden="true" />
        <div className="e2h-mesh e2h-m2" aria-hidden="true" />
        <div className="e2h-mesh e2h-m3" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 lg:pt-14 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div className="flex flex-col gap-5">
            <span className="e2h-in self-start inline-flex gap-2 items-center py-1 pl-1 pr-3.5 rounded-full bg-white border border-slate-200 text-[13px] font-medium text-slate-700 shadow-[0_8px_20px_-16px_rgba(15,31,77,.5)]">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">₹0</span>
              Free for candidates. No employer can charge you.
            </span>
            <h1 className="e2h-in e2h-display m-0 text-[36px] sm:text-[46px] lg:text-[54px] leading-[1.08] tracking-[-0.035em] font-bold text-[#0f1f4d]" style={{ animationDelay: ".15s" }}>
              Find{" "}
              <span className="e2h-rot">
                <span>internships</span>
                <span>fresher jobs</span>
                <span>live projects</span>
              </span>
              <br />
              that fit your goals.
            </h1>
            <p className="e2h-in m-0 text-base sm:text-[17px] leading-relaxed text-slate-600 max-w-[500px]" style={{ animationDelay: ".3s" }}>
              One profile for every application. Verified employers, one-click apply, and every interview tracked in your dashboard.
            </p>

            <div className="e2h-in max-w-[560px] bg-white rounded-[18px] p-2 border border-slate-200 shadow-[0_30px_60px_-36px_rgba(15,31,77,.5)] flex flex-col gap-2" style={{ animationDelay: ".45s" }}>
              <div className="self-start flex gap-1.5 p-1 bg-slate-100 rounded-[13px]" role="tablist" aria-label="Search for">
                <button type="button" role="tab" aria-selected={searchType === "job"} className={tabClass(searchType === "job")} onClick={() => setSearchType("job")}>Jobs</button>
                <button type="button" role="tab" aria-selected={searchType === "internship"} className={tabClass(searchType === "internship")} onClick={() => setSearchType("internship")}>Internships</button>
              </div>
              <form onSubmit={handleHeroSearchSubmit} className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="home-search" className="flex-1 flex items-center gap-3 px-4 min-h-[50px] rounded-xl bg-[#f5f7fc]">
                  <span className="text-[#1e3a8a]"><Icon d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></span>
                  <span className="sr-only">Search</span>
                  <input
                    id="home-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchType === "job" ? "Role, skill or company" : "Internship, skill or field"}
                    className="flex-1 min-w-0 border-0 outline-none bg-transparent text-base text-slate-900 placeholder:text-slate-500"
                  />
                </label>
                <button type="submit" className="inline-flex items-center justify-center gap-2 min-h-[50px] px-5 rounded-xl bg-[#1e3a8a] text-[15px] text-white font-semibold hover:bg-[#0f1f4d] transition">
                  {searchType === "job" ? "Search jobs" : "Search internships"} <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>

            <div className="e2h-in flex gap-5 flex-wrap text-[13px] font-medium text-slate-600" style={{ animationDelay: ".6s" }}>
              <span className="flex gap-2 items-center"><span className="text-green-700"><Icon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" className="w-[18px] h-[18px]" /></span>Verified employers</span>
              <span className="flex gap-2 items-center"><span className="text-[#1e3a8a]"><Icon d="M13 2L4 14h7l-1 8 9-12h-7z" className="w-[18px] h-[18px]" /></span>One-click apply</span>
              <span className="flex gap-2 items-center"><span className="text-amber-700"><Icon d="M7 3v3M17 3v3M4 8h16M5 5h14v15H5z" className="w-[18px] h-[18px]" /></span>Interview tracking</span>
            </div>
          </div>

          {/* Decoration: the "next interview" card lying in 3D. It eases toward the cursor and sways
              on its own otherwise (see the effect above); its edge gives it thickness. */}
          <div ref={sceneRef} className="e2h-scene hidden sm:flex" aria-hidden="true">
            <div className="e2h-shadow" />
            <div className="e2h-isocard">
              <span className="e2h-glare" />
              <span className="text-xs font-bold tracking-[.1em]">NEXT INTERVIEW</span>
              <span className="e2h-display text-[24px] font-bold leading-tight">HR round: scheduled</span>
              <span className="text-[13px] font-medium text-[#3d2a00]">Web Development Intern · Remote</span>
              <span className="mt-auto grid grid-cols-4 gap-2">
                <span className="h-2 rounded-full bg-[#1c1300]" /><span className="h-2 rounded-full bg-[#1c1300]" /><span className="h-2 rounded-full bg-[#1c1300]" /><span className="h-2 rounded-full bg-[#1c1300]/25" />
              </span>
            </div>
            <span className="e2h-par left-[4%] top-[5%]" style={{ "--depth": "22px" }}>
              <span className="e2h-float flex gap-2 items-center px-3.5 py-2 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-green-800 shadow-[0_18px_36px_-16px_rgba(15,31,77,.35)]"><span className="w-2 h-2 rounded-full bg-green-500" />Employer verified</span>
            </span>
            <span className="e2h-par right-[0%] top-[30%]" style={{ "--depth": "30px" }}>
              <span className="e2h-float d1 block px-3.5 py-2 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-amber-800 shadow-[0_18px_36px_-16px_rgba(15,31,77,.35)]">Zero fees, always</span>
            </span>
            <span className="e2h-par left-[8%] bottom-[2%]" style={{ "--depth": "16px" }}>
              <span className="e2h-float d2 block px-3.5 py-2 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-[#1e3a8a] shadow-[0_18px_36px_-16px_rgba(15,31,77,.35)]">Shortlisted</span>
            </span>
          </div>
        </div>
      </section>

      {/* ================= LIVE BOARD (real listings; hidden with fewer than three) ================= */}
      {listings.length >= 3 && (
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
          <div className="e2h-reveal flex flex-col gap-4">
            <span className="text-[13px] font-extrabold text-amber-700 tracking-[.1em] uppercase">Updated every day</span>
            <h2 className="e2h-display m-0 text-[28px] sm:text-[38px] leading-[1.1] tracking-[-0.03em] font-bold text-[#0f1f4d]">A live board of new opportunities.</h2>
            <p className="m-0 text-lg leading-relaxed text-slate-600">Internships and fresher jobs from employers we've checked, across cities and remote. Hover to pause and pick one.</p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/jobs" className="inline-flex items-center min-h-[50px] px-6 rounded-[14px] bg-[#1e3a8a] text-white font-bold hover:bg-[#0f1f4d]">Browse jobs →</Link>
              <Link to="/internships" className="inline-flex items-center min-h-[50px] px-6 rounded-[14px] border border-slate-200 bg-white font-bold text-[#0f1f4d] hover:bg-slate-50">Browse internships</Link>
            </div>
          </div>
          <div className="e2h-board grid grid-cols-2 md:grid-cols-3 gap-4">
              {columns.map((column, c) => (
                // The third column shows from tablet width up; the wrapper hides it, since
                // .e2h-col sets its own display.
                <div key={c} className={c === 2 ? "hidden md:block" : ""}>
                  <div className={`e2h-col ${c === 1 ? "down" : c === 2 ? "slow" : ""}`}>
                    {[...column, ...column].map(({ item, type }, i) => (
                      <BoardCard key={`${item._id || item.id || item.title}-${i}`} item={item} type={type} tint={LOGO_TINTS[(i + c) % LOGO_TINTS.length]} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>
      )}

      {/* ================= FEATURES ================= */}
      <section className="pb-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-10">
          <div className="e2h-reveal text-center flex flex-col gap-3 items-center">
            <span className="text-[13px] font-extrabold text-amber-700 tracking-[.1em] uppercase">Built for your job search</span>
            <h2 className="e2h-display m-0 text-[28px] sm:text-[38px] tracking-[-0.03em] font-bold text-[#0f1f4d]">Everything you need, nothing you don't</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_LIST.map((f) => (
              <div key={f.title} className="e2h-feature e2h-reveal rounded-[24px] p-7 bg-white border border-[#e6ebf5] flex flex-col gap-3">
                <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${f.tint}`}><Icon d={f.icon} className="w-[26px] h-[26px]" strokeWidth={2} /></span>
                <span className="e2h-display text-xl font-bold text-slate-900">{f.title}</span>
                <span className="text-[15px] leading-relaxed text-slate-600">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STEPS ================= */}
      <section className="py-20 bg-[#f1f5ff] border-y border-[#e6ebf5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-10">
          <h2 className="e2h-display e2h-reveal m-0 text-[28px] sm:text-[38px] tracking-[-0.03em] font-bold text-[#0f1f4d] text-center">Three steps to your offer</h2>
          <div className="h-1.5 rounded-md bg-[#dbe4ff] overflow-hidden" aria-hidden="true">
            <span className="e2h-fill block h-full rounded-md bg-gradient-to-r from-[#1e3a8a] to-amber-500" />
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="e2h-reveal bg-white rounded-[24px] p-7 border border-[#e6ebf5] flex flex-col gap-3">
                <span className={`e2h-display text-4xl font-bold tracking-[-0.05em] leading-none ${s.color}`}>{s.n}</span>
                <span className="e2h-display text-xl font-bold">{s.title}</span>
                <span className="text-base leading-relaxed text-slate-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="e2h-reveal relative overflow-hidden rounded-[36px] bg-[#0f1f4d] px-6 py-14 sm:px-12 sm:py-20 flex flex-wrap gap-8 items-center justify-between">
            <div className="e2h-mesh" style={{ width: 460, height: 460, background: "#f59e0b", right: -140, top: -160, opacity: 0.4 }} aria-hidden="true" />
            <div className="e2h-mesh" style={{ width: 380, height: 380, background: "#3b82f6", left: -120, bottom: -200, opacity: 0.45 }} aria-hidden="true" />
            <div className="relative flex flex-col gap-3 flex-[1_1_480px]">
              <h2 className="e2h-display m-0 text-[28px] sm:text-[42px] leading-[1.08] tracking-[-0.035em] font-bold text-white">Your next step is one profile away.</h2>
              <p className="m-0 text-lg text-indigo-200">Free for candidates, always. Takes two minutes.</p>
            </div>
            <div className="relative flex gap-3 flex-wrap">
              <Link to="/register/student" className="inline-flex items-center min-h-[58px] px-8 rounded-[14px] bg-amber-500 text-[#1c1300] text-lg font-bold hover:bg-amber-400">Create free profile →</Link>
              <Link to="/register/employer" className="inline-flex items-center min-h-[58px] px-7 rounded-[14px] border border-white/30 bg-white/10 text-white text-lg font-bold hover:bg-white/20">I'm hiring</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER (unchanged: city and stream links for search engines) ================= */}
      <footer className="bg-[#121b2b] text-slate-300 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Internships by places</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/internships/in/delhi" className="hover:text-white">Internship in Delhi</Link></li>
                <li><Link to="/internships/in/bangalore" className="hover:text-white">Internship in Bangalore</Link></li>
                <li><Link to="/internships/in/hyderabad" className="hover:text-white">Internship in Hyderabad</Link></li>
                <li><Link to="/internships/in/mumbai" className="hover:text-white">Internship in Mumbai</Link></li>
                <li><Link to="/internships/in/chennai" className="hover:text-white">Internship in Chennai</Link></li>
                <li><Link to="/internships/in/pune" className="hover:text-white">Internship in Pune</Link></li>
                <li><Link to="/internships/work-from-home" className="hover:text-white">Virtual internship</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Internship by Stream</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/internships/category/computer-science" className="hover:text-white">Computer Science</Link></li>
                <li><Link to="/internships/category/web-development" className="hover:text-white">Web Development</Link></li>
                <li><Link to="/internships/category/data-science" className="hover:text-white">Data Science</Link></li>
                <li><Link to="/internships/category/marketing" className="hover:text-white">Marketing</Link></li>
                <li><Link to="/internships/category/finance" className="hover:text-white">Finance</Link></li>
                <li><Link to="/internships/category/graphic-design" className="hover:text-white">Graphic Design</Link></li>
                <li><Link to="/internships/category/hr" className="hover:text-white">Human Resources</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Jobs by Places</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/jobs/in/delhi" className="hover:text-white">Jobs in Delhi</Link></li>
                <li><Link to="/jobs/in/bangalore" className="hover:text-white">Jobs in Bangalore</Link></li>
                <li><Link to="/jobs/in/mumbai" className="hover:text-white">Jobs in Mumbai</Link></li>
                <li><Link to="/jobs/in/hyderabad" className="hover:text-white">Jobs in Hyderabad</Link></li>
                <li><Link to="/jobs/in/pune" className="hover:text-white">Jobs in Pune</Link></li>
                <li><Link to="/jobs/work-from-home" className="hover:text-white">Remote Jobs</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Jobs by Stream</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/jobs/category/software-development" className="hover:text-white">Software Engineer</Link></li>
                <li><Link to="/jobs/category/data-science" className="hover:text-white">Data Analyst</Link></li>
                <li><Link to="/jobs/category/marketing" className="hover:text-white">Digital Marketing</Link></li>
                <li><Link to="/jobs/category/sales" className="hover:text-white">Sales & Business Dev</Link></li>
                <li><Link to="/jobs/category/finance" className="hover:text-white">Finance Executive</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">About E2Job</p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/contact" className="hover:text-white">About E2Job</Link></li>
                <li><Link to="/opportunities?source=campus" className="hover:text-white">Opportunities</Link></li>
                {FEATURES.courses && <li><Link to="/courses" className="hover:text-white">Training & Certifications</Link></li>}
                <li><Link to="/register/employer" className="hover:text-white">Hire Talent</Link></li>
                <li><Link to="/login" className="hover:text-white">Candidate Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} E2Job. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-slate-300">Terms & Conditions</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-slate-300">Contact</Link>
              <span>•</span>
              {/* A plain link: /sitemap.xml is served by the API (vercel.json rewrite), not the React app. */}
              <a href="/sitemap.xml" className="hover:text-slate-300">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
