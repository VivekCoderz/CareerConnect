import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { campusApi, errorMessage } from "../../api";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Field, Notice, Spinner } from "../../components/ui";
import { formatDateTime, inputClass } from "../../format";

// Review before publishing (PRD R11): pending and flagged attempts first, then Publish.
const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

const OpsReview = () => {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState({ id: "", data: null });
  const [schedule, setSchedule] = useState({ opensAt: "", closesAt: "" });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    campusApi.get("/ops/assessments").then((r) => {
      setAssessments(r.data.assessments);
      const first = r.data.assessments[0];
      if (first) {
        setSelected(String(first.id));
        setSchedule({ opensAt: toLocalInput(first.opensAt), closesAt: toLocalInput(first.closesAt) });
      }
    }).catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, []);

  const load = useCallback(() => {
    if (!selected) return;
    campusApi.get(`/ops/assessments/${selected}/review`)
      .then((r) => setLoaded({ id: selected, data: r.data }))
      .catch((e) => setMessage({ tone: "red", text: errorMessage(e) }));
  }, [selected]);
  useEffect(() => { load(); }, [load]);
  const review = loaded.id === selected ? loaded.data : null;

  const choose = (id) => {
    setSelected(id);
    const a = assessments.find((x) => String(x.id) === id);
    if (a) setSchedule({ opensAt: toLocalInput(a.opensAt), closesAt: toLocalInput(a.closesAt) });
  };

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await campusApi.post(`/ops/assessments/${selected}/publish`);
      const later = r.data.inProgress ? ` ${r.data.inProgress} test(s) still in progress will need another publish.` : "";
      setMessage({ tone: "green", text: `Results published for ${r.data.attempts} students.${later}` });
      load();
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    setMessage(null);
    try {
      await campusApi.patch(`/ops/assessments/${selected}`, { opensAt: new Date(schedule.opensAt), closesAt: new Date(schedule.closesAt) });
      setMessage({ tone: "green", text: "Schedule saved." });
    } catch (e) {
      setMessage({ tone: "red", text: errorMessage(e) });
    }
  };

  return (
    <Layout wide>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Review and publish</h1>
      {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <Card>
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
          <Field label="Assessment">
            <select className={inputClass} value={selected} onChange={(e) => choose(e.target.value)}>
              {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </Field>
          <Field label="Opens (your time)"><input type="datetime-local" className={inputClass} value={schedule.opensAt} onChange={(e) => setSchedule({ ...schedule, opensAt: e.target.value })} /></Field>
          <Field label="Closes (your time)"><input type="datetime-local" className={inputClass} value={schedule.closesAt} onChange={(e) => setSchedule({ ...schedule, closesAt: e.target.value })} /></Field>
          <Button variant="secondary" onClick={saveSchedule} disabled={!selected}>Save schedule</Button>
        </div>
      </Card>

      {!review && selected && <Spinner />}
      {review && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge>{review.summary.attempts} attempts</Badge>
              <Badge tone="blue">{review.summary.inProgress} in progress</Badge>
              <Badge tone="amber">{review.summary.needsAttention} need marking</Badge>
              <Badge tone="red">{review.summary.flagged} flagged</Badge>
              {review.assessment.resultsPublishedAt && <Badge tone="green">Published {formatDateTime(review.assessment.resultsPublishedAt)}</Badge>}
            </div>
            <Button onClick={publish} disabled={busy || review.summary.needsAttention > 0 || !review.summary.toRelease}>
              {review.summary.toRelease ? `Publish ${review.summary.toRelease} result${review.summary.toRelease === 1 ? "" : "s"}` : "Nothing new to publish"}
            </Button>
          </div>
          {review.summary.needsAttention > 0 && (
            <Notice tone="amber">Publishing opens once every speaking answer and failed AI mark has been marked.</Notice>
          )}
          {review.summary.needsAttention === 0 && review.summary.inProgress > 0 && (
            <Notice tone="blue">{review.summary.inProgress} test(s) are still in progress. They are not included and will need another publish.</Notice>
          )}
          <Card title="Attempts">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">Student</th><th>Status</th><th>Score</th><th>Needs</th><th>Fair test</th><th /></tr></thead>
                <tbody>
                  {review.attempts.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-2"><b className="text-slate-900">{a.student?.fullName}</b><span className="block text-xs text-slate-500">{a.student?.rollNo}</span></td>
                      <td>{a.status === "in_progress" ? <Badge tone="blue">In progress</Badge> : <Badge tone={a.status === "auto_submitted" ? "amber" : "green"}>{a.status === "auto_submitted" ? `Auto (${a.submitReason.replace("_", " ")})` : "Submitted"}</Badge>}</td>
                      <td>{a.total} / {a.max}</td>
                      <td>{a.pending.length ? a.pending.map((p) => <Badge key={p.questionId} tone="amber">{p.status === "failed" ? "AI failed" : p.source === "reviewer" ? "Speaking" : "AI pending"}</Badge>) : <span className="text-slate-400">-</span>}</td>
                      <td>{a.countedEvents ? `${a.countedEvents} warnings` : ""}{a.flags.length ? " · copy flag" : ""}{!a.countedEvents && !a.flags.length ? <span className="text-slate-400">-</span> : ""}</td>
                      <td className="text-right"><Link to={`/ops/attempts/${a.id}`} className="text-sm font-semibold text-[var(--campus-brand)]">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!review.attempts.length && <p className="py-6 text-center text-sm text-slate-500">No attempts yet.</p>}
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default OpsReview;
