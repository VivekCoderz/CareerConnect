import { CalendarCheck, Camera, ClipboardCheck, LogIn, Mic, Monitor, UserCheck, Video } from "lucide-react";

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
  "Business Scenarios (written)",
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
  { band: "Band 1", range: "CGPA below 6.0", text: "Foundations first: aptitude, communication and core business concepts." },
  { band: "Band 2", range: "CGPA 6.0 to 7.99", text: "Build speed and depth: case practice, data interpretation and interviews." },
  { band: "Band 3", range: "CGPA 8.0 and above", text: "Placement ready: advanced cases, group discussion and mock interviews." },
];

const DEFAULT_FAQS = [
  { q: "Which device should I use?", a: "A laptop or desktop with a working camera and microphone, on Chrome or Edge. Phones are not suitable for the test." },
  { q: "What if my internet stops during the test?", a: "Your answers are saved as you go. Sign in again on the same device and continue; the timer keeps running." },
  { q: "When will I see my result?", a: "After the review of written and speaking answers is complete. Your dashboard will show the result with section scores." },
  { q: "My CGPA or details are wrong. What do I do?", a: "Correct them on your Profile page. The change is checked before it counts." },
  { q: "How is my band decided?", a: "From your verified CGPA: below 6.0 is Band 1, 6.0 to 7.99 is Band 2, and 8.0 and above is Band 3." },
];

const SectionTitle = ({ eyebrow, title, text }) => (
  <div className="max-w-2xl">
    <p className="text-xs font-bold uppercase tracking-widest text-[var(--campus-brand)]">{eyebrow}</p>
    <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h2>
    {text && <p className="mt-3 text-base leading-relaxed text-slate-600">{text}</p>}
  </div>
);

export const StatsStrip = () => (
  <div className="relative z-10 mx-auto -mt-10 grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-lg ring-1 ring-slate-200 sm:grid-cols-4">
    {[
      ["50", "questions"],
      ["60", "minutes, one attempt"],
      ["3", "learning bands"],
      ["Live", "classes on Google Meet"],
    ].map(([value, label]) => (
      <div key={label} className="bg-white px-4 py-5 text-center">
        <p className="text-2xl font-extrabold text-[var(--campus-brand)] sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{label}</p>
      </div>
    ))}
  </div>
);

export const About = ({ institution }) => (
  <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
    <SectionTitle eyebrow="About the programme" title={`${institution?.shortName || institution?.name} x E2Job`} text={institution?.landing?.about} />
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map(({ icon: Icon, title, text }, i) => (
        <div key={title} className="relative rounded-2xl border border-slate-200 bg-white p-5">
          <span className="absolute right-5 top-5 text-3xl font-extrabold text-slate-100">{i + 1}</span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--campus-brand)] text-white">
            <Icon className="h-5 w-5" />
          </span>
          <p className="mt-4 font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
        </div>
      ))}
    </div>
  </section>
);

export const Assessment = () => (
  <section id="assessment" className="scroll-mt-20 border-y border-slate-200 bg-white">
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
      <div>
        <SectionTitle eyebrow="The assessment" title="What the test covers" text="Multiple-choice questions are marked from the answer key. Written answers and the speaking answer are reviewed before results are released." />
        <ul className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <li key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">{s}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
        <p className="font-bold text-slate-900">Before you start</p>
        <ul className="mt-4 space-y-4">
          {RULES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 text-sm leading-relaxed text-slate-700">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--campus-brand)]" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export const Training = () => (
  <section id="training" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
    <SectionTitle eyebrow="Training" title="Classes planned for your level" text="Trainers take live classes on Google Meet. Your dashboard always shows your next class, and the Join button opens 15 minutes before it starts." />
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {BANDS.map((b) => (
        <div key={b.band} className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold text-[var(--campus-brand)]">{b.band}</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{b.range}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{b.text}</p>
        </div>
      ))}
    </div>
  </section>
);

export const Faq = ({ institution }) => {
  const faqs = institution?.landing?.faqs?.length ? institution.landing.faqs : DEFAULT_FAQS;
  return (
    <section id="faq" className="scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <SectionTitle eyebrow="Questions" title="Frequently asked questions" />
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                {q}
                <span className="text-xl leading-none text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-600">
          Still need help? Write to <a className="font-semibold text-[var(--campus-brand)] hover:underline" href={`mailto:${institution?.helpContact}`}>{institution?.helpContact}</a>
        </p>
      </div>
    </section>
  );
};
