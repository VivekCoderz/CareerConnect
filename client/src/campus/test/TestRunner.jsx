import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Maximize } from "lucide-react";
import { campusApi } from "../api";
import { useCampus } from "../useCampus";
import QuestionPanel from "./QuestionPanel";
import { isAnswered } from "./answers";
import useProctoring from "./useProctoring";
import { enterFullscreen, requestDevices, stopDevices } from "./devices";
import { Button, Notice } from "../components/ui";

// The test screen (PRD R9, R10). The server owns the clock and the attempt; this screen shows the
// time left, saves every answer as it changes and reports fair-test events.

const WRITE_DEBOUNCE_MS = 1200;
const RESYNC_MS = 60 * 1000;

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const TestRunner = ({ attempt, onFinished }) => {
  const { institution } = useCampus();
  const questions = attempt.questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a])));
  const [unsaved, setUnsaved] = useState({});
  const [left, setLeft] = useState(attempt.remainingSeconds);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const deadline = useRef(0);
  const writeTimers = useRef({});
  const finished = useRef(false);

  const finish = useCallback(async (reason) => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    await campusApi.post(`/attempts/${attempt.id}/submit`).catch(() => null);
    stopDevices();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onFinished(reason);
  }, [attempt.id, onFinished]);

  const { videoRef, warnings, lastWarning, clearWarning, inFullscreen, cameraOk, setCameraOk } = useProctoring({
    attemptId: attempt.id,
    active: !submitting,
    snapshotEverySeconds: attempt.snapshotEverySeconds,
    maxTabEvents: attempt.maxTabEvents,
    initialCount: attempt.countedEvents,
    onAutoSubmitted: () => finish("tab_switching"),
  });

  // Countdown, plus a check with the server every minute (time, and whether the test ended).
  useEffect(() => {
    deadline.current = Date.now() + attempt.remainingSeconds * 1000;
    const tick = setInterval(() => {
      const s = Math.max(0, Math.round((deadline.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) finish("time_up");
    }, 1000);
    const sync = setInterval(async () => {
      try {
        const res = await campusApi.get(`/attempts/${attempt.id}`);
        if (res.data.attempt.status !== "in_progress") finish(res.data.attempt.submitReason || "time_up");
        else deadline.current = Date.now() + res.data.attempt.remainingSeconds * 1000;
      } catch {
        // Offline for a moment: keep counting locally; answers retry below.
      }
    }, RESYNC_MS);
    return () => { clearInterval(tick); clearInterval(sync); };
  }, [attempt.id, attempt.remainingSeconds, finish]);

  const save = useCallback(async (questionId, body) => {
    try {
      await campusApi.put(`/attempts/${attempt.id}/answers/${questionId}`, body);
      setUnsaved((u) => { const next = { ...u }; delete next[questionId]; return next; });
    } catch (e) {
      if (e?.response?.data?.code === "ATTEMPT_CLOSED") finish("time_up");
      else setUnsaved((u) => ({ ...u, [questionId]: body }));
    }
  }, [attempt.id, finish]);

  // Retry answers that failed to save (for example during a network drop).
  useEffect(() => {
    const keys = Object.keys(unsaved);
    if (!keys.length) return undefined;
    const t = setTimeout(() => keys.forEach((k) => save(k, unsaved[k])), 5000);
    return () => clearTimeout(t);
  }, [unsaved, save]);

  const choose = (questionId, optionId) => {
    setAnswers((a) => ({ ...a, [questionId]: { ...a[questionId], questionId, optionId } }));
    save(questionId, { optionId });
  };
  const write = (questionId, text) => {
    setAnswers((a) => ({ ...a, [questionId]: { ...a[questionId], questionId, text } }));
    clearTimeout(writeTimers.current[questionId]);
    writeTimers.current[questionId] = setTimeout(() => save(questionId, { text }), WRITE_DEBOUNCE_MS);
  };
  const flushWrites = () => {
    Object.entries(writeTimers.current).forEach(([qid, t]) => {
      clearTimeout(t);
      if (answers[qid]?.text !== undefined) save(qid, { text: answers[qid].text });
    });
    writeTimers.current = {};
  };
  const audioSaved = (questionId) => setAnswers((a) => ({ ...a, [questionId]: { ...a[questionId], questionId, hasAudio: true } }));

  const go = (i) => { flushWrites(); setIndex(Math.max(0, Math.min(questions.length - 1, i))); };
  const unanswered = useMemo(() => questions.filter((q) => !isAnswered(q, answers[q.id])).length, [questions, answers]);
  const sectionTitle = (key) => attempt.sections.find((s) => s.key === key)?.title || key;
  const q = questions[index];

  const restoreCamera = async () => {
    try { await requestDevices(); setCameraOk(true); } catch { setCameraOk(false); }
  };

  return (
    <div className="min-h-screen select-none bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{institution?.shortName || institution?.name}</p>
            <p className="truncate text-xs text-slate-500">{attempt.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${left <= 300 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800"}`}>
              <Clock className="h-4 w-4" /> {clock(left)}
            </span>
            <span className={`hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:inline ${warnings ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
              Warnings {warnings} / {attempt.maxTabEvents}
            </span>
            <video ref={videoRef} autoPlay muted playsInline className="h-10 w-14 rounded-md bg-slate-200 object-cover" />
            <Button onClick={() => { flushWrites(); setConfirming(true); }} disabled={submitting}>Submit</Button>
          </div>
        </div>
      </header>

      {lastWarning && (
        <div className="mx-auto mt-3 max-w-6xl px-4">
          <Notice tone="amber">
            <span className="flex items-center justify-between gap-3">
              <span><AlertTriangle className="mr-1 inline h-4 w-4" />{lastWarning} Warning {warnings} of {attempt.maxTabEvents}: at {attempt.maxTabEvents} the test is submitted automatically.</span>
              <button type="button" className="text-xs font-semibold underline" onClick={clearWarning}>OK</button>
            </span>
          </Notice>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <main className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--campus-brand)]">{sectionTitle(q.section)}</p>
          <QuestionPanel attemptId={attempt.id} question={q} number={index + 1} total={questions.length} answer={answers[q.id]} onChoose={choose} onWrite={write} onAudioSaved={audioSaved} />
          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <span className="text-xs text-slate-500">{Object.keys(unsaved).length ? "Saving... (retrying)" : "All answers saved"}</span>
            <Button variant="secondary" onClick={() => go(index + 1)} disabled={index === questions.length - 1}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </main>
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-slate-900">Questions</p>
          {attempt.sections.map((s) => (
            <div key={s.key} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-500">{s.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((x, i) => (x.section !== s.key ? null : (
                  <button
                    type="button"
                    key={x.id}
                    onClick={() => go(i)}
                    className={`h-8 w-8 rounded-md text-xs font-bold ${i === index ? "ring-2 ring-[var(--campus-brand)]" : ""} ${isAnswered(x, answers[x.id]) ? "bg-[var(--campus-brand)] text-white" : "bg-slate-100 text-slate-700"}`}
                    aria-label={`Question ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                )))}
              </div>
            </div>
          ))}
          <p className="mt-2 text-xs text-slate-500">{questions.length - unanswered} of {questions.length} answered</p>
        </aside>
      </div>

      {!submitting && (!inFullscreen || !cameraOk) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="max-w-md rounded-2xl bg-white p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
            <p className="mt-3 text-base font-bold text-slate-900">{!cameraOk ? "Your camera is off" : "The test needs full screen"}</p>
            <p className="mt-1 text-sm text-slate-600">The timer is still running. Return to continue your test.</p>
            {!cameraOk
              ? <Button className="mt-4" onClick={restoreCamera}>Turn camera back on</Button>
              : <Button className="mt-4" onClick={enterFullscreen}><Maximize className="h-4 w-4" /> Return to full screen</Button>}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-w-md rounded-2xl bg-white p-6">
            <p className="text-lg font-bold text-slate-900">Submit your test?</p>
            <p className="mt-2 text-sm text-slate-600">
              {unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} not answered. ` : "All questions are answered. "}
              You cannot change your answers after submitting.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirming(false)}>Back to test</Button>
              <Button onClick={() => finish("student")} disabled={submitting}>Submit test</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestRunner;
