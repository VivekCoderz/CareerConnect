import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Code2, FileQuestion, Flag, Maximize, Mic2, Send, ShieldAlert } from "lucide-react";
import { startCandidateAssessment, submitCandidateAssessment } from "../../services/recruitmentService";

const newIntegrity = () => ({ proctorFlags: [], tabSwitchCount: 0, fullscreenExitCount: 0, focusLossCount: 0, copyPasteCount: 0 });

export default function CandidateAssessmentRoom() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!location.state?.session);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [codes, setCodes] = useState({});
  const [responses, setResponses] = useState({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(null);
  const integrityRef = useRef(newIntegrity());
  const submitRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (session) return;
    startCandidateAssessment(id).then(setSession).catch((err) => setError(err?.response?.data?.message || "Could not open assessment.")).finally(() => setLoading(false));
  }, [id, session]);

  const assessment = session?.assessment;
  const items = useMemo(() => assessment?.assessmentType === "MCQ" ? assessment.questions || [] : assessment?.assessmentType === "Coding" ? assessment.codingProblems || [] : assessment?.communicationPrompts || [], [assessment]);
  const current = items[index];

  const flag = useCallback((name, counter) => {
    const state = integrityRef.current;
    if (!state.proctorFlags.includes(name)) state.proctorFlags.push(name);
    if (counter) state[counter] += 1;
  }, []);

  useEffect(() => {
    if (!assessment?.enableProctoring || completed) return undefined;
    const visibility = () => { if (document.hidden && assessment.trackTabSwitches) flag("tab_switched", "tabSwitchCount"); };
    const fullscreen = () => { if (!document.fullscreenElement && assessment.enforceFullscreen) flag("fullscreen_exited", "fullscreenExitCount"); };
    const blur = () => flag("window_blurred", "focusLossCount");
    const clipboard = (event) => {
      if (!assessment.preventCopyPaste) return;
      event.preventDefault();
      flag(event.type === "copy" ? "copy_attempted" : "paste_attempted", "copyPasteCount");
    };
    const context = (event) => { if (assessment.preventCopyPaste) { event.preventDefault(); flag("context_menu_opened"); } };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    document.addEventListener("copy", clipboard);
    document.addEventListener("paste", clipboard);
    document.addEventListener("contextmenu", context);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      document.removeEventListener("copy", clipboard);
      document.removeEventListener("paste", clipboard);
      document.removeEventListener("contextmenu", context);
    };
  }, [assessment, completed, flag]);

  useEffect(() => {
    if (!session?.attempt?.expiresAt || completed) return undefined;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(session.attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !submittedRef.current) submitRef.current?.(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, completed]);

  useEffect(() => {
    const warn = (event) => { if (!completed && session) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [completed, session]);

  const submit = useCallback(async (autoSubmitted = false) => {
    if (!assessment || submitting || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        attemptId: session.attempt._id,
        autoSubmitted,
        ...integrityRef.current,
        answers: assessment.assessmentType === "MCQ" ? Object.entries(answers).map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer })) : [],
        codeSubmissions: assessment.assessmentType === "Coding" ? assessment.codingProblems.map((problem) => ({ problemId: problem._id, language: codes[problem._id]?.language || problem.defaultLanguage, code: codes[problem._id]?.code || problem.starterCode || "" })) : [],
        communicationResponses: assessment.assessmentType === "Communication" ? assessment.communicationPrompts.map((prompt) => ({ promptId: prompt._id, responseText: responses[prompt._id] || "" })) : [],
      };
      const result = await submitCandidateAssessment(id, payload);
      setCompleted(result);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    } catch (err) {
      submittedRef.current = false;
      setError(err?.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [answers, assessment, codes, id, responses, session, submitting]);
  submitRef.current = submit;

  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const answeredCount = assessment?.assessmentType === "MCQ" ? Object.keys(answers).length : assessment?.assessmentType === "Coding" ? Object.values(codes).filter((item) => item.code?.trim()).length : Object.values(responses).filter((value) => value.trim()).length;

  if (loading) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center">Preparing secure assessment room…</div>;
  if (error && !assessment) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center"><AlertTriangle className="mx-auto h-9 w-9 text-rose-500" /><p className="mt-3 text-sm text-rose-700">{error}</p><button onClick={() => navigate("/assessments")} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Back to assessments</button></div></div>;
  if (completed) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Submission received</h1><p className="mt-2 text-sm text-slate-600">{completed.message}</p>{completed.submission?.percentage !== undefined && <p className="mt-5 text-4xl font-black text-indigo-600">{completed.submission.percentage}%</p>}<button onClick={() => navigate("/assessments")} className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Return to assessments</button></div></div>;

  const Icon = assessment.assessmentType === "Coding" ? Code2 : assessment.assessmentType === "Communication" ? Mic2 : FileQuestion;
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0"><p className="truncate text-sm font-bold">{assessment.title}</p><p className="text-xs text-slate-400">Question {index + 1} of {items.length} · {answeredCount} answered</p></div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm font-bold ${secondsLeft < 300 ? "bg-rose-500 text-white" : "bg-slate-800"}`}><Clock3 className="h-4 w-4" /> {formatTime(secondsLeft)}</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:h-fit">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon className="h-4 w-4" /> {assessment.assessmentType}</div>
          <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-4">
            {items.map((item, itemIndex) => {
              const key = item._id;
              const done = assessment.assessmentType === "MCQ" ? answers[key] !== undefined : assessment.assessmentType === "Coding" ? Boolean(codes[key]?.code?.trim()) : Boolean(responses[key]?.trim());
              return <button key={key} onClick={() => setIndex(itemIndex)} className={`h-9 rounded-lg text-xs font-bold ${index === itemIndex ? "bg-indigo-600 text-white" : done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{itemIndex + 1}</button>;
            })}
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><div className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> Integrity monitoring</div><p className="mt-1 text-amber-800">Stay in this tab and fullscreen until submission.</p></div>
          {!document.fullscreenElement && <button onClick={() => document.documentElement.requestFullscreen?.()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><Maximize className="h-4 w-4" /> Enter fullscreen</button>}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          {assessment.assessmentType === "MCQ" && current && <div><div className="flex items-start gap-3"><span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{current.difficulty}</span><h1 className="text-lg font-bold leading-7 text-slate-950">{current.question}</h1></div><div className="mt-6 space-y-3">{current.options.map((option) => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${answers[current._id] === option ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="radio" name={current._id} checked={answers[current._id] === option} onChange={() => setAnswers((state) => ({ ...state, [current._id]: option }))} className="mt-0.5" /><span>{option}</span></label>)}</div></div>}

          {assessment.assessmentType === "Coding" && current && <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Coding problem · {current.difficulty}</p><h1 className="mt-1 text-xl font-bold text-slate-950">{current.title}</h1></div><select value={codes[current._id]?.language || current.defaultLanguage} onChange={(event) => setCodes((state) => ({ ...state, [current._id]: { code: state[current._id]?.code ?? current.starterCode, language: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">{current.supportedLanguages.map((language) => <option key={language}>{language}</option>)}</select></div><pre className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{current.problemStatement}</pre>{current.testCases?.length > 0 && <div className="mt-4 rounded-xl border border-slate-200 p-4 text-xs"><p className="font-bold text-slate-800">Sample inputs</p>{current.testCases.map((testCase, caseIndex) => <code key={testCase._id || caseIndex} className="mt-2 block rounded bg-slate-100 p-2">{testCase.input}</code>)}</div>}<textarea spellCheck={false} value={codes[current._id]?.code ?? current.starterCode ?? ""} onChange={(event) => setCodes((state) => ({ ...state, [current._id]: { language: state[current._id]?.language || current.defaultLanguage, code: event.target.value } }))} className="mt-5 min-h-[360px] w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500" /></div>}

          {assessment.assessmentType === "Communication" && current && <div><p className="text-xs font-bold uppercase tracking-wider text-amber-600">{current.category} prompt</p><h1 className="mt-2 text-xl font-bold leading-8 text-slate-950">{current.prompt}</h1>{current.description && <p className="mt-3 text-sm leading-6 text-slate-600">{current.description}</p>}<label className="mt-6 block text-sm font-bold text-slate-800">Your structured response</label><textarea value={responses[current._id] || ""} onChange={(event) => setResponses((state) => ({ ...state, [current._id]: event.target.value }))} maxLength={10000} placeholder="Write a clear response. Use examples and explain your reasoning…" className="mt-2 min-h-[260px] w-full rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></div>}

          {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><button onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><div className="flex gap-2">{index < items.length - 1 && <button onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Next <ChevronRight className="h-4 w-4" /></button>}<button onClick={() => { if (window.confirm(`Submit now? You answered ${answeredCount} of ${items.length} items.`)) submit(false); }} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit assessment"}</button></div></footer>
        </section>
      </div>
    </main>
  );
}
