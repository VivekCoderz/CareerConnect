import { motion } from "motion/react";
import { CalendarClock, TrendingUp, Award } from "lucide-react";
import SignInCard from "./SignInCard";
import { Glow, WordsIn } from "./motion";

// The hero: the university's colour with drifting light, the programme title, sign-in, and a
// few floating previews of what students get.

const DEEP = "color-mix(in srgb, var(--campus-brand) 55%, #12030a)";

const Float = ({ children, className, delay = 0, y = 10 }) => (
  <motion.div
    className={`absolute z-20 hidden rounded-2xl bg-white/90 p-3 text-slate-900 shadow-2xl ring-1 ring-black/5 backdrop-blur lg:block ${className}`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, y: [0, -y, 0] }}
    transition={{ opacity: { delay, duration: 0.5 }, scale: { delay, duration: 0.5 }, y: { delay, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
  >
    {children}
  </motion.div>
);

const Hero = ({ institution }) => {
  const landing = institution?.landing || {};
  const title = landing.heroTitle || institution?.programName || "Assessment and Training Portal";
  return (
    <section id="top" className="relative isolate overflow-hidden text-white" style={{ background: `linear-gradient(135deg, var(--campus-brand) 0%, ${DEEP} 100%)` }}>
      <Glow className="-left-32 -top-40 h-[28rem] w-[28rem] bg-white/20" path={{ x: [0, 120, 40], y: [0, 60, 140] }} />
      <Glow className="-right-40 top-10 h-[32rem] w-[32rem] bg-amber-300/25" duration={22} path={{ x: [0, -100, -20], y: [0, 120, 40] }} />
      <Glow className="bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] bg-rose-300/25" duration={26} path={{ x: [0, 80, -60], y: [0, -60, 0] }} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-28 pt-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-36 lg:pt-24">
        <div>
          {landing.batchLabel && (
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1 ring-white/30 backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
              </span>
              {landing.batchLabel}
            </motion.span>
          )}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-6 text-lg font-semibold text-white/85">
            {institution?.name}
          </motion.p>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            <WordsIn text={title} delay={0.2} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg"
          >
            {landing.heroText || "Sign in with your university Google account to see your profile, take your assessment and join your training classes."}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.6 }} className="mt-9 flex flex-wrap gap-3 text-sm">
            <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#assessment" className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 shadow-lg shadow-black/20">
              How the test works
            </motion.a>
            <motion.a whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} href="#journey" className="rounded-xl px-5 py-3 font-semibold text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/10">
              Your journey
            </motion.a>
          </motion.div>
        </div>

        <div className="relative">
          <Float className="-left-24 -top-14 w-48" delay={1.1}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />Strength</p>
            <p className="mt-1 text-sm font-bold">Quantitative Aptitude</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: "82%" }} transition={{ delay: 1.5, duration: 1.2 }} />
            </div>
          </Float>
          <Float className="-bottom-20 -left-14 w-56" delay={1.3} y={14}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--campus-brand)]"><CalendarClock className="h-3.5 w-3.5" />Next class</p>
            <p className="mt-1 text-sm font-bold">Case interview practice</p>
            <p className="mt-2 inline-block rounded-md bg-[var(--campus-brand)] px-2 py-1 text-[11px] font-bold text-white">Join on Google Meet</p>
          </Float>
          <Float className="-right-6 -top-16 w-36" delay={1.5} y={8}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600"><Award className="h-3.5 w-3.5" />Your band</p>
            <p className="mt-1 text-2xl font-extrabold">Band 2</p>
          </Float>
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <SignInCard />
          </motion.div>
        </div>
      </div>

      <svg aria-hidden="true" className="absolute bottom-0 left-0 h-16 w-full text-slate-50 sm:h-24" viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path fill="currentColor" d="M0,64 C240,110 480,10 720,40 C960,70 1200,100 1440,50 L1440,100 L0,100 Z" />
      </svg>
    </section>
  );
};

export default Hero;
