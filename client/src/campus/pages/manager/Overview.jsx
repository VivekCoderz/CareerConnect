import { motion } from "motion/react";
import { Award, CalendarCheck, ClipboardCheck, ShieldAlert, TrendingDown, TrendingUp, Users } from "lucide-react";
import { BAND_LABEL } from "../../format";
import { Grow, Num, Panel, Ring } from "./visuals";
import StudentsDirectory from "./StudentsDirectory";

// Overview of the batch: headline numbers, CGPA bands, top performers, section averages and the
// student directory. Scores count published results only.

const Kpi = ({ icon: Icon, tone, label, value, decimals, suffix, hint, bar, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }}
    className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.12)] transition hover:-translate-y-0.5 hover:shadow-lg"
  >
    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 ${tone.bg}`} />
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.soft}`}><Icon className={`h-5 w-5 ${tone.text}`} /></span>
    <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900"><Num value={value} decimals={decimals} suffix={suffix} /></p>
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    {bar !== undefined && <div className="mt-3"><Grow value={bar} className={tone.bg} delay={delay} /></div>}
  </motion.div>
);

const TONES = {
  brand: { bg: "bg-[var(--campus-brand)]", soft: "bg-[color-mix(in_srgb,var(--campus-brand)_12%,white)]", text: "text-[var(--campus-brand)]" },
  green: { bg: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-500", soft: "bg-amber-50", text: "text-amber-600" },
  blue: { bg: "bg-sky-500", soft: "bg-sky-50", text: "text-sky-600" },
  violet: { bg: "bg-violet-500", soft: "bg-violet-50", text: "text-violet-600" },
};
const PODIUM = [
  { ring: "ring-amber-400 bg-amber-50 text-amber-700", h: "h-28", order: "order-2" },
  { ring: "ring-slate-300 bg-slate-50 text-slate-600", h: "h-20", order: "order-1" },
  { ring: "ring-orange-300 bg-orange-50 text-orange-700", h: "h-16", order: "order-3" },
];

const Overview = ({ summary, onProfile, onProctoring, refreshKey }) => {
  const submitted = (summary.status.submitted || 0) + (summary.status.auto_submitted || 0);
  const scored = summary.sections.filter((s) => s.averagePercentage !== null);
  const best = [...scored].sort((a, b) => b.averagePercentage - a.averagePercentage)[0];
  const worst = [...scored].sort((a, b) => a.averagePercentage - b.averagePercentage)[0];
  const maxBand = Math.max(1, ...summary.byBand.map((b) => b.students));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Users} tone={TONES.brand} label="Students" value={summary.students} hint={`${summary.verified} details verified`} bar={summary.students ? (summary.verified / summary.students) * 100 : 0} delay={0} />
        <Kpi icon={ClipboardCheck} tone={TONES.green} label="Tests submitted" value={submitted} hint={`${summary.status.not_started || 0} not started yet`} bar={summary.students ? (submitted / summary.students) * 100 : 0} delay={0.05} />
        <Kpi icon={ShieldAlert} tone={TONES.amber} label="Flagged tests" value={summary.flagged} hint="Fair-test warnings or copying" delay={0.1} />
        <Kpi icon={CalendarCheck} tone={TONES.blue} label="Class attendance" value={summary.attendanceRate ?? "-"} decimals={1} suffix="%" hint="Across held classes" bar={summary.attendanceRate ?? 0} delay={0.15} />
        <Kpi icon={Award} tone={TONES.violet} label="Results" value={summary.published ? "Published" : "Pending"} hint={summary.published ? "Students can see scores" : "Not visible to students"} delay={0.2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="By CGPA band" subtitle="Students, tests submitted and the average published score" className="lg:col-span-3">
          <div className="space-y-5">
            {summary.byBand.map((b, i) => (
              <div key={b.band} className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">{BAND_LABEL[b.band]}</p>
                    <p className="text-xs text-slate-500">{b.submitted} of {b.students} submitted</p>
                  </div>
                  <Grow value={(b.students / maxBand) * 100} className={["bg-rose-400", "bg-[var(--campus-brand)]", "bg-rose-900"][i]} delay={i * 0.1} />
                </div>
                <Ring value={b.averagePercentage ?? 0} size={56} stroke={6}>{b.averagePercentage === null ? "-" : `${Math.round(b.averagePercentage)}%`}</Ring>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top performers" subtitle="From published results" className="lg:col-span-2">
          {summary.top.length ? (
            <>
              <div className="flex items-end justify-center gap-3">
                {summary.top.slice(0, 3).map((t, i) => (
                  <div key={t.rollNo || t.fullName} className={`flex w-1/3 flex-col items-center ${PODIUM[i].order}`}>
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold ring-4 ${PODIUM[i].ring}`}>{i + 1}</span>
                    <p className="mt-2 line-clamp-2 text-center text-xs font-bold text-slate-900">{t.fullName}</p>
                    <motion.div initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }} style={{ transformOrigin: "bottom" }} className={`mt-2 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b from-[color-mix(in_srgb,var(--campus-brand)_22%,white)] to-[color-mix(in_srgb,var(--campus-brand)_4%,white)] pt-2 ${PODIUM[i].h}`}>
                      <span className="text-sm font-extrabold text-[var(--campus-brand)]">{t.percentage}%</span>
                    </motion.div>
                  </div>
                ))}
              </div>
              <ol className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                {summary.top.slice(3).map((t, i) => (
                  <li key={t.rollNo || t.fullName} className="flex items-center justify-between py-2 text-sm">
                    <span><b className="mr-2 text-slate-400">{i + 4}</b>{t.fullName}</span>
                    <span className="font-semibold text-slate-700">{t.percentage}%</span>
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="text-sm text-slate-500">Shown after results are published.</p>}
        </Panel>
      </div>

      {summary.published && (
        <Panel
          title="Average by section"
          subtitle="Published results"
          action={best && worst && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700"><TrendingUp className="h-3.5 w-3.5" />Strongest: {best.title}</span>
              <span className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-700"><TrendingDown className="h-3.5 w-3.5" />Needs work: {worst.title}</span>
            </div>
          )}
        >
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.sections.map((s, i) => (
              <div key={s.key}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">{s.title}</span>
                  <span className={`font-bold ${s.key === best?.key ? "text-emerald-600" : s.key === worst?.key ? "text-rose-600" : "text-slate-700"}`}>{s.averagePercentage ?? "-"}%</span>
                </div>
                <Grow value={s.averagePercentage} className="bg-gradient-to-r from-[color-mix(in_srgb,var(--campus-brand)_55%,white)] to-[var(--campus-brand)]" delay={i * 0.05} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <StudentsDirectory onProfile={onProfile} onProctoring={onProctoring} refreshKey={refreshKey} />
    </div>
  );
};

export default Overview;
