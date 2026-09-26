import React, { useState, useEffect } from "react";
import { getAssessmentResults, reviewAssessmentSubmission } from "../../services/recruitmentService";
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Users,
  Calendar,
  AlertCircle,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const formatTime = (seconds) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const AssessmentScoreboard = ({ assessmentId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPass, setFilterPass] = useState("all"); // "all" | "passed" | "failed"
  const [sortBy, setSortBy] = useState("percentage"); // "percentage" | "submittedAt" | "timeTakenSeconds"
  const [sortDir, setSortDir] = useState("desc");
  const [reviewing, setReviewing] = useState(null);
  const [reviewScore, setReviewScore] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const loadData = () => {
    if (!assessmentId) return;
    setLoading(true);
    getAssessmentResults(assessmentId)
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch(() => setError("Failed to load candidate assessment results"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    if (!data?.submissions?.length) return;
    const headers = [
      "Candidate Name",
      "Email",
      "Score Percentage",
      "Points Earned",
      "Total Marks",
      "Result Status",
      "Time Taken",
      "Submitted At",
    ];
    const rows = data.submissions.map((s) => [
      `"${s.candidateId?.fullName || "Candidate"}"`,
      `"${s.candidateId?.email || "—"}"`,
      `${s.percentage}%`,
      s.score,
      s.totalPossibleScore,
      s.passed ? "Passed" : "Failed",
      formatTime(s.timeTakenSeconds),
      s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assessment_scoreboard_${assessmentId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submissions = data?.submissions || [];

  const saveReview = async () => {
    if (!reviewing) return;
    setSavingReview(true);
    try {
      await reviewAssessmentSubmission(reviewing._id, { score: Number(reviewScore), employerNotes: reviewNotes });
      setReviewing(null);
      setReviewScore("");
      setReviewNotes("");
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save assessment review");
    } finally {
      setSavingReview(false);
    }
  };

  // Filter & Sort
  const filteredSubmissions = submissions
    .filter((s) => {
      if (filterPass === "passed" && !s.passed) return false;
      if (filterPass === "failed" && s.passed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (s.candidateId?.fullName || "").toLowerCase();
        const email = (s.candidateId?.email || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === "submittedAt") {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalSubs = data?.summary?.totalSubmissions ?? submissions.length;
  const passedCount = data?.summary?.passedCount ?? submissions.filter((s) => s.passed).length;
  const passRate = data?.summary?.passRate ?? 0;
  const avgScore = data?.summary?.averageScore ?? 0;

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mb-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Assessments</span>
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {data?.assessment?.title || "Candidate Assessment Scoreboard"}
            </h2>
            {data?.assessment?.round && (
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                Round {data.assessment.round}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {data?.assessment?.jobId?.title
              ? `Linked Job: ${data.assessment.jobId.title}`
              : "General Candidate Evaluation"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh results"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={exportCSV}
            disabled={submissions.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {totalSubs}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total Candidates</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-emerald-600 leading-none">
              {passedCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Passed Cutoff</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-amber-600 leading-none">
              {passRate}%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Pass Ratio</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {avgScore}%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Average Score</div>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {["all", "passed", "failed"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterPass(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                  filterPass === f
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Candidate Results Table ───────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading candidate scores...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Candidate Submissions Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Candidates who take this assessment round will automatically appear on this scoreboard with real-time grading.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3.5 px-5">Candidate</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort("percentage")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Score / Performance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Points</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => handleSort("timeTakenSeconds")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Time Taken</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Integrity</th>
                  <th className="py-3.5 px-4 text-right">Review</th>
                  <th
                    className="py-3.5 px-5 cursor-pointer hover:text-slate-900 text-right"
                    onClick={() => handleSort("submittedAt")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Submitted Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub, idx) => {
                  const candidate = sub.candidateId || {};
                  const fullName = candidate.fullName || "Candidate";
                  const initial = fullName.charAt(0).toUpperCase();

                  return (
                    <tr key={sub._id || idx} className="hover:bg-slate-50/80 transition">
                      {/* Candidate Avatar & Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{fullName}</div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {candidate.email || "No email available"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score Percentage & Progress Bar */}
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-extrabold">
                            <span className={sub.reviewStatus === "PendingReview" ? "text-amber-600" : sub.passed ? "text-emerald-600" : "text-rose-600"}>
                              {sub.reviewStatus === "PendingReview" ? "Pending" : `${sub.percentage}%`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Cutoff: {data?.assessment?.passingScorePercentage || 70}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                sub.passed
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : "bg-gradient-to-r from-rose-500 to-red-400"
                              }`}
                              style={{ width: `${sub.reviewStatus === "PendingReview" ? 0 : Math.min(100, sub.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-4 font-bold text-slate-700">
                        {sub.score} / {sub.totalPossibleScore} pts
                      </td>

                      {/* Result Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            sub.reviewStatus === "PendingReview"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : sub.passed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {sub.reviewStatus === "PendingReview" ? (
                            <span>Awaiting review</span>
                          ) : sub.passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Passed</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Time Taken */}
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {formatTime(sub.timeTakenSeconds)}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${sub.integrityScore >= 80 ? "bg-emerald-50 text-emerald-700" : sub.integrityScore >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                          {sub.integrityScore ?? 100}%
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        {sub.reviewStatus === "PendingReview" ? (
                          <button onClick={() => { setReviewing(sub); setReviewScore(""); setReviewNotes(sub.employerNotes || ""); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white">Review</button>
                        ) : <span className="text-[11px] font-semibold text-slate-400">{sub.reviewStatus || "Evaluated"}</span>}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-5 text-right text-slate-500 text-[11px]">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Manual review</p><h3 className="mt-1 text-lg font-bold text-slate-950">{reviewing.candidateId?.fullName || "Candidate submission"}</h3></div><button onClick={() => setReviewing(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold">Close</button></div>
            <div className="mt-5 space-y-4">
              {(reviewing.codeSubmissions || []).map((item) => <div key={String(item.problemId)} className="rounded-xl border border-slate-200"><div className="flex justify-between border-b border-slate-200 px-4 py-2 text-xs font-bold"><span>{item.problemTitle}</span><span>{item.language}</span></div><pre className="max-h-72 overflow-auto whitespace-pre-wrap bg-slate-950 p-4 text-xs leading-5 text-slate-100">{item.code || "No code submitted"}</pre></div>)}
              {(reviewing.communicationResponses || []).map((item) => <div key={String(item.promptId)} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold text-slate-900">{item.promptText}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.responseText || "No response submitted"}</p></div>)}
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Score (max {reviewing.totalPossibleScore})<input type="number" min="0" max={reviewing.totalPossibleScore} value={reviewScore} onChange={(event) => setReviewScore(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label className="text-xs font-bold text-slate-700">Review notes<textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label></div>
              <button onClick={saveReview} disabled={savingReview || reviewScore === ""} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{savingReview ? "Saving…" : "Save evaluation"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentScoreboard;
