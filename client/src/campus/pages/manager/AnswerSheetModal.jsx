import { useEffect, useState } from "react";
import { Bookmark, CheckCircle2, MinusCircle, X, XCircle } from "lucide-react";
import { campusApi, errorMessage } from "../../api";
import { Badge, Notice, Spinner } from "../../components/ui";

// One student's answer sheet: every question in paper order with their answer, the key for
// multiple choice, the written answer, the speaking recording, and the marks.
const LETTERS = "ABCDEF";

const Verdict = ({ q }) => {
  if (!q.answered) return <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MinusCircle className="h-4 w-4" />Skipped</span>;
  if (q.correct === true) return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Correct</span>;
  if (q.correct === false) return <span className="flex items-center gap-1 text-xs font-semibold text-rose-700"><XCircle className="h-4 w-4" />Wrong</span>;
  return <span className="text-xs font-semibold text-slate-600">Answered</span>;
};

const markText = (m) => (!m ? "-" : m.status === "done" ? `${m.score} / ${m.max}` : m.status === "failed" ? "To mark by hand" : "Being marked");

const AnswerSheetModal = ({ memberId, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState("");
  useEffect(() => {
    campusApi.get(`/manager/attempts/${memberId}/answers`).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [memberId]);

  const shown = data ? data.questions.filter((q) => !section || q.section === section) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <p className="text-lg font-extrabold text-slate-900">{data?.student?.fullName || "Answer sheet"}</p>
            {data && <p className="text-sm text-slate-500">{data.student.rollNo} · Score {data.attempt.total} / {data.attempt.max} · {data.attempt.released ? "Published" : "Not published yet"}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-5">
          {error && <Notice tone="red">{error}</Notice>}
          {!data && !error && <Spinner />}
          {data && (
            <>
              <div className="mb-5 grid gap-2 sm:grid-cols-3">
                {data.sections.map((s) => (
                  <button key={s.key} type="button" onClick={() => setSection(section === s.title ? "" : s.title)}
                    className={`rounded-xl border p-3 text-left transition ${section === s.title ? "border-[var(--campus-brand)] ring-1 ring-[var(--campus-brand)]" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="text-xs font-bold text-slate-900">{s.title}</p>
                    <p className="mt-1 text-lg font-extrabold text-slate-900">{s.score} <span className="text-xs font-semibold text-slate-500">/ {s.max}</span></p>
                    <p className="text-[11px] text-slate-500">{s.attempted} attempted · {s.mcq ? `${s.correct} right · ${s.wrong} wrong · ` : ""}{s.skipped} skipped</p>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {shown.map((q) => (
                  <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>Q {q.number}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{q.section}</span>
                      {q.compulsory && <Badge tone="amber">Compulsory</Badge>}
                      {q.bookmarked && <span className="flex items-center gap-1 text-xs text-violet-700"><Bookmark className="h-3 w-3" />Bookmarked</span>}
                      <span className="ml-auto flex items-center gap-3"><Verdict q={q} /><b className="text-sm text-slate-900">{markText(q.mark)}</b></span>
                    </div>
                    {q.context && <pre className="mb-2 overflow-x-auto whitespace-pre rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700">{q.context}</pre>}
                    <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
                    {q.type === "mcq" && (
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((o, i) => {
                          const chosen = q.chosenOptionId === o.id;
                          const key = q.correctOptionId === o.id;
                          return (
                            <div key={o.id} className={`rounded-lg border px-3 py-1.5 text-sm ${key ? "border-emerald-300 bg-emerald-50 text-emerald-900" : chosen ? "border-rose-300 bg-rose-50 text-rose-900" : "border-slate-200 text-slate-700"}`}>
                              <b>{LETTERS[i]}.</b> {o.text}{chosen && <span className="ml-1 text-xs font-bold">(chosen)</span>}{key && <span className="ml-1 text-xs font-bold">(answer)</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "written" && <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{q.answerText || "No answer."}</p>}
                    {q.type === "speaking" && (q.audioUrl ? <audio controls src={q.audioUrl} className="mt-2 w-full" /> : <p className="mt-2 text-sm text-slate-500">No recording.</p>)}
                    {q.mark?.reason && q.type !== "mcq" && <p className="mt-2 text-xs text-slate-500">Marking note: {q.mark.reason}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnswerSheetModal;
