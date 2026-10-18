import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { campusApi, downloadFile, errorMessage } from "../../api";
import { useCampus } from "../../useCampus";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Notice, Spinner } from "../../components/ui";
import { BAND_LABEL, inputClass } from "../../format";
import ProctoringModal from "./ProctoringModal";

// University dashboard (PRD R14): students by band, results after publishing, attendance,
// and the four downloads. Numbers come from the same server data as the downloads.

const STATUS = {
  not_started: ["Not started", "slate"],
  in_progress: ["In progress", "blue"],
  submitted: ["Submitted", "green"],
  auto_submitted: ["Auto-submitted", "amber"],
};

const REPORTS = [
  ["results.xlsx", "Results (Excel)"],
  ["summary.pdf", "Batch summary (PDF)"],
  ["scorecards.pdf", "Scorecards (PDF)"],
  ["attendance.xlsx", "Attendance (Excel)"],
];

const Stat = ({ label, value, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

const ManagerDashboard = () => {
  const { institution } = useCampus();
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ band: "", status: "", search: "" });
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [proctoring, setProctoring] = useState(null);

  useEffect(() => {
    campusApi.get("/manager/overview").then((r) => setSummary(r.data.summary)).catch((e) => setError(errorMessage(e)));
  }, []);

  const loadStudents = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    campusApi.get("/manager/students", { params }).then((r) => setStudents(r.data.students)).catch((e) => setError(errorMessage(e)));
  }, [filters]);
  useEffect(() => { const t = setTimeout(loadStudents, 250); return () => clearTimeout(t); }, [loadStudents]);

  const download = async (name) => {
    setDownloading(name);
    try {
      await downloadFile(`/manager/reports/${name}`, `${institution?.slug || "campus"}-${name}`);
    } catch (e) {
      setError(errorMessage(e, "The download failed. Please try again."));
    } finally {
      setDownloading("");
    }
  };

  const submitted = (summary?.status?.submitted || 0) + (summary?.status?.auto_submitted || 0);
  return (
    <Layout wide>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">University dashboard</h1>
          <p className="text-sm text-slate-600">{summary?.assessment?.title || "No assessment yet"} {summary && !summary.published && <Badge tone="amber">Results not published yet</Badge>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {REPORTS.map(([name, label]) => (
            <Button key={name} variant="secondary" onClick={() => download(name)} disabled={downloading === name}>
              <Download className="h-4 w-4" /> {downloading === name ? "Preparing..." : label}
            </Button>
          ))}
        </div>
      </div>
      {error && <div className="mb-4"><Notice tone="red">{error}</Notice></div>}
      {!summary && !error && <Spinner />}
      {summary && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Students" value={summary.students} hint={`${summary.verified} details verified`} />
            <Stat label="Submitted" value={submitted} hint={`${summary.status.not_started || 0} not started`} />
            <Stat label="Flagged tests" value={summary.flagged} hint="Fair-test warnings or copying" />
            <Stat label="Training attendance" value={summary.attendanceRate === null ? "-" : `${summary.attendanceRate}%`} />
            <Stat label="Results" value={summary.published ? "Published" : "Pending"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="By CGPA band" className="lg:col-span-2">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Band</th><th>Students</th><th>Submitted</th><th>Average score</th></tr></thead>
                <tbody>
                  {summary.byBand.map((b) => (
                    <tr key={b.band} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-800">{BAND_LABEL[b.band]}</td>
                      <td>{b.students}</td><td>{b.submitted}</td><td>{b.averagePercentage === null ? "-" : `${b.averagePercentage}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Top performers">
              {summary.top.length ? (
                <ol className="space-y-1.5 text-sm">{summary.top.map((t, i) => <li key={t.rollNo || t.fullName}><b>{i + 1}.</b> {t.fullName} <span className="text-slate-500">{t.percentage}%</span></li>)}</ol>
              ) : <p className="text-sm text-slate-500">Shown after results are published.</p>}
            </Card>
          </div>

          {summary.published && (
            <Card title="Average by section">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.sections.map((s) => (
                  <div key={s.key}>
                    <div className="flex justify-between text-sm"><span className="font-semibold text-slate-800">{s.title}</span><span>{s.averagePercentage ?? "-"}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[var(--campus-brand)]" style={{ width: `${s.averagePercentage || 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Students">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <input className={inputClass} placeholder="Search name, email or roll number" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Student</th><th>Band</th><th>Details</th><th>Test</th><th>Score</th><th>Classes</th><th /></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.memberId} className="border-t border-slate-100">
                      <td className="py-2"><b className="text-slate-900">{s.fullName}</b><span className="block text-xs text-slate-500">{s.rollNo} · {s.email}</span></td>
                      <td>{s.band ? `Band ${s.band}` : "-"}</td>
                      <td>{s.verification === "verified" ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}</td>
                      <td><Badge tone={STATUS[s.testStatus][1]}>{STATUS[s.testStatus][0]}</Badge></td>
                      <td>{s.percentage === null ? "-" : `${s.percentage}%`}</td>
                      <td>{s.classesAttended} / {s.classesHeld}</td>
                      <td className="text-right">
                        {(s.flags.length > 0 || s.fairTestEvents > 0) && (
                          <button type="button" className="text-xs font-semibold text-amber-700 underline" onClick={() => setProctoring(s)}>
                            {s.fairTestEvents} warning{s.fairTestEvents === 1 ? "" : "s"}{s.flags.length ? ", copy flag" : ""}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!students.length && <p className="py-6 text-center text-sm text-slate-500">No students match these filters.</p>}
            </div>
          </Card>
        </div>
      )}
      {proctoring && <ProctoringModal student={proctoring} onClose={() => setProctoring(null)} />}
    </Layout>
  );
};

export default ManagerDashboard;
