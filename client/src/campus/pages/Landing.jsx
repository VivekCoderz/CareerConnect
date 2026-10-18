import { Link } from "react-router-dom";
import { useCampus } from "../useCampus";
import { BrandMark, Footer } from "../components/Layout";
import SignInCard from "./landing/SignInCard";
import { About, Assessment, Faq, StatsStrip, Training } from "./landing/sections";

// The university's own landing page: its brand, the programme, the test, the training bands and
// sign-in. Per-university copy comes from institution.landing.

const NAV = [
  ["#about", "About"],
  ["#assessment", "Assessment"],
  ["#training", "Training"],
  ["#faq", "FAQ"],
];

const Landing = () => {
  const { institution, member, staff } = useCampus();
  const landing = institution?.landing || {};
  const signedIn = Boolean(member || staff);
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandMark institution={institution} compact />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-semibold text-slate-600 hover:text-slate-900">{label}</a>
            ))}
          </nav>
          <a href="#top" className="rounded-lg bg-[var(--campus-brand)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            {signedIn ? "My account" : "Sign in"}
          </a>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden bg-[var(--campus-brand)] text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/0 via-black/10 to-black/40" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-white/5" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:pt-20">
          <div>
            {landing.batchLabel && (
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1 ring-white/30">{landing.batchLabel}</span>
            )}
            <p className="mt-5 text-lg font-semibold text-white/90">{institution?.name}</p>
            <h1 className="mt-1 text-4xl font-extrabold leading-tight sm:text-5xl">
              {landing.heroTitle || institution?.programName || "Assessment and Training Portal"}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              {landing.heroText || "Sign in with your university Google account to see your profile, take your assessment and join your training classes."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <a href="#assessment" className="rounded-lg bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-white/90">How the test works</a>
              <a href="#training" className="rounded-lg px-5 py-3 font-semibold text-white ring-1 ring-white/50 hover:bg-white/10">Training classes</a>
            </div>
          </div>
          <SignInCard />
        </div>
      </section>

      <div className="px-4">
        <StatsStrip />
      </div>
      <About institution={institution} />
      <Assessment />
      <Training />
      <Faq institution={institution} />

      <div className="border-t border-slate-200 bg-slate-50">
        <Footer />
        <p className="pb-6 text-center">
          <Link to="/ops/login" className="text-xs text-slate-400 hover:text-slate-700">E2Job staff</Link>
        </p>
      </div>
    </div>
  );
};

export default Landing;
