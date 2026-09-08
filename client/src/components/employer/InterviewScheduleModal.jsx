import React, { useState, useEffect } from "react";
import recruitmentService from "../../services/recruitmentService";

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
    roundName: "Round 1 - Technical Assessment",
    title: "Technical Interview Round",
    interviewType: "Technical",
    interviewerName: "Hiring Team Lead",
    interviewerRole: "Technical Hiring Lead",
    interviewerEmail: "",
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    scheduledTime: "11:00 AM - 11:45 AM",
    durationMinutes: 45,
    meetingMode: "Google Meet",
    meetingLink: "https://meet.google.com/new",
    location: "Virtual Meeting Room",
    notes: "",
    preparationGuidelines: "Please review fundamental concepts, algorithms, and past project architecture.",
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
    handleRoundChange(nextRound);

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
      setFormData({
        candidateId: interviewToReschedule.candidateId?._id || interviewToReschedule.candidateId || "",
        jobId: interviewToReschedule.jobId?._id || interviewToReschedule.jobId || "",
        internshipId: interviewToReschedule.internshipId?._id || interviewToReschedule.internshipId || "",
        applicationId: interviewToReschedule.applicationId?._id || interviewToReschedule.applicationId || "",
        roundNumber: interviewToReschedule.roundNumber || 1,
        roundName: interviewToReschedule.roundName || "Round 1 - Technical",
        title: interviewToReschedule.title || "",
        interviewType: interviewToReschedule.interviewType || "Technical",
        interviewerName: interviewToReschedule.interviewerName || "",
        interviewerRole: interviewToReschedule.interviewerRole || "",
        interviewerEmail: interviewToReschedule.interviewerEmail || "",
        scheduledDate: interviewToReschedule.scheduledDate || today,
        scheduledTime: interviewToReschedule.scheduledTime || "",
        durationMinutes: interviewToReschedule.durationMinutes || 45,
        meetingMode: interviewToReschedule.meetingMode || "Google Meet",
        meetingLink: interviewToReschedule.meetingLink || "",
        location: interviewToReschedule.location || "",
        notes: interviewToReschedule.notes || "",
        preparationGuidelines: interviewToReschedule.preparationGuidelines || "",
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

  const handleRoundChange = (roundNum) => {
    const num = Number(roundNum);
    const defaultRoundNames = {
      1: "Round 1 - Technical Assessment",
      2: "Round 2 - Live Coding & Problem Solving",
      3: "Round 3 - System Design & Architecture",
      4: "Round 4 - Managerial & Cultural Fit",
      5: "Round 5 - Executive HR Discussion",
    };
    const defaultTypes = {
      1: "Technical",
      2: "Coding Challenge",
      3: "System Design",
      4: "Managerial",
      5: "HR Round",
    };

    setFormData((prev) => ({
      ...prev,
      roundNumber: num,
      roundName: defaultRoundNames[num] || `Round ${num} Evaluation`,
      interviewType: defaultTypes[num] || prev.interviewType,
      title: `${defaultTypes[num] || "Interview"} Round ${num}`,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError("Please specify both the interview date and time slot.");
      return;
    }

    if (!isRescheduling && !formData.candidateId && !candidate) {
      setError("Please select a candidate to interview.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (isRescheduling && onReschedule) {
        await onReschedule(interviewToReschedule._id, {
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          durationMinutes: formData.durationMinutes,
          meetingLink: formData.meetingLink,
          rescheduledReason: formData.rescheduledReason,
        });
      } else if (onSchedule) {
        const payload = {
          ...formData,
          candidateId: formData.candidateId || candidate?.candidateId?._id || candidate?.candidateId || candidate?._id,
          applicationId: formData.applicationId || candidate?.applicationId || candidate?._id,
          jobId: formData.jobId || candidate?.jobId?._id || candidate?.jobId,
          internshipId: formData.internshipId || candidate?.internshipId?._id || candidate?.internshipId,
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isRescheduling ? "Reschedule Interview Slot" : "Schedule Live Interview"}
            </h3>
            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{candName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* If no candidate preselected and not rescheduling, show Candidate Selector */}
          {!isRescheduling && !candidate && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Select Shortlisted / Eligible Candidate *
                </label>
                {loadingCandidates && (
                  <span className="text-[10.5px] text-amber-600 font-semibold animate-pulse">
                    Loading candidates...
                  </span>
                )}
              </div>

              {eligibleCandidates.length === 0 && !loadingCandidates ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  ⚠️ No shortlisted candidates currently eligible for scheduling. Please shortlist candidates from the
                  Applications screen first.
                </div>
              ) : (
                <select
                  value={formData.applicationId}
                  onChange={(e) => {
                    const match = eligibleCandidates.find(
                      (c) => (c.applicationId || c._id) === e.target.value
                    );
                    if (match) handleCandidateSelect(match);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  required
                >
                  <option value="">-- Choose Candidate --</option>
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
                    const roundNotice =
                      item.nextRoundNumber > 1
                        ? `(Passed Round ${item.nextRoundNumber - 1})`
                        : `(${item.applicationStatus || "Eligible"})`;
                    const keyVal = item.applicationId || item._id;
                    return (
                      <option key={keyVal} value={keyVal}>
                        {cName} — {roleTitle} {roundNotice}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {!isRescheduling && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Interview Pipeline Round</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { num: 1, label: "R1: Technical", icon: "💻" },
                  { num: 2, label: "R2: Coding", icon: "🧩" },
                  { num: 3, label: "R3: System Design", icon: "🏗️" },
                  { num: 4, label: "R4: Managerial", icon: "👔" },
                ].map((r) => (
                  <button
                    key={r.num}
                    type="button"
                    onClick={() => handleRoundChange(r.num)}
                    className={`p-2.5 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                      formData.roundNumber === r.num
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm">{r.icon}</span>
                    <span className="text-[11px]">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Round Title *</label>
              <input
                name="roundName"
                value={formData.roundName}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interview Type</label>
              <select
                name="interviewType"
                value={formData.interviewType}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Technical">Technical Round</option>
                <option value="Coding Challenge">Coding Assessment</option>
                <option value="System Design">System Design & Architecture</option>
                <option value="Managerial">Managerial & Behavioral</option>
                <option value="HR Round">HR Discussion</option>
                <option value="Cultural Fit">Cultural & Team Fit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Interviewer *</label>
              <input
                name="interviewerName"
                value={formData.interviewerName}
                onChange={handleChange}
                placeholder="e.g. Rahul Mehta (Tech Lead)"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Role</label>
              <input
                name="interviewerRole"
                value={formData.interviewerRole}
                onChange={handleChange}
                placeholder="Senior Engineering Manager"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date * (Cannot be past date)</label>
              <input
                type="date"
                name="scheduledDate"
                min={today}
                value={formData.scheduledDate}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot *</label>
              <input
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                placeholder="11:00 AM - 11:45 AM"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Mode</label>
              <select
                name="meetingMode"
                value={formData.meetingMode}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="In-Person Campus">In-Person Campus Room</option>
                <option value="Phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
              <select
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Live Meeting Video Link *</label>
              <input
                name="meetingLink"
                value={formData.meetingLink}
                onChange={handleChange}
                placeholder="https://meet.google.com/xyz-uvw-rst"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            {isRescheduling && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rescheduling *</label>
                <input
                  name="rescheduledReason"
                  value={formData.rescheduledReason}
                  onChange={handleChange}
                  placeholder="Candidate requested time slot adjustment"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  required
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Preparation Guidelines & Tips</label>
              <textarea
                rows={2}
                name="preparationGuidelines"
                value={formData.preparationGuidelines}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {saving ? "Processing..." : isRescheduling ? "Update & Reschedule Slot" : "Confirm & Send Interview Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewScheduleModal;
