import React, { useState } from "react";
import { Video, MapPin, Phone, Calendar, Clock, ExternalLink, X, RotateCw } from "lucide-react";
import { formatScheduleDateTime } from "./constants";

const UpcomingInterviews = ({
  interviews = [],
  loading = false,
  onJoinMeeting,
  onReschedule,
  onCancel,
}) => {
  const [interviewToCancel, setInterviewToCancel] = useState(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-36 h-4 bg-slate-100 rounded" />
          <div className="w-16 h-3 bg-slate-100 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 border border-slate-100 rounded-xl space-y-2.5 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-14 h-4 rounded-full bg-slate-100" />
              </div>
              <div className="w-36 h-3 bg-slate-100 rounded" />
              <div className="w-28 h-3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Exact empty state copy per Section 6
  if (!interviews || interviews.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Upcoming Interviews</h2>
        </div>
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-2.5">
            <Calendar className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold text-slate-800">No upcoming interviews</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Scheduled interviews will appear here.</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "phone":
        return <Phone className="w-3.5 h-3.5" aria-hidden="true" />;
      case "onsite":
        return <MapPin className="w-3.5 h-3.5" aria-hidden="true" />;
      default:
        return <Video className="w-3.5 h-3.5" aria-hidden="true" />;
    }
  };

  const handleConfirmCancel = () => {
    if (interviewToCancel && onCancel) {
      onCancel(interviewToCancel);
    }
    setInterviewToCancel(null);
  };

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Upcoming Interviews</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {interviews.length}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {interviews.slice(0, 5).map((interview) => {
            const hasMeetingUrl = Boolean(interview.meetingUrl && interview.meetingUrl.trim());

            return (
              <div
                key={interview.id}
                className="p-3.5 rounded-xl border border-slate-200/90 hover:border-amber-200 bg-white hover:bg-slate-50/50 transition duration-150 space-y-2.5"
              >
                {/* Header: Candidate & Interview Mode */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      {interview.candidateName || "Candidate"}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 line-clamp-1">
                      {interview.jobTitle || "Position"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 text-slate-700 border border-slate-200">
                    {getTypeIcon(interview.type)}
                    <span>{interview.type || "video"}</span>
                  </span>
                </div>

                {/* Schedule & Duration */}
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                    {formatScheduleDateTime(interview.scheduledAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    {interview.durationMin || 45}m
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onReschedule && onReschedule(interview)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-amber-800 transition flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterviewToCancel(interview)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                      <span>Cancel</span>
                    </button>
                  </div>

                  {hasMeetingUrl ? (
                    <a
                      href={interview.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-2xs transition"
                    >
                      <span>Join</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Cancel */}
      {interviewToCancel && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-interview-title"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h3 id="cancel-interview-title" className="text-sm font-bold text-slate-900">
              Cancel Interview
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel the interview with{" "}
              <strong className="text-slate-900">{interviewToCancel.candidateName}</strong>? The candidate will be notified.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInterviewToCancel(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Keep Interview
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpcomingInterviews;
