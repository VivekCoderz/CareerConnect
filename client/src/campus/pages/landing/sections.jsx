import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { CalendarCheck, Camera, ClipboardCheck, LogIn, Mic, Monitor, Plus, UserCheck, Video } from "lucide-react";
import { Counter, Reveal } from "./motion";
import TestPreview from "./TestPreview";

// Sections of the university landing page. Copy that differs per university comes from
// institution.landing; everything here is the standard programme description.

const SECTIONS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Data Interpretation",
  "Verbal Ability",
  "Business Fundamentals",
  "Situational Judgement",
  "Business Awareness",
  "Business Scenarios",
  "Speaking",
];

const STEPS = [
  { icon: LogIn, title: "Sign in", text: "Use your university Google account. No new password to remember." },
  { icon: UserCheck, title: "Check your profile", text: "Your details come from the university. Correct anything that is wrong." },
  { icon: ClipboardCheck, title: "Take the assessment", text: "One attempt, 60 minutes, on a laptop or desktop with a camera and microphone." },
  { icon: Video, title: "Join your classes", text: "Your next class and its Google Meet link appear on your dashboard." },
];

const RULES = [
  { icon: Camera, text: "Camera and microphone must stay on. The test does not start without them." },
  { icon: Monitor, text: "The test runs in full screen. Leaving it or switching tabs is recorded, and the third time ends the test." },
  { icon: Mic, text: "The speaking question is recorded in the browser within the same 60 minutes." },
  { icon: CalendarCheck, text: "You get one attempt. Your answers save automatically if the connection drops." },
];

const BANDS = [
  { band: "Band 1", range: "CGPA below 6.0", from: 0, to: 60, text: "Foundations first: aptitude, communication and core business concepts." },
  { band: "Band 2", range: "CGPA 6.0 to 7.99", from: 60, to: 80, text: "Build speed and depth: case practice, data interpretation and interviews." },
  { band: "Band 3", range: "CGPA 8.0 and above", from: 80, to: 100, text: "Placement ready: advanced cases, group discussion and mock interviews." },
];

const DEFAULT_FAQS = [
  { q: "Which device should I use?", a: "A laptop or desktop with a working camera and microphone, on Chrome or Edge. Phones are not suitable for the test." },
  { q: "What if my internet stops during the test?", a: "Your answers are saved as you go. Sign in again on the same device and continue; the timer keeps running." },
  { q: "When will I see my result?", a: "After the review of written and speaking answers is complete. Your dashboard will show the result with section scores." },
  { q: "My CGPA or details are wrong. What do I do?", a: "Correct them on your Profile page. The change is checked before it counts." },
  { q: "How is my band decided?", a: "From your verified CGPA: below 6.0 is Band 1, 6.0 to 7.99 is Band 2, and 8.0 and above is Band 3." },
];

const SectionTitle = ({ eyebrow, title, text, light = false, center = false }) => (
  <Reveal className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? "text-amber-300" : "text-[var(--campus-brand)]"}`}>{eyebrow}</p>
    <h2 className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
    {text && <p className={`mt-4 text-base leading-relaxed ${light ? "text-white/75" : "text-slate-600"}`}>{text}</p>}
  </Reveal>
);

export const StatsStrip = () => (
  <Reveal className="relative z-10 mx-auto -mt-14 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-xl ring-1 ring-slate-200 sm:grid-cols-4">
    {[
      [<Counter key="q" to={50} />, "questions"],
      [<Counter key="m" to={60} />, "minutes, one attempt"],
      [<Counter key="b" to={3} />, "learning bands"],
      ["Live", "classes on Google Meet"],
    ].map(([value, label]) => (
      <div key={label} className="bg-white px-4 py-6 text-center">
        <p className="text-3xl font-extrabold tabular-nums text-[var(--campus-brand)] sm:text-4xl">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
      </div>
    ))}
  </Reveal>
);

const MarqueeRow = ({ reverse = false }) => (
  <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
    <motion.div
      className="flex shrink-0 gap-3 pr-3"
      animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      {[...SECTIONS, ...SECTIONS].map((s, i) => (
        <span key={`${s}-${i}`} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          {s}
        </span>
      ))}
    </motion.div>
  </div>
);

export const Marquee = () => (
  <section className="space-y-3 py-14" aria-label="Sections in the assessment">
    <MarqueeRow />
    <MarqueeRow reverse />
  </section>
);

export const About = ({ institution }) => (
  <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-4">
    <SectionTitle eyebrow="About the programme" title={`The ${institution?.shortName || institution?.name} way to placement readiness`} text={institution?.landing?.about} />
  </section>
);

export const Journey = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section id="journey" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20">
      <SectionTitle eyebrow="Your journey" title="Four steps, one portal" center />
      <div ref={ref} className="relative mt-14">
        <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-slate-200 md:left-1/2 md:-translate-x-1/2" />
        <motion.div className="absolute left-6 top-0 w-0.5 bg-[var(--campus-brand)] md:left-1/2 md:-translate-x-1/2" style={{ height: fill }} />
        <div className="space-y-12">
          {STEPS.map(({ icon: Icon, title, text }, i) => {
            const right = i % 2 === 1;
            return (
              <div key={title} className="relative md:grid md:grid-cols-2 md:gap-16">
                <motion.span
                  className="absolute left-6 top-1 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl bg-[var(--campus-brand)] text-white shadow-lg md:left-1/2"
                  initial={{ scale: 0, rotate: -30 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
                <Reveal x={right ? 40 : -40} y={0} className={`pl-16 md:pl-0 ${right ? "md:col-start-2" : "md:text-right"}`}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Step {i + 1}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const Assessment = () => (
  <section id="assessment" className="relative scroll-mt-20 overflow-hidden bg-slate-950 text-white">
    <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[30rem] w-[30rem] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--campus-brand) 45%, transparent)" }} />
    <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-24 lg:grid-cols-2 lg:items-center">
      <div>
        <SectionTitle
          light
          eyebrow="The assessment"
          title="60 minutes that show where you stand"
          text="Multiple-choice questions are marked from the answer key. Written answers and the speaking answer are reviewed before results are released."
        />
        <ul className="mt-8 space-y-5">
          {RULES.map(({ icon: Icon, text }, i) => (
            <Reveal key={text} as="li" delay={i * 0.1} className="flex gap-4 text-sm leading-relaxed text-white/80">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon className="h-4 w-4 text-amber-300" />
              </span>
              <span className="pt-1.5">{text}</span>
            </Reveal>
          ))}
        </ul>
      </div>
      <Reveal y={40}>
        <motion.div whileHover={{ rotate: -1, scale: 1.01 }} transition={{ type: "spring", stiffness: 200 }}>
          <TestPreview />
        </motion.div>
        <p className="mt-3 text-center text-xs text-white/50">Preview of the test screen</p>
      </Reveal>
    </div>
  </section>
);

export const Training = () => (
  <section id="training" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
    <SectionTitle eyebrow="Training" title="Classes planned for your level" text="Trainers take live classes on Google Meet. Your dashboard always shows your next class, and the Join button opens 15 minutes before it starts." />
    <Reveal className="mt-12">
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
        {BANDS.map((b, i) => (
          <motion.div
            key={b.band}
            className="absolute inset-y-0 rounded-full"
            style={{ left: `${b.from}%`, background: `color-mix(in srgb, var(--campus-brand) ${40 + i * 30}%, white)` }}
            initial={{ width: 0 }}
            whileInView={{ width: `${b.to - b.from}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.35, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="relative mt-2 h-4 text-xs font-semibold text-slate-500">
        {[0, 6, 8, 10].map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${v * 10}%` }}>{v}</span>
        ))}
      </div>
    </Reveal>
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {BANDS.map((b, i) => (
        <Reveal key={b.band} delay={i * 0.12}>
          <motion.div
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[var(--campus-brand)] hover:shadow-xl"
          >
            <p className="text-sm font-bold text-[var(--campus-brand)]">{b.band}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{b.range}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{b.text}</p>
          </motion.div>
        </Reveal>
      ))}
    </div>
  </section>
);

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold text-slate-900">
        {q}
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-slate-400"><Plus className="h-5 w-5" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const helpLink = (contact) =>
  contact?.includes("@") ? (
    <a className="font-semibold text-[var(--campus-brand)] hover:underline" href={`mailto:${contact}`}>{contact}</a>
  ) : (
    <b className="text-slate-900">{contact || "the programme office"}</b>
  );

export const Faq = ({ institution }) => {
  const faqs = institution?.landing?.faqs?.length ? institution.landing.faqs : DEFAULT_FAQS;
  return (
    <section id="faq" className="scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-24">
        <SectionTitle eyebrow="Questions" title="Frequently asked questions" center />
        <Reveal className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map((f) => <FaqItem key={f.q} {...f} />)}
        </Reveal>
        <p className="mt-8 text-center text-sm text-slate-600">Still need help? Contact {helpLink(institution?.helpContact)}.</p>
      </div>
    </section>
  );
};

export const FinalCta = ({ institution }) => (
  <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(120deg, var(--campus-brand), color-mix(in srgb, var(--campus-brand) 55%, #12030a))" }}>
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
      animate={{ x: [0, 400, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="relative mx-auto max-w-4xl px-4 py-20 text-center">
      <Reveal>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Ready when you are.</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/80">Sign in with your {institution?.shortName || institution?.name} Google account to get started.</p>
        <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} href="#top" className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-bold text-slate-900 shadow-xl shadow-black/20">
          Sign in now
        </motion.a>
      </Reveal>
    </div>
  </section>
);
