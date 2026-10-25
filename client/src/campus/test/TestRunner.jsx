import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Bookmark, Eraser, Maximize } from "lucide-react";
import { campusApi } from "../api";
import { useCampus } from "../useCampus";
import QuestionPanel from "./QuestionPanel";
import Palette from "./Palette";
import SubmitDialog from "./SubmitDialog";
import TestHeader from "./TestHeader";
import { isAnswered } from "./answers";
import { countBy, statusOf } from "./status";
import useProctoring from "./useProctoring";
import { enterFullscreen, requestDevices, stopDevices } from "./devices";
import { Button, Notice } from "../components/ui";

// The test screen (PRD R9, R10). The server owns the clock and the attempt; this screen shows the
// time left, saves every answer and bookmark as it changes and reports fair-test events.

const WRITE_DEBOUNCE_MS = 1200;
const RESYNC_MS = 60 * 1000;

const TestRunner = ({ attempt, onFinished }) => {
  const { institution } = useCampus();
  const questions = attempt.questions;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a])));
  const [bookmarks, setBookmarks] = useState(() => new Set(attempt.bookmarks || []));
  const [visited, setVisited] = useState(() => new Set([questions[0]?.id, ...(attempt.answers || []).map((a) => a.questionId), ...(attempt.bookmarks || [])]));
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [unsaved, setUnsaved] = useState({});
  const [left, setLeft] = useState(attempt.remainingSeconds);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const deadline = useRef(0);
  const writeTimers = useRef({});
  const finished = useRef(false);

  const [submitError, setSubmitError] = useState("");
  const finish = useCallback(async (reason) => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    try {
      await campusApi.post(`/attempts/${attempt.id}/submit`);
    } catch (e) {
      // The server refuses a student's submit while a compulsory question is blank.
      if (reason === "student" && e?.response?.data?.code === "COMPULSORY_MISSING") {
        finished.current = false;
        setSubmitting(false);
        setSubmitError(e.response.data.message);
        return;
      }
    }
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

  const setBookmark = (questionId, on) => {
    setBookmarks((b) => { const next = new Set(b); if (on) next.add(questionId); else next.delete(questionId); return next; });
    campusApi.put(`/attempts/${attempt.id}/bookmarks/${questionId}`, { bookmarked: on }).catch(() => {
      // A lost bookmark is only a reminder; the answer itself is saved separately.
    });
  };

  const go = (i) => {
    flushWrites();
    const next = Math.max(0, Math.min(questions.length - 1, i));
    setVisited((v) => new Set(v).add(questions[next].id));
    setIndex(next);
  };

  const statuses = useMemo(
    () => Object.fromEntries(questions.map((x) => [x.id, statusOf(x, answers[x.id], bookmarks.has(x.id), visited.has(x.id))])),
    [questions, answers, bookmarks, visited]
  );
  const counts = useMemo(() => countBy(statuses), [statuses]);
  const missingCompulsory = useMemo(
    () => questions.map((x, i) => ({ x, i })).filter(({ x }) => x.compulsory && !isAnswered(x, answers[x.id])),
    [questions, answers]
  );
  const sectionTitle = (key) => attempt.sections.find((s) => s.key === key)?.title || key;
  const q = questions[index];
  const last = index === questions.length - 1;

  const restoreCamera = async () => {
    try { await requestDevices(); setCameraOk(true); } catch { setCameraOk(false); }
  };

  return (
    <div className="min-h-screen select-none bg-slate-100">
      <TestHeader
        institution={institution}
        title={attempt.title}
        left={left}
        total={attempt.timeLimitSeconds || attempt.remainingSeconds}
        warnings={warnings}
        maxWarnings={attempt.maxTabEvents}
        saving={Object.keys(unsaved).length > 0}
        onSubmit={() => { flushWrites(); setConfirming(true); }}
        submitting={submitting}
      />

      {lastWarning && (
        <div className="mx-auto mt-3 max-w-[1400px] px-4">
          <Notice tone="amber">
            <span className="flex items-center justify-between gap-3">
              <span><AlertTriangle className="mr-1 inline h-4 w-4" />{lastWarning} Warning {warnings} of {attempt.maxTabEvents}: at {attempt.maxTabEvents} the test is submitted automatically.</span>
              <button type="button" className="text-xs font-semibold underline" onClick={clearWarning}>OK</button>
            </span>
          </Notice>
        </div>
      )}

      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 py-5 lg:grid-cols-[1fr_340px]">
        <main className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-108px)]">
          <div className="h-1 overflow-hidden rounded-t-2xl bg-slate-100">
            <div className="h-full bg-[var(--campus-brand)] transition-all duration-500" style={{ width: `${((counts.answered + counts.answered_review) / questions.length) * 100}%` }} />
          </div>
          <div className="flex-1 p-5 sm:p-8 lg:overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
                <QuestionPanel
                  attemptId={attempt.id}
                  question={q}
                  number={index + 1}
                  total={questions.length}
                  sectionTitle={sectionTitle(q.section)}
                  answer={answers[q.id]}
                  bookmarked={bookmarks.has(q.id)}
                  onBookmark={() => setBookmark(q.id, !bookmarks.has(q.id))}
                  onChoose={choose}
                  onWrite={write}
                  onAudioSaved={audioSaved}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-8">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft className="h-4 w-4" /> Previous</Button>
              {q.type === "mcq" && answers[q.id]?.optionId && (
                <Button variant="ghost" onClick={() => choose(q.id, null)}><Eraser className="h-4 w-4" /> Clear response</Button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setBookmark(q.id, true); if (!last) go(index + 1); }}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
              >
                <Bookmark className="h-4 w-4" /> Bookmark{last ? "" : " and next"}
              </button>
              {last ? (
                <Button onClick={() => { flushWrites(); setConfirming(true); }}>Review and submit</Button>
              ) : (
                <Button onClick={() => go(index + 1)}>Save and next <ArrowRight className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </main>
        <Palette
          videoRef={videoRef}
          cameraOk={cameraOk}
          sections={attempt.sections}
          questions={questions}
          statuses={statuses}
          counts={counts}
          index={index}
          onGo={go}
          bookmarkedOnly={bookmarkedOnly}
          setBookmarkedOnly={setBookmarkedOnly}
        />
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
        <SubmitDialog
          counts={counts}
          total={questions.length}
          missingCompulsory={missingCompulsory}
          onGo={(i) => { setConfirming(false); go(i); }}
          onCancel={() => { setConfirming(false); setSubmitError(""); }}
          onSubmit={() => finish("student")}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
};

export default TestRunner;
