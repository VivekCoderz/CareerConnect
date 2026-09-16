import React, { useState } from "react";

const CANCELLATION_REASONS = [
  "Interviewer unavailable",
  "Scheduling conflict",
  "Position on hold",
  "Candidate requested cancellation",
  "Other",
];

const InterviewCancelModal = ({
  isOpen,
  onClose,
  interview,
  onConfirmCancel,
  loading = false,
}) => {
  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen || !interview) return null;

  const candidateName =
    interview.candidateId?.fullName ||
    interview.candidateName ||
    interview.applicationId?.studentName ||
    "Candidate";

  const positionTitle =
    interview.jobId?.title ||
    interview.internshipId?.title ||
    interview.applicationId?.opportunityTitle ||
    "Position";

  const scheduledDate = interview.scheduledDate || "Date TBD";
  const scheduledTime = interview.scheduledTime || interview.startTime || "Time TBD";

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = reason === "Other" && customReason.trim() ? customReason.trim() : reason;
    onConfirmCancel({
      cancellationReason: finalReason,
      cancellationMessage: message.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg font-black shadow-2xs">
              ✕
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Cancel Interview Slot?</h3>
              <p className="text-[11.5px] text-slate-500 font-medium">
                This action cancels the schedule but preserves the candidate as Shortlisted.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Summary Card */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Candidate:</span>
              <strong className="text-slate-900 font-bold text-sm">{candidateName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Position:</span>
              <span className="font-semibold text-slate-800">{positionTitle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Scheduled Slot:</span>
              <span className="font-mono font-bold text-slate-800">
                📅 {scheduledDate} • {scheduledTime}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Interview Round:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10.5px]">
                {interview.roundName || `Round ${interview.roundNumber}`}
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Select Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 cursor-pointer"
              required
            >
              {CANCELLATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Reason if "Other" selected */}
          {reason === "Other" && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="block text-xs font-bold text-slate-800">
                Specify Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific cancellation reason..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-rose-500"
                required
              />
            </div>
          )}

          {/* Additional Notes / Candidate Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Additional Message / Candidate Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide context or guidance for the candidate (e.g. Our team will reach out with new slots soon)..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-medium outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Alert Notice */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            ⚠️ <strong>Candidate Notification:</strong> An automatic in-app notification will be delivered to the candidate. The slot will be removed from their upcoming interviews and archived into history.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Keep Interview
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Cancelling...</span>
              ) : (
                <>
                  <span>✕</span>
                  <span>Cancel Interview</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewCancelModal;
