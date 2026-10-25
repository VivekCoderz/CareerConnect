import { useCallback, useEffect, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import { Badge } from "../../components/ui";
import { BAND_LABEL, inputClass } from "../../format";
import { Panel } from "./visuals";

// Every student with band, profile, verification, test status, score and classes. Names open
// the profile; warnings open the fair-test review.
const STATUS = {
  not_started: ["Not started", "slate"],
  in_progress: ["In progress", "blue"],
  submitted: ["Submitted", "green"],
  auto_submitted: ["Auto-submitted", "amber"],
};

const initials = (name) => String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const StudentsDirectory = ({ onProfile, onProctoring, refreshKey }) => {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ band: "", status: "", search: "" });
  const [error, setError] = useState("");
  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    campusApi.get("/manager/students", { params }).then((r) => setStudents(r.data.students)).catch((e) => setError(errorMessage(e)));
  }, [filters]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load, refreshKey]);

  return (
    <Panel title="Students" subtitle={`${students.length} shown. Click a name for the full profile.`}>
      {error && <p className="mb-3 text-sm text-rose-700">{error}</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-9`} placeholder="Search name, email or roll number" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <select className={inputClass} value={filters.band} onChange={(e) => setFilters({ ...filters, band: e.target.value })} aria-label="Band">
          <option value="">All bands</option>
          {[1, 2, 3].map((b) => <option key={b} value={b}>{BAND_LABEL[b]}</option>)}
        </select>
        <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Test status">
          <option value="">All test statuses</option>
          {Object.entries(STATUS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          <option value="flagged">Flagged</option>
        </select>
      </div>
      <div className="max-h-[640px] overflow-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th><th>Band</th><th>Profile</th><th>Details</th><th>Test</th><th>Score</th><th>Classes</th><th className="pr-4" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.memberId} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                <td className="px-4 py-2.5">
                  <button type="button" onClick={() => onProfile(s.memberId)} className="group flex items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--campus-brand)_12%,white)] text-xs font-bold text-[var(--campus-brand)]">{initials(s.fullName)}</span>
                    <span>
                      <b className="block text-slate-900 group-hover:text-[var(--campus-brand)]">{s.fullName}</b>
                      <span className="block text-xs text-slate-500">{s.rollNo} · {s.email}</span>
                    </span>
                  </button>
                </td>
                <td className="text-slate-700">{s.band ? `Band ${s.band}` : "-"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${s.profileCompletion >= 90 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${s.profileCompletion}%` }} /></div>
                    <span className="text-xs font-semibold text-slate-600">{s.profileCompletion}%</span>
                  </div>
                </td>
                <td>{s.verification === "verified" ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}</td>
                <td><Badge tone={STATUS[s.testStatus][1]}>{STATUS[s.testStatus][0]}</Badge></td>
                <td className="font-bold text-slate-900">{s.percentage === null ? <span className="font-normal text-slate-400">-</span> : `${s.percentage}%`}</td>
                <td className="text-slate-700">{s.classesAttended} / {s.classesHeld}</td>
                <td className="pr-4 text-right">
                  {(s.flags.length > 0 || s.fairTestEvents > 0) && (
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100" onClick={() => onProctoring(s)}>
                      <ShieldAlert className="h-3.5 w-3.5" />{s.fairTestEvents} warning{s.fairTestEvents === 1 ? "" : "s"}{s.flags.length ? ", copy flag" : ""}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!students.length && <p className="py-8 text-center text-sm text-slate-500">No students match these filters.</p>}
      </div>
    </Panel>
  );
};

export default StudentsDirectory;
