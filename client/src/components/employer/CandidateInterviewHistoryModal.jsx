import React, { useState, useEffect } from "react";
import recruitmentService from "../../services/recruitmentService";

const CandidateInterviewHistoryModal = ({
  isOpen,
  onClose,
  candidate,
  onScheduleNextRound,
}) => {
  const [historyData, setHistoryData] = useState({ rounds: [], cumulativeScore: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const candidateId = candidate?._id || candidate?.candidateId?._id || "";
  const candidateName = candidate?.fullName || candidate?.candidateId?.fullName || "Candidate";

  useEffect(() => {
    if (isOpen && candidateId) {
      fetchHistory();
    }
  }, [isOpen, candidateId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await recruitmentService.getCandidateInterviewHistory(candidateId);
      if (res.success) {
        setHistoryData(res);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load candidate interview history");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const rounds = historyData.rounds || [];
  const cumulativeScore = historyData.cumulativeScore || "0.0";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center text-lg font-black">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Multi-Round Interview History</h3>
              <p className="text-xs text-slate-500">Candidate: <strong className="text-slate-800">{candidateName}</strong></p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Cumulative Score Summary Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-50 to-purple-50 border border-blue-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block">
                Cumulative Multi-Round Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-slate-900 font-mono">{cumulativeScore}</span>
                <span className="text-xs font-bold text-slate-500">/ 5.0</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {rounds.length} {rounds.length === 1 ? "Round" : "Rounds"} Completed / Scheduled
                </span>
              </div>
            </div>

            {onScheduleNextRound && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScheduleNextRound(candidate);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
              >
                + Schedule Next Round
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Loading interview rounds...
            </div>
          ) : rounds.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No interview rounds recorded for this candidate.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {rounds.map((round) => {
                const isCompleted = round.status === "Completed";
                const feedback = round.feedback || {};
                const ratings = feedback.ratings || {};

                return (
                  <div key={round._id} className="relative group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 shadow-xs ${
                      isCompleted ? "border-emerald-500" : "border-blue-500"
                    }`} />

                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-white border border-slate-200 text-slate-900">
                            Round {round.roundNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{round.roundName}</span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                          {round.status}
                        </span>
                      </div>

                      {/* Date & Interviewer info */}
                      <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                        <span>📅 {round.scheduledDate} at {round.scheduledTime}</span>
                        <span>•</span>
                        <span>👤 Interviewer: <strong className="text-slate-700">{round.interviewerName}</strong></span>
                      </div>

                      {/* If completed, show scorecard breakdown */}
                      {isCompleted && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800">Round Verdict & Score</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-700 font-mono">
                                ★ {feedback.overallScore || "0"}/5.0
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white">
                                {feedback.recommendation || "Completed"}
                              </span>
                            </div>
                          </div>

                          {/* 5-Criteria Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Technical:</span>
                              <span className="font-bold text-slate-800">{ratings.technicalSkills || 0}/5</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Problem Solving:</span>
                              <span className="font-bold text-slate-800">{ratings.problemSolving || 0}/5</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Communication:</span>
                              <span className="font-bold text-slate-800">{ratings.communication || 0}/5</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">System Design:</span>
                              <span className="font-bold text-slate-800">{ratings.systemDesign || 0}/5</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-400 block text-[10px]">Culture Fit:</span>
                              <span className="font-bold text-slate-800">{ratings.cultureFit || 0}/5</span>
                            </div>
                          </div>

                          {/* Strengths & Comments */}
                          {feedback.strengths && (
                            <p className="text-[11.5px] text-slate-600">
                              <strong className="text-slate-800">Strengths:</strong> {feedback.strengths}
                            </p>
                          )}
                          {feedback.comments && (
                            <p className="text-[11.5px] text-slate-600 italic">
                              "{feedback.comments}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidateInterviewHistoryModal;
