import { CloudCheck, CloudOff, ShieldAlert } from "lucide-react";

// Top bar of the test: university, test name, save state, warnings, the timer ring and Submit.
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const TimerRing = ({ left, total }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const share = total ? Math.max(0, Math.min(1, left / total)) : 0;
  const low = left <= 300;
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-1.5 ${low ? "bg-rose-500/15" : "bg-white/10"}`} role="timer" aria-label={`Time left ${clock(left)}`}>
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/15" />
        <circle
          cx="24" cy="24" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          stroke={low ? "#fb7185" : "#fbbf24"} strokeDasharray={c} strokeDashoffset={c * (1 - share)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Time left</p>
        <p className={`font-mono text-xl font-bold tabular-nums ${low ? "animate-pulse text-rose-300" : "text-white"}`}>{clock(left)}</p>
      </div>
    </div>
  );
};

const TestHeader = ({ institution, title, left, total, warnings, maxWarnings, saving, onSubmit, submitting }) => (
  <header className="sticky top-0 z-30 text-white shadow-lg" style={{ background: "linear-gradient(90deg, #0f172a, color-mix(in srgb, var(--campus-brand) 35%, #0f172a))" }}>
    <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {institution?.iconUrl && <img src={institution.iconUrl} alt="" className="h-10 w-10 rounded-full bg-white p-0.5" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-xs text-white/60">{institution?.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-white/70 md:flex">
          {saving ? <CloudOff className="h-4 w-4 text-amber-300" /> : <CloudCheck className="h-4 w-4 text-emerald-300" />}
          {saving ? "Saving..." : "All answers saved"}
        </span>
        <span className={`hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold sm:flex ${warnings ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-white/70"}`}>
          <ShieldAlert className="h-4 w-4" /> Warnings {warnings}/{maxWarnings}
        </span>
        <TimerRing left={left} total={total} />
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow transition hover:bg-amber-50 disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  </header>
);

export default TestHeader;
