import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

// A looping, illustrative preview of the test screen: the timer runs, an option gets picked and
// the next question slides in. Nothing here is a real question from the assessment.

const SAMPLES = [
  { section: "Quantitative Aptitude", q: "A shop sells 120 units at Rs 50 and 80 units at Rs 65. What is the average price per unit?", options: ["Rs 55", "Rs 56", "Rs 57.5", "Rs 58"], pick: 1 },
  { section: "Situational Judgement", q: "A client is unhappy about a delayed order. What do you do first?", options: ["Offer a discount", "Listen and confirm the issue", "Escalate to the manager", "Blame logistics"], pick: 1 },
  { section: "Data Interpretation", q: "Sales rose from 40 to 50 lakh. What is the growth?", options: ["10%", "20%", "25%", "50%"], pick: 2 },
];

const pad = (n) => String(n).padStart(2, "0");

const TestPreview = () => {
  const [seconds, setSeconds] = useState(59 * 60 + 42);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 59 * 60 + 59)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const choose = setTimeout(() => setPicked(SAMPLES[index].pick), 1600);
    const next = setTimeout(() => {
      setPicked(null);
      setIndex((i) => (i + 1) % SAMPLES.length);
    }, 3600);
    return () => {
      clearTimeout(choose);
      clearTimeout(next);
    };
  }, [index]);

  const sample = SAMPLES[index];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white text-slate-700 shadow-2xl ring-1 ring-slate-200" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          Camera on
        </div>
        <div className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-white">
          {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
        </div>
      </div>
      <div className="min-h-[19rem] p-5">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--campus-brand)]">{sample.section}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">{sample.q}</p>
            <div className="mt-4 space-y-2">
              {sample.options.map((o, i) => {
                const on = picked === i;
                return (
                  <motion.div
                    key={o}
                    animate={on ? { scale: [1, 1.03, 1] } : {}}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${on ? "border-[var(--campus-brand)] bg-rose-50/60 ring-1 ring-[var(--campus-brand)]" : "border-slate-200"}`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${on ? "border-[var(--campus-brand)]" : "border-slate-300"}`}>
                      {on && <motion.span layoutId="dot" className="h-2 w-2 rounded-full bg-[var(--campus-brand)]" />}
                    </span>
                    {o}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex gap-1 border-t border-slate-100 px-5 py-3">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= index + 6 ? "bg-[var(--campus-brand)]" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
};

export default TestPreview;
