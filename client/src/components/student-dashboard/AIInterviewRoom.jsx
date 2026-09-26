import { useEffect, useMemo, useRef, useState } from "react";
import recruitmentService from "../../services/recruitmentService";

const AIInterviewRoom = ({ interview, onClose, onCompleted }) => {
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const questions = useMemo(() => session?.questions || [], [session?.questions]);
  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((question) => String(answers[question._id] || "").trim()),
    [answers, questions]
  );

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const start = async () => {
    if (!consent) return setError("Please accept the AI interview consent before continuing.");
    try {
      setLoading(true);
      setError("");
      const result = await recruitmentService.startAiInterview(interview._id, true);
      setSession(result);
      const restored = {};
      (result.answers || []).forEach((item) => { restored[item.questionId] = item.answer; });
      setAnswers(restored);
      const firstMissing = (result.questions || []).findIndex((question) => !restored[question._id]);
      setCurrentIndex(firstMissing >= 0 ? firstMissing : 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not start the AI interview.");
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAnswer = async () => {
    const answer = String(answers[currentQuestion?._id] || "").trim();
    if (!answer) throw new Error("Please provide an answer before continuing.");
    setSaving(true);
    try {
      await recruitmentService.saveAiInterviewAnswer(interview._id, currentQuestion._id, answer);
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    try {
      setError("");
      await saveCurrentAnswer();
      setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not save your answer.");
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      await saveCurrentAnswer();
      const result = await recruitmentService.completeAiInterview(interview._id);
      setSession((value) => ({ ...value, completed: true, result }));
      onCompleted?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Evaluation could not be completed. Your answers are saved; please retry.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice dictation is not supported in this browser. You can type your answer instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).slice(event.resultIndex).map((result) => result[0].transcript).join(" ");
      setAnswers((current) => ({
        ...current,
        [currentQuestion._id]: `${current[currentQuestion._id] || ""} ${transcript}`.trim(),
      }));
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Voice dictation stopped. Your captured text is preserved.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20">
        <div className="p-5 bg-gradient-to-r from-violet-800 to-indigo-800 text-white flex justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-200">CareerConnect AI Interview</p>
            <h2 className="text-xl font-extrabold mt-1">{interview.roundName || interview.title}</h2>
            <p className="text-xs text-violet-100 mt-1">Responses are evaluated against job-related criteria and reviewed by HR.</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 font-bold">✕</button>
        </div>

        {!session ? (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
              <p className="font-bold text-slate-900">Before you begin</p>
              <p>Use your own words. Do not include confidential personal information. Voice dictation is optional and processed by your browser; typed answers always remain available.</p>
              <p>The AI score is advisory. The employer or HR team can review and override the final hiring decision.</p>
            </div>
            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
              <span>I consent to my answers being stored and evaluated by AI for this recruitment process.</span>
            </label>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            <button type="button" disabled={loading || !consent} onClick={start} className="w-full py-3 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-bold">
              {loading ? "Preparing your interview…" : "Start AI Interview"}
            </button>
          </div>
        ) : session.completed ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-3xl">✓</div>
            <h3 className="text-xl font-extrabold text-slate-900">Interview submitted successfully</h3>
            <p className="text-sm text-slate-600">Your scorecard and feedback have been sent to the employer for HR review.</p>
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold">Close</button>
          </div>
        ) : (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div>
              <span className="text-xs font-bold text-slate-500">{currentIndex + 1}/{questions.length}</span>
            </div>
            <div>
              <div className="flex gap-2 mb-2">
                <span className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-[10px] font-bold">{currentQuestion?.competency}</span>
                <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold capitalize">{currentQuestion?.difficulty}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-relaxed">{currentQuestion?.prompt}</h3>
            </div>
            <textarea
              rows={9}
              maxLength={6000}
              value={answers[currentQuestion?._id] || ""}
              onChange={(event) => setAnswers((current) => ({ ...current, [currentQuestion._id]: event.target.value }))}
              placeholder="Type a clear, specific answer. Include your approach, decisions, and measurable result where relevant."
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={toggleDictation} className={`px-3 py-2 rounded-xl border text-xs font-bold ${listening ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-slate-200 text-slate-700"}`}>
                {listening ? "■ Stop dictation" : "🎙 Use voice dictation"}
              </button>
              <span className="text-[11px] text-slate-400">{String(answers[currentQuestion?._id] || "").length}/6000</span>
            </div>
            {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
            <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
              <button type="button" disabled={currentIndex === 0 || saving} onClick={() => setCurrentIndex((index) => index - 1)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-40">Previous</button>
              {currentIndex < questions.length - 1 ? (
                <button type="button" disabled={saving} onClick={next} className="px-5 py-2.5 rounded-xl bg-violet-700 text-white font-bold disabled:opacity-50">{saving ? "Saving…" : "Save & Next"}</button>
              ) : (
                <button type="button" disabled={loading || saving || !allAnswered} onClick={submit} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">{loading ? "Evaluating…" : "Submit Interview"}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInterviewRoom;
