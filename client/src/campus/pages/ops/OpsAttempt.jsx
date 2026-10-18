import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { campusApi, errorMessage } from "../../api";
import Layout from "../../components/Layout";
import { Badge, Button, Card, Notice, Spinner } from "../../components/ui";
import { formatDateTime, inputClass } from "../../format";

// One attempt in review: written and speaking answers with their marks, which a reviewer can
// change with a note; fair-test events and camera photos (PRD R10, R11).
const SOURCE = { ai: "AI", reviewer: "Reviewer", key: "Auto" };

const MarkEditor = ({ attemptId, question, onSaved }) => {
  const [score, setScore] = useState(question.mark?.score ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    try {
      await campusApi.patch(`/ops/attempts/${attemptId}/marks/${question.id}`, { score: Number(score), note });
      setNote("");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-slate-600">Score (0 to {question.points})
        <input type="number" min="0" max={question.points} className={`${inputClass} mt-1 w-24`} value={score} onChange={(e) => setScore(e.target.value)} />
      </label>
      <input className={`${inputClass} flex-1`} placeholder="Note (why this mark)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button onClick={save} disabled={score === ""}>Save mark</Button>
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
};

const OpsAttempt = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    campusApi.get(`/ops/attempts/${id}`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const a = data?.attempt;
  return (
    <Layout wide>
      <Link to="/ops/review" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Back to review</Link>
      {error && <div className="mt-4"><Notice tone="red">{error}</Notice></div>}
      {!data && !error && <Spinner />}
      {data && (
        <div className="mt-4 space-y-6">
          <Card title={data.student?.fullName} action={<span className="text-lg font-extrabold">{a.scores.total} / {a.scores.max}</span>}>
            <p className="text-sm text-slate-600">
              {data.student?.rollNo} · {data.student?.email} · started {formatDateTime(a.startedAt)} · {a.status === "in_progress" ? "in progress" : `submitted ${formatDateTime(a.submittedAt)} (${a.submitReason.replace("_", " ")})`}
            </p>
            <p className="mt-1 text-sm text-slate-600">Multiple choice: {data.mcq.score} marks (checked against the answer key)</p>
            {a.flags.some((f) => f.startsWith("possible_copy")) && <div className="mt-3"><Notice tone="amber">Possible copying: {a.flags.filter((f) => f.startsWith("possible_copy")).map((f) => f.split(":")[1]).join(", ")} is very similar to another student's answer.</Notice></div>}
          </Card>

          {data.questions.map((q) => (
            <Card key={q.id} title={`${q.type === "speaking" ? "Speaking" : "Written"} · ${q.id.toUpperCase()}`}
              action={q.mark ? <Badge tone={q.mark.status === "done" ? "green" : q.mark.status === "failed" ? "red" : "amber"}>{q.mark.status === "done" ? `${q.mark.score} / ${q.points} (${SOURCE[q.mark.source]})` : q.mark.status === "failed" ? "AI failed: mark by hand" : "Pending"}</Badge> : null}>
              <p className="text-sm font-semibold text-slate-800">{q.prompt}</p>
              <details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Marking scheme</summary><pre className="mt-2 whitespace-pre-wrap font-sans">{q.rubric}</pre></details>
              {q.type === "written" && (
                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{q.answerText || <i className="text-slate-400">No answer</i>}</div>
              )}
              {q.type === "speaking" && (q.audioUrl ? <audio controls src={q.audioUrl} className="mt-3 w-full" /> : <p className="mt-3 text-sm italic text-slate-400">No recording</p>)}
              {q.mark?.reason && <p className="mt-2 text-xs text-slate-600"><b>Reason:</b> {q.mark.reason}</p>}
              {a.status !== "in_progress" && <MarkEditor attemptId={a.id} question={q} onSaved={load} />}
            </Card>
          ))}

          <Card title={`Fair-test record (${a.events.filter((e) => e.counted).length} warnings)`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {a.snapshots.map((s) => (
                <figure key={s.at} className="overflow-hidden rounded-lg border border-slate-200">
                  {s.url ? <img src={s.url} alt={`Photo at ${formatDateTime(s.at)}`} className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-slate-100" />}
                  <figcaption className="px-2 py-1 text-xs text-slate-500">{formatDateTime(s.at)}</figcaption>
                </figure>
              ))}
            </div>
            {!a.snapshots.length && <p className="text-sm text-slate-500">No camera photos.</p>}
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {a.events.map((e) => <li key={`${e.type}${e.at}`} className="flex justify-between py-1.5"><span>{e.type.replace("_", " ")}{e.counted ? " (warning)" : ""}</span><span className="text-slate-500">{formatDateTime(e.at)}</span></li>)}
            </ul>
            {a.changes.length > 0 && (
              <div className="mt-4 text-xs text-slate-600"><b>Mark changes:</b>{a.changes.map((c) => <p key={`${c.questionId}${c.at}`}>{c.questionId.toUpperCase()}: {c.from ?? "-"} to {c.to} on {formatDateTime(c.at)}{c.note ? ` (${c.note})` : ""}</p>)}</div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default OpsAttempt;
