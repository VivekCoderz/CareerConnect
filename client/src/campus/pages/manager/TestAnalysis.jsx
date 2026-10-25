import { useCallback, useEffect, useState } from "react";
import { FileSearch, Send } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import { Badge, Button, Card, Notice, Spinner } from "../../components/ui";
import { formatDateTime } from "../../format";
import AnswerSheetModal from "./AnswerSheetModal";

// Test analysis for the university: publish panel, section-wise counts, and each student's
// section breakdown with their answer sheet. Includes tests not yet published.
const Bar = ({ value }) => (
  <div className="h-1.5 w-full rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-[var(--campus-brand)]" style={{ width: `${value || 0}%` }} /></div>
);

// Short column labels: initials for a name of several words (Business Awareness: BA).
const short = (title) => {
  const words = title.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map((w) => w[0].toUpperCase()).join("") : title;
};

const stateOf = (st) => (st.released ? "published" : st.pendingMarks ? "marking" : "ready");
const FILTERS = [["all", "All"], ["ready", "Ready to publish"], ["marking", "Being marked"], ["published", "Published"]];
const STATE_BADGE = { published: ["green", "Published"], ready: ["blue", "Ready to publish"], marking: ["amber", "Being marked"] };

/** Students with their score, each section (score, right, wrong, skipped) and the answer sheet. */
const StudentsTable = ({ rows, sections, onSheet }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[960px] text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500">
          <th className="py-2">Student</th><th>Score</th>
          {sections.map((s) => <th key={s.key} className="px-1 text-center" title={s.title}>{short(s.title)}</th>)}
          <th>Status</th><th />
        </tr>
      </thead>
      <tbody>
        {rows.map((st) => {
          const [tone, label] = STATE_BADGE[stateOf(st)];
          return (
            <tr key={st.memberId} className="border-t border-slate-100">
              <td className="py-2"><b className="text-slate-900">{st.fullName}</b><span className="block text-xs text-slate-500">{st.rollNo}{st.submittedAt ? ` · ${formatDateTime(st.submittedAt)}` : ""}</span></td>
              <td className="font-bold">{st.total}<span className="text-xs font-normal text-slate-500">/{st.max}</span></td>
              {st.sections.map((s) => (
                <td key={s.key} className="px-1 text-center" title={`${s.title}: ${s.attempted} attempted, ${s.correct} correct, ${s.wrong} wrong, ${s.skipped} skipped`}>
                  <span className="block font-semibold text-slate-900">{s.score}/{s.max}</span>
                  <span className="block text-[10px] text-slate-500">{s.mcq ? `${s.correct}✓ ${s.wrong}✗ ` : ""}{s.skipped ? `${s.skipped} skip` : ""}</span>
                </td>
              ))}
              <td><Badge tone={tone}>{label}</Badge></td>
              <td className="text-right">
                <button type="button" onClick={() => onSheet(st.memberId)} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--campus-brand)] hover:underline"><FileSearch className="h-4 w-4" />Answer sheet</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {!rows.length && <p className="py-6 text-center text-sm text-slate-500">No students here.</p>}
  </div>
);

const TestAnalysis = ({ onPublished }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheetOf, setSheetOf] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    campusApi.get("/manager/analysis").then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!window.confirm(`Publish results for ${data.publish.toRelease} student(s)? They will see their scores right away.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await campusApi.post("/manager/publish", { assessmentId: data.assessment.id });
      setMessage({ tone: "green", text: `Results published for ${r.data.attempts} student(s).${r.data.inProgress ? ` ${r.data.inProgress} test(s) still in progress will need another publish.` : ""}` });
      load();
      onPublished?.();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Notice tone="red">{error}</Notice>;
  if (!data) return <Spinner />;
  if (!data.assessment) return <p className="text-sm text-slate-500">No test yet.</p>;
  const { publish: p, sections, students } = data;
  const waiting = students.filter((st) => !st.released);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-base font-bold text-slate-900">Results: {data.assessment.title} ({data.assessment.totalMarks} marks)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{p.submitted} submitted</Badge>
            <Badge tone="green">{p.released} published</Badge>
            {p.toRelease > 0 && <Badge tone="blue">{p.toRelease} ready to publish</Badge>}
            {p.pendingMarking > 0 && <Badge tone="amber">{p.pendingMarking} still being marked</Badge>}
            {p.inProgress > 0 && <Badge>{p.inProgress} taking the test now</Badge>}
          </div>
          {p.pendingMarking > 0 && <p className="mt-2 text-xs text-slate-500">Publishing opens once every written and speaking answer is marked.</p>}
        </div>
        <Button onClick={publish} disabled={busy || !p.toRelease}><Send className="h-4 w-4" />{p.toRelease ? `Publish ${p.toRelease} result${p.toRelease === 1 ? "" : "s"}` : "Nothing to publish"}</Button>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {waiting.length > 0 && (
        <Card title={`Waiting to be published (${waiting.length})`}>
          <p className="mb-4 text-sm text-slate-600">
            These students have submitted but cannot see their result yet. Open an answer sheet to check a test before publishing.
            {p.pendingMarking > 0 && " Tests marked \"Being marked\" still need the assessment team to mark written or speaking answers."}
          </p>
          <StudentsTable rows={waiting} sections={sections} onSheet={setSheetOf} />
        </Card>
      )}

      <Card title="Section-wise analysis">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Section</th><th>Questions</th><th>Avg attempted</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Accuracy (MCQ)</th><th className="w-48">Average score</th></tr></thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.key} className="border-t border-slate-100">
                  <td className="py-2.5 font-semibold text-slate-900">{s.title}</td>
                  <td>{s.questions}</td>
                  <td>{s.avgAttempted} <span className="text-xs text-slate-500">({s.attemptRate ?? "-"}%)</span></td>
                  <td className="text-emerald-700">{s.correct}</td>
                  <td className="text-rose-700">{s.wrong}</td>
                  <td className="text-slate-500">{s.skipped}</td>
                  <td>{s.accuracy === null ? "-" : `${s.accuracy}%`}</td>
                  <td><div className="flex items-center gap-2"><Bar value={s.averagePercentage} /><span className="w-12 text-right text-xs font-semibold">{s.averagePercentage ?? "-"}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Counts add up every submitted test. Correct and wrong apply to multiple choice; written and speaking count as attempted.</p>
      </Card>

      <Card title={`Students (${students.length} submitted)`}>
        <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              {label} ({students.filter((st) => key === "all" || stateOf(st) === key).length})
            </button>
          ))}
        </div>
        <StudentsTable rows={students.filter((st) => filter === "all" || stateOf(st) === filter)} sections={sections} onSheet={setSheetOf} />
        <p className="mt-3 text-xs text-slate-500">
          {sections.filter((s) => short(s.title) !== s.title).map((s) => `${short(s.title)}: ${s.title}`).join(" · ")}. Under each score: right (✓), wrong (✗) and skipped questions.
        </p>
      </Card>
      {sheetOf && <AnswerSheetModal memberId={sheetOf} onClose={() => setSheetOf(null)} />}
    </div>
  );
};

export default TestAnalysis;
