import React, { useState, useEffect } from "react";
import recruitmentService from "../../services/recruitmentService";

const InterviewDetailsModal = ({
  isOpen,
  onClose,
  interviewId,
  onReschedule,
  onCancel,
  onScorecard,
  onMakeOffer,
  onRefresh,
}) => {
  const [interview, setInterview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && interviewId) {
      loadDetails();
    }
  }, [isOpen, interviewId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await recruitmentService.getInterviewById(interviewId);
      if (res.success && res.interview) {
        setInterview(res.interview);
        setTimeline(res.roundTimeline || []);
      } else {
        throw new Error(res.message || "Failed to load interview details");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to fetch interview details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const candidate = interview?.candidateId;
  const application = interview?.applicationId;
  const jobOrInternship = interview?.jobId || interview?.internshipId;
  const isInternship = Boolean(interview?.internshipId || application?.opportunityType === "Internship");

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "scheduled":
        return { label: "Scheduled", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: "📅" };
      case "completed":
        return { label: "Completed", bg: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✓" };
      case "rescheduled":
        return { label: "Rescheduled", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: "🔄" };
      case "cancelled":
        return { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: "✕" };
      default:
        return { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200", icon: "📌" };
    }
  };

  const getResultBadge = (result) => {
    const r = (result || "").toLowerCase();
    switch (r) {
      case "passed":
        return { label: "Passed Round ✓", bg: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" };
      case "failed":
        return { label: "Failed Round ✕", bg: "bg-rose-100 text-rose-800 border-rose-300 font-bold" };
      default:
        return { label: "Pending Evaluation", bg: "bg-amber-50 text-amber-800 border-amber-200 font-medium" };
    }
  };

  const statusBadge = getStatusBadge(interview?.status);
  const resultBadge = getResultBadge(interview?.result);
  const isCompleted = (interview?.status || "").toLowerCase() === "completed";
  const isCancelled = (interview?.status || "").toLowerCase() === "cancelled";
  const isPassed = (interview?.result || "").toLowerCase() === "passed";
  const resumeUrl = application?.resumeUrl || candidate?.resumeUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-slide-in-top my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center text-lg font-black">
              📋
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Interview Session Dossier
              </h3>
              <p className="text-xs text-slate-500">
                Application #{application?._id?.slice(-6) || "ID"} · Round {interview?.roundNumber || 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadge.bg}`}>
              <span>{statusBadge.icon}</span>
              <span>{statusBadge.label}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading interview details...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              ⚠️ {error}
            </div>
          ) : (
            <>
              {/* Section 1: Candidate Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {candidate?.profileImage ? (
                    <img
                      src={candidate.profileImage}
                      alt={candidate.fullName}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                      {(candidate?.fullName || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900">
                        {candidate?.fullName || application?.studentName || "Candidate"}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {candidate?.userType || "Student"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-medium">
                      <span>📧 {candidate?.email || application?.studentEmail}</span>
                      {candidate?.phone || application?.studentPhone ? (
                        <span>📞 {candidate?.phone || application?.studentPhone}</span>
                      ) : null}
                      {candidate?.location ? (
                        <span>📍 {candidate.location}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {resumeUrl && (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 shrink-0"
                  >
                    <span>📄</span>
                    <span>View Resume ↗</span>
                  </a>
                )}
              </div>

              {/* Section 2: Opportunity & Position Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Position Applied For
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {isInternship ? "Internship" : "Job Role"}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 truncate">
                      {jobOrInternship?.title || application?.opportunityTitle || "Role"}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-500">
                    {jobOrInternship?.department || "Technology"} · {jobOrInternship?.location || "Remote"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Application Lifecycle Status
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                      {application?.status || "In Review"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Applied on {application?.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : "Recently"}
                    </span>
                  </div>
                  {application?.status === "Selected" && (
                    <p className="text-[11px] font-bold text-emerald-700 mt-1">
                      ✨ Candidate selected and ready for Offer Letter.
                    </p>
                  )}
                </div>
              </div>

              {/* Section 3: Interview Schedule & Access */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100/80 pb-3">
                  <div>
                    <span className="text-[10.5px] font-bold text-blue-900 uppercase tracking-wider block">
                      {interview?.roundName || `Round ${interview?.roundNumber || 1}`}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {interview?.title || "Technical Interview Session"}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${resultBadge.bg}`}>
                    {resultBadge.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10.5px] text-slate-500 block">Date</span>
                    <strong className="text-slate-800">{interview?.scheduledDate || "TBD"}</strong>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-500 block">Time Slot</span>
                    <strong className="text-slate-800">{interview?.startTime || interview?.scheduledTime || "11:00 AM"}</strong>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-500 block">Duration</span>
                    <strong className="text-slate-800">{interview?.duration || 45} Minutes</strong>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-slate-500 block">Interviewer</span>
                    <strong className="text-slate-800">{interview?.interviewerName || "Hiring Lead"}</strong>
                  </div>
                </div>

                {/* Online Link or Physical Location */}
                <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-600">Mode: </span>
                    <strong className="text-slate-900">{interview?.interviewType || "Online"}</strong>
                    {interview?.location && (
                      <span className="text-slate-500 ml-2">({interview.location})</span>
                    )}
                  </div>

                  {interview?.meetingLink && (
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>📹</span>
                      <span>Join Live Meeting ↗</span>
                    </a>
                  )}
                </div>

                {interview?.instructions && (
                  <div className="p-3 bg-white rounded-xl border border-blue-100 text-xs text-slate-700">
                    <strong className="text-slate-900">Preparation Instructions: </strong>
                    {interview.instructions}
                  </div>
                )}

                {interview?.cancellationReason && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                    <strong>Cancellation Reason: </strong>
                    {interview.cancellationReason}
                  </div>
                )}

                {interview?.rescheduledReason && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-800">
                    <strong>Reschedule Note: </strong>
                    {interview.rescheduledReason}
                  </div>
                )}
              </div>

              {/* Section 4: Scorecard Evaluation (If submitted) */}
              {isCompleted && interview?.scorecard && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📊</span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Interviewer Scorecard & Evaluation
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Overall Composite Score:</span>
                      <span className="text-base font-mono font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        {interview.scorecard.overallScore || 0} / 5.0
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Technical Skills</span>
                      <strong className="text-slate-900 font-mono text-sm">{interview.scorecard.technicalSkills || 0}/5</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Problem Solving</span>
                      <strong className="text-slate-900 font-mono text-sm">{interview.scorecard.problemSolving || 0}/5</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Communication</span>
                      <strong className="text-slate-900 font-mono text-sm">{interview.scorecard.communication || 0}/5</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Role Knowledge</span>
                      <strong className="text-slate-900 font-mono text-sm">{interview.scorecard.roleKnowledge || 0}/5</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Culture Fit</span>
                      <strong className="text-slate-900 font-mono text-sm">{interview.scorecard.cultureFit || 0}/5</strong>
                    </div>
                  </div>

                  {interview.scorecard.recommendation && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">Hiring Recommendation:</span>
                      <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {interview.scorecard.recommendation}
                      </span>
                    </div>
                  )}

                  {interview.scorecard.strengths && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <strong className="text-slate-900 block mb-0.5">Key Strengths:</strong>
                      <p className="text-slate-700">{interview.scorecard.strengths}</p>
                    </div>
                  )}

                  {interview.scorecard.areasForImprovement && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <strong className="text-slate-900 block mb-0.5">Areas for Improvement:</strong>
                      <p className="text-slate-700">{interview.scorecard.areasForImprovement}</p>
                    </div>
                  )}

                  {interview.scorecard.feedback && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <strong className="text-slate-900 block mb-0.5">General Feedback:</strong>
                      <p className="text-slate-700">{interview.scorecard.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Section 5: Multi-Round Timeline */}
              {timeline.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Application Interview Progression ({timeline.length} {timeline.length === 1 ? "Round" : "Rounds"})
                  </h4>

                  <div className="space-y-2">
                    {timeline.map((round) => (
                      <div
                        key={round._id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                          round._id === interview._id
                            ? "bg-blue-50/80 border-blue-200 font-bold"
                            : "bg-slate-50/60 border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700">
                            {round.roundNumber}
                          </span>
                          <div>
                            <span className="text-slate-900">{round.roundName || `Round ${round.roundNumber}`}</span>
                            <span className="text-[11px] text-slate-500 ml-2">({round.scheduledDate || "TBD"})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            (round.status || "").toLowerCase() === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : (round.status || "").toLowerCase() === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {round.status}
                          </span>
                          {round.result && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              round.result.toLowerCase() === "passed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {round.result.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Cancel Action */}
            {!isCompleted && !isCancelled && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCancel?.(interview);
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
              >
                Cancel Interview
              </button>
            )}

            {/* Reschedule Action */}
            {!isCompleted && !isCancelled && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReschedule?.(interview);
                }}
                className="px-3.5 py-2 rounded-xl border border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold transition"
              >
                🔄 Reschedule
              </button>
            )}

            {/* Scorecard Action */}
            {!isCancelled && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onScorecard?.(interview);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
              >
                {isCompleted ? "Edit Scorecard ★" : "Submit Scorecard ★"}
              </button>
            )}

            {/* Select Candidate for Offer */}
            {isPassed && onMakeOffer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMakeOffer?.(application || candidate);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                🎉 Select & Prepare Offer Letter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDetailsModal;
