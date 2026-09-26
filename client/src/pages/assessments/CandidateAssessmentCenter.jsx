import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, CalendarClock, CheckCircle2, Clock3, Code2, FileQuestion, Mic2, RefreshCw, ShieldCheck } from "lucide-react";
import { getCandidateAssessments, startCandidateAssessment } from "../../services/recruitmentService";

const typeIcon = { MCQ: FileQuestion, Coding: Code2, Communication: Mic2 };

export default function CandidateAssessmentCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getCandidateAssessments();
      setItems(result.assessments || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load your assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const start = async (assessment) => {
    setStartingId(assessment._id);
    setError("");
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      const session = await startCandidateAssessment(assessment._id);
      navigate(`/assessments/${assessment._id}`, { state: { session } });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not start this assessment.");
      setStartingId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Candidate workspace</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">My assessments</h1>
              <p className="mt-1 text-sm text-slate-500">Complete assessments assigned to jobs you have applied for.</p>
            </div>
            <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Assessments run inside CareerConnect. During an active attempt, leaving fullscreen, switching tabs, losing focus, and copy/paste attempts may be recorded for employer review.</p>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading assessments…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 font-bold text-slate-900">You are all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">New assessments will appear here when an employer assigns them to an application.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const Icon = typeIcon[item.assessmentType] || FileQuestion;
              const latest = item.latestSubmission;
              const completed = latest && latest.reviewStatus !== "InProgress";
              const attemptsLeft = Math.max(0, item.maxAttempts - item.attemptsUsed);
              return (
                <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"><Icon className="h-5 w-5" /></div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Round {item.round}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || "Follow the instructions shown before you begin."}</p>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {item.jobId?.title || "General assessment"}</p>
                    <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {item.timeLimitMinutes} minutes · {item.assessmentType}</p>
                    {item.deadline && <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Due {new Date(item.deadline).toLocaleString()}</p>}
                  </div>

                  {latest && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
                      <span className="font-bold text-slate-800">
                        {latest.reviewStatus === "InProgress" ? "Attempt in progress" : latest.reviewStatus === "PendingReview" ? "Submitted · awaiting review" : latest.passed === true ? "Passed" : latest.passed === false ? "Completed" : "Evaluated"}
                      </span>
                      {latest.percentage !== null && latest.percentage !== undefined && <span className="ml-2 text-slate-500">{latest.percentage}%</span>}
                    </div>
                  )}

                  <button
                    onClick={() => start(item)}
                    disabled={!item.available || attemptsLeft === 0 || (completed && attemptsLeft === 0) || startingId === item._id}
                    className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {startingId === item._id ? "Preparing secure room…" : latest?.reviewStatus === "InProgress" ? "Resume attempt" : attemptsLeft > 0 ? (item.attemptsUsed ? `Retake · ${attemptsLeft} left` : "Start assessment") : "No attempts remaining"}
                  </button>
                  {!item.available && <p className="mt-2 text-center text-xs font-medium text-amber-700">{item.unavailableReason}</p>}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
