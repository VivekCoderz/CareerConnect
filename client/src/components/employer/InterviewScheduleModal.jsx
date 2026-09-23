import React, { useState, useEffect } from "react";
import recruitmentService from "../../services/recruitmentService";

const ROUND_OPTIONS = [
  "Technical Interview",
  "Coding Round",
  "HR Interview",
  "Aptitude Round",
  "Managerial Round",
  "Final Interview",
  "Other",
];

const InterviewScheduleModal = ({
  isOpen,
  onClose,
  onSchedule,
  onReschedule,
  candidate = null,
  interviewToReschedule = null,
  jobs = [],
}) => {
  const isRescheduling = Boolean(interviewToReschedule);
  const today = new Date().toISOString().split("T")[0];

  const [eligibleCandidates, setEligibleCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateItem, setSelectedCandidateItem] = useState(null);

  const [formData, setFormData] = useState({
    candidateId: "",
    jobId: "",
    internshipId: "",
    applicationId: "",
    roundNumber: 1,
    interviewRound: "Technical Interview",
    customRoundName: "",
    roundName: "Technical Interview",
    title: "Technical Interview",
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    startTime: "11:00 AM",
    duration: 45,
    interviewMode: "Online", // "Online" | "Offline"
    meetingLink: "https://meet.google.com/new",
    location: "",
    interviewerName: "",
    interviewerEmail: "",
    instructions: "Please be ready 5 minutes early in a quiet room with a stable internet connection and webcam on.",
    notes: "",
    rescheduledReason: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load eligible candidates if employer opens modal without a pre-set candidate
  useEffect(() => {
    if (isOpen && !candidate && !interviewToReschedule) {
      let isMounted = true;
      setLoadingCandidates(true);
      recruitmentService
        .getEligibleCandidates()
        .then((res) => {
          if (!isMounted) return;
          const list = res.candidates || res.data || [];
          setEligibleCandidates(list);
          if (list.length > 0) {
            handleCandidateSelect(list[0]);
          }
        })
        .catch((err) => {
          console.error("Failed to load eligible candidates:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingCandidates(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, candidate, interviewToReschedule]);

  const handleCandidateSelect = (item) => {
    if (!item) return;
    setSelectedCandidateItem(item);
    const nextRound = item.nextRoundNumber || 1;

    setFormData((prev) => ({
      ...prev,
      candidateId: item.candidateId?._id || item.candidateId || item.candidate?._id || "",
      applicationId: item.applicationId || item._id || "",
      jobId: item.jobId?._id || item.jobId || "",
      internshipId: item.internshipId?._id || item.internshipId || "",
      roundNumber: nextRound,
    }));
  };

  useEffect(() => {
    if (interviewToReschedule) {
      const mode = interviewToReschedule.meetingMode === "Offline" || interviewToReschedule.interviewType === "Offline" ? "Offline" : "Online";
      const round = ROUND_OPTIONS.includes(interviewToReschedule.roundName)
        ? interviewToReschedule.roundName
        : "Other";

      setFormData({
        candidateId: interviewToReschedule.candidateId?._id || interviewToReschedule.candidateId || "",
        jobId: interviewToReschedule.jobId?._id || interviewToReschedule.jobId || "",
        internshipId: interviewToReschedule.internshipId?._id || interviewToReschedule.internshipId || "",
        applicationId: interviewToReschedule.applicationId?._id || interviewToReschedule.applicationId || "",
        roundNumber: interviewToReschedule.roundNumber || 1,
        interviewRound: round,
        customRoundName: round === "Other" ? (interviewToReschedule.roundName || "") : "",
        roundName: interviewToReschedule.roundName || "Technical Interview",
        title: interviewToReschedule.title || "",
        scheduledDate: interviewToReschedule.scheduledDate || today,
        startTime: interviewToReschedule.startTime || interviewToReschedule.scheduledTime || "11:00 AM",
        duration: interviewToReschedule.duration || interviewToReschedule.durationMinutes || 45,
        interviewMode: mode,
        meetingLink: interviewToReschedule.meetingLink || "",
        location: interviewToReschedule.location || "",
        interviewerName: interviewToReschedule.interviewerName || "",
        interviewerEmail: interviewToReschedule.interviewerEmail || "",
        instructions: interviewToReschedule.instructions || interviewToReschedule.preparationGuidelines || "",
        notes: interviewToReschedule.notes || "",
        rescheduledReason: "",
      });
    } else if (candidate) {
      const targetCandId =
        candidate.candidateId?._id ||
        candidate.candidateId ||
        (candidate.role || candidate.userType ? candidate._id : "") ||
        "";
      const targetAppId = candidate.applicationId || (candidate.appliedAt || candidate.status ? candidate._id : "");
      const targetJobId = candidate.jobId?._id || candidate.jobId || "";
      const targetInternshipId = candidate.internshipId?._id || candidate.internshipId || "";

      setFormData((prev) => ({
        ...prev,
        candidateId: targetCandId,
        applicationId: targetAppId,
        jobId: targetJobId,
        internshipId: targetInternshipId,
      }));
    }
  }, [candidate, interviewToReschedule, today]);

  if (!isOpen) return null;

  const candName =
    interviewToReschedule?.candidateId?.fullName ||
    candidate?.studentName ||
    candidate?.candidateId?.fullName ||
    candidate?.fullName ||
    selectedCandidateItem?.candidateName ||
    selectedCandidateItem?.candidate?.fullName ||
    selectedCandidateItem?.candidateId?.fullName ||
    "Select Candidate";

  const targetRoleTitle =
    interviewToReschedule?.jobId?.title ||
    interviewToReschedule?.internshipId?.title ||
    candidate?.opportunityTitle ||
    candidate?.jobId?.title ||
    candidate?.internshipId?.title ||
    selectedCandidateItem?.opportunityTitle ||
    "Selected Position";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "interviewRound") {
        updated.roundName = value === "Other" ? (prev.customRoundName || "Custom Interview Round") : value;
      }
      if (name === "customRoundName" && prev.interviewRound === "Other") {
        updated.roundName = value || "Custom Interview Round";
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validations
    if (!isRescheduling && !formData.applicationId && !candidate) {
      setError("Please select a candidate and associated application.");
      return;
    }

    if (!formData.scheduledDate) {
      setError("Interview date is required.");
      return;
    }

    if (formData.scheduledDate < today) {
      setError("Interview date cannot be in the past.");
      return;
    }

    if (!formData.startTime || !formData.startTime.trim()) {
      setError("Start time is required.");
      return;
    }

    if (!formData.interviewerName || !formData.interviewerName.trim()) {
      setError("Interviewer name is required.");
      return;
    }

    const finalRoundName =
      formData.interviewRound === "Other"
        ? formData.customRoundName.trim() || "Custom Round"
        : formData.interviewRound;

    if (!finalRoundName) {
      setError("Interview round is required.");
      return;
    }

    if (formData.interviewMode === "Online" && (!formData.meetingLink || !formData.meetingLink.trim())) {
      setError("Meeting link is required for Online interviews.");
      return;
    }

    if (formData.interviewMode === "Offline" && (!formData.location || !formData.location.trim())) {
      setError("Location is required for Offline interviews.");
      return;
    }

    try {
      setSaving(true);

      if (isRescheduling && onReschedule) {
        await onReschedule(interviewToReschedule._id, {
          scheduledDate: formData.scheduledDate,
          startTime: formData.startTime,
          scheduledTime: formData.startTime,
          duration: Number(formData.duration) || 45,
          durationMinutes: Number(formData.duration) || 45,
          meetingMode: formData.interviewMode,
          interviewType: formData.interviewMode,
          meetingLink: formData.interviewMode === "Online" ? formData.meetingLink : "",
          location: formData.interviewMode === "Offline" ? formData.location : "",
          rescheduledReason: formData.rescheduledReason || "Rescheduled by employer",
        });
      } else if (onSchedule) {
        const payload = {
          candidateId: formData.candidateId || candidate?.candidateId?._id || candidate?.candidateId || candidate?._id,
          applicationId: formData.applicationId || candidate?.applicationId || candidate?._id,
          jobId: formData.jobId || candidate?.jobId?._id || candidate?.jobId || null,
          internshipId: formData.internshipId || candidate?.internshipId?._id || candidate?.internshipId || null,
          roundNumber: formData.roundNumber || 1,
          roundName: finalRoundName,
          title: finalRoundName,
          scheduledDate: formData.scheduledDate,
          startTime: formData.startTime,
          scheduledTime: formData.startTime,
          duration: Number(formData.duration) || 45,
          durationMinutes: Number(formData.duration) || 45,
          interviewType: formData.interviewMode,
          meetingMode: formData.interviewMode,
          meetingLink: formData.interviewMode === "Online" ? formData.meetingLink : "",
          location: formData.interviewMode === "Offline" ? formData.location : "",
          interviewerName: formData.interviewerName.trim(),
          interviewerEmail: formData.interviewerEmail ? formData.interviewerEmail.trim() : "",
          instructions: formData.instructions || "",
          notes: formData.notes || "",
        };

        await onSchedule(payload);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to schedule interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-in-top my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1e3a8a]/10 border border-[#1e3a8a]/20 text-[#1e3a8a] flex items-center justify-center text-lg font-bold">
              📅
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isRescheduling ? "Reschedule Interview" : "Schedule Interview"}
              </h3>
              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{candName}</strong> • {targetRoleTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Candidate Selection if not preselected */}
          {!isRescheduling && !candidate && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Select Shortlisted Candidate & Position *
                </label>
                {loadingCandidates && (
                  <span className="text-[11px] text-amber-600 font-semibold animate-pulse">
                    Loading candidates...
                  </span>
                )}
              </div>

              {eligibleCandidates.length === 0 && !loadingCandidates ? (
                <p className="text-xs text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  ⚠️ No candidates currently shortlisted. Shortlist candidates from the Applications/ATS tab first.
                </p>
              ) : (
                <select
                  value={formData.applicationId}
                  onChange={(e) => {
                    const match = eligibleCandidates.find(
                      (c) => (c.applicationId || c._id) === e.target.value
                    );
                    if (match) handleCandidateSelect(match);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                  required
                >
                  <option value="">-- Choose Shortlisted Candidate --</option>
                  {eligibleCandidates.map((item) => {
                    const cName =
                      item.candidateName ||
                      item.candidate?.fullName ||
                      item.candidateId?.fullName ||
                      "Candidate";
                    const roleTitle =
                      item.opportunityTitle ||
                      item.jobId?.title ||
                      item.internshipId?.title ||
                      "Role";
                    const keyVal = item.applicationId || item._id;
                    return (
                      <option key={keyVal} value={keyVal}>
                        {cName} — {roleTitle}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {/* Interview Round */}
          {!isRescheduling && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Interview Round *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROUND_OPTIONS.map((round) => (
                  <button
                    key={round}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        interviewRound: round,
                        roundName: round === "Other" ? (prev.customRoundName || "Custom Round") : round,
                      }));
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition text-center ${
                      formData.interviewRound === round
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {round}
                  </button>
                ))}
              </div>

              {formData.interviewRound === "Other" && (
                <div className="pt-1">
                  <input
                    name="customRoundName"
                    value={formData.customRoundName}
                    onChange={handleChange}
                    placeholder="Enter custom interview round name..."
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Date, Time, Duration */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interview Date *</label>
              <input
                type="date"
                name="scheduledDate"
                min={today}
                value={formData.scheduledDate}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time *</label>
              <input
                type="text"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                placeholder="e.g. 11:00 AM"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration *</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 hour)</option>
                <option value={90}>90 Minutes (1.5 hrs)</option>
                <option value={120}>120 Minutes (2 hrs)</option>
              </select>
            </div>
          </div>

          {/* Interview Mode: Online or Offline */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Interview Mode *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, interviewMode: "Online" }))}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  formData.interviewMode === "Online"
                    ? "bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-400/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>🌐</span>
                <span>Online</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, interviewMode: "Offline" }))}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  formData.interviewMode === "Offline"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/20"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>🏢</span>
                <span>Offline</span>
              </button>
            </div>
          </div>

          {/* Conditional: Meeting Link (Online) OR Location (Offline) */}
          {formData.interviewMode === "Online" ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Meeting Link * (Required for Online)
              </label>
              <input
                type="url"
                name="meetingLink"
                value={formData.meetingLink}
                onChange={handleChange}
                placeholder="https://meet.google.com/xyz-abc-def"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                required={formData.interviewMode === "Online"}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location * (Required for Offline)
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Conference Room 3B, Campus Block A, Geeta University"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                required={formData.interviewMode === "Offline"}
              />
            </div>
          )}

          {/* Interviewer Details */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Name *</label>
              <input
                type="text"
                name="interviewerName"
                value={formData.interviewerName}
                onChange={handleChange}
                placeholder="e.g. Rahul Mehta (Tech Lead)"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Email (Optional)</label>
              <input
                type="email"
                name="interviewerEmail"
                value={formData.interviewerEmail}
                onChange={handleChange}
                placeholder="interviewer@company.com"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Reschedule Reason if Rescheduling */}
          {isRescheduling && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rescheduling (Optional)</label>
              <input
                type="text"
                name="rescheduledReason"
                value={formData.rescheduledReason}
                onChange={handleChange}
                placeholder="e.g. Recruiter scheduling conflict, adjusted at candidate request"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              />
            </div>
          )}

          {/* Interview Instructions & Notes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interview Instructions</label>
              <textarea
                rows={2}
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="Guidelines or instructions for the candidate..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Optional Notes</label>
              <textarea
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Internal recruiter notes..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? "Processing..."
                : isRescheduling
                ? "Reschedule Interview"
                : "Schedule Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewScheduleModal;
