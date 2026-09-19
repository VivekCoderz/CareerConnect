import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  Video,
  MapPin,
  CheckCircle2,
  Lock,
  ChevronDown,
  AlertCircle,
  X,
  FileText,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import recruitmentService from "../../services/recruitmentService";
import organizationService from "../../services/organizationService";

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

  // Data Loading States
  const [eligibleCandidates, setEligibleCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Selected Entities
  const [selectedCandidateItem, setSelectedCandidateItem] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Form State
  const [selectedDate, setSelectedDate] = useState(
    interviewToReschedule?.scheduledDate ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [meetingMode, setMeetingMode] = useState(
    interviewToReschedule?.meetingMode === "Offline" ? "Offline" : "Online"
  );
  const [meetingPlatform, setMeetingPlatform] = useState("Google Meet");
  const [meetingLink, setMeetingLink] = useState(interviewToReschedule?.meetingLink || "");
  const [location, setLocation] = useState(interviewToReschedule?.location || "");
  const [preparationGuidelines, setPreparationGuidelines] = useState(
    interviewToReschedule?.preparationGuidelines || ""
  );
  const [rescheduledReason, setRescheduledReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Load Eligible Candidates & Employees on Open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // Load Eligible Candidates (if not in reschedule mode)
    if (!isRescheduling) {
      setLoadingCandidates(true);
      recruitmentService
        .getEligibleCandidates()
        .then((res) => {
          if (!isMounted) return;
          const list = res.candidates || res.data || [];
          setEligibleCandidates(list);

          // If a pre-selected candidate prop was passed, find and select them
          if (candidate) {
            const targetAppId =
              candidate.applicationId ||
              candidate._id ||
              candidate.candidateId?._id;
            const match = list.find(
              (c) => (c.applicationId || c._id) === targetAppId
            );
            if (match) {
              handleCandidateSelect(match);
            } else {
              handleCandidateSelect(candidate);
            }
          } else if (list.length > 0) {
            // Auto-select first eligible candidate
            handleCandidateSelect(list[0]);
          }
        })
        .catch((err) => {
          console.error("Failed to load eligible candidates:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingCandidates(false);
        });
    } else if (interviewToReschedule) {
      // In reschedule mode, construct selected item from interviewToReschedule
      const candObj = {
        candidateId: interviewToReschedule.candidateId?._id || interviewToReschedule.candidateId,
        candidateName:
          interviewToReschedule.candidateId?.fullName ||
          interviewToReschedule.candidateName ||
          "Candidate",
        opportunityTitle:
          interviewToReschedule.jobId?.title ||
          interviewToReschedule.internshipId?.title ||
          "Position",
        applicationId:
          interviewToReschedule.applicationId?._id ||
          interviewToReschedule.applicationId,
        jobId: interviewToReschedule.jobId?._id || interviewToReschedule.jobId,
        internshipId:
          interviewToReschedule.internshipId?._id ||
          interviewToReschedule.internshipId,
        applicationStatus: "Interview Rescheduling",
      };
      setSelectedCandidateItem(candObj);

      setSelectedRound({
        roundNumber: interviewToReschedule.roundNumber || 1,
        name: interviewToReschedule.roundName || `Round ${interviewToReschedule.roundNumber || 1}`,
        type: interviewToReschedule.interviewType || "Technical",
        durationMinutes: interviewToReschedule.durationMinutes || interviewToReschedule.duration || 45,
        status: "available",
      });

      if (interviewToReschedule.scheduledTime) {
        setSelectedSlot({
          slot: interviewToReschedule.scheduledTime,
          startTime: interviewToReschedule.startTime || interviewToReschedule.scheduledTime.split(" - ")[0],
          endTime: interviewToReschedule.endTime || interviewToReschedule.scheduledTime.split(" - ")[1] || "",
          durationMinutes: interviewToReschedule.durationMinutes || 45,
          available: true,
        });
      }
    }

    // Load Company Employees Directory
    setLoadingEmployees(true);
    organizationService
      .getEmployees()
      .then((res) => {
        if (!isMounted) return;
        const empList = res.employees || [];
        setEmployees(empList);

        if (isRescheduling && interviewToReschedule.interviewerName) {
          const match = empList.find(
            (e) =>
              (interviewToReschedule.interviewerId && e._id === interviewToReschedule.interviewerId) ||
              e.fullName.toLowerCase() === interviewToReschedule.interviewerName.toLowerCase()
          );
          if (match) {
            setSelectedInterviewer(match);
          } else {
            setSelectedInterviewer({
              _id: interviewToReschedule.interviewerId || null,
              fullName: interviewToReschedule.interviewerName,
              designation: interviewToReschedule.interviewerRole || "Hiring Lead",
              department: "Hiring Team",
              email: interviewToReschedule.interviewerEmail || "",
            });
          }
        } else if (empList.length > 0) {
          setSelectedInterviewer(empList[0]);
        } else {
          // Fallback if employee directory is empty: Default Hiring Lead
          setSelectedInterviewer({
            _id: null,
            fullName: "Hiring Team Lead",
            designation: "Technical Interviewer",
            department: "Recruitment",
            email: "",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load employees:", err);
        setSelectedInterviewer({
          _id: null,
          fullName: "Hiring Team Lead",
          designation: "Technical Interviewer",
          department: "Recruitment",
          email: "",
        });
      })
      .finally(() => {
        if (isMounted) setLoadingEmployees(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, candidate, isRescheduling, interviewToReschedule]);

  // 2. Candidate Selection Handler
  const handleCandidateSelect = (cand) => {
    if (!cand) return;
    setSelectedCandidateItem(cand);
    setError("");

    // Build or extract rounds pipeline
    const pipeline = cand.roundsPipeline || [
      {
        roundNumber: 1,
        name: "Round 1 - Technical Assessment",
        type: "Technical",
        durationMinutes: 45,
        status: cand.totalRoundsConducted > 0 ? "completed" : "available",
        label: cand.totalRoundsConducted > 0 ? "Completed" : "Available",
        isSelectable: cand.totalRoundsConducted === 0,
      },
      {
        roundNumber: 2,
        name: "Round 2 - Live Problem Solving & Coding",
        type: "Coding",
        durationMinutes: 45,
        status:
          cand.totalRoundsConducted === 1
            ? "available"
            : cand.totalRoundsConducted > 1
            ? "completed"
            : "locked",
        label:
          cand.totalRoundsConducted === 1
            ? "Available"
            : cand.totalRoundsConducted > 1
            ? "Completed"
            : "Locked",
        isSelectable: cand.totalRoundsConducted === 1,
      },
      {
        roundNumber: 3,
        name: "Round 3 - HR & Culture Fit Discussion",
        type: "HR",
        durationMinutes: 30,
        status:
          cand.totalRoundsConducted === 2
            ? "available"
            : cand.totalRoundsConducted > 2
            ? "completed"
            : "locked",
        label:
          cand.totalRoundsConducted === 2
            ? "Available"
            : cand.totalRoundsConducted > 2
            ? "Completed"
            : "Locked",
        isSelectable: cand.totalRoundsConducted === 2,
      },
    ];

    // Pick the first selectable round
    const nextRound =
      pipeline.find((r) => r.isSelectable || r.status === "available") ||
      pipeline[0];
    setSelectedRound(nextRound);
  };

  // 3. Load Available Time Slots dynamically for selected Date & Interviewer
  const fetchSlots = useCallback(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);

    const duration = selectedRound?.durationMinutes || 45;
    const params = {
      date: selectedDate,
      duration,
      interviewerId: selectedInterviewer?._id || undefined,
      interviewerName: selectedInterviewer?.fullName || undefined,
      candidateId:
        selectedCandidateItem?.candidateId?._id ||
        selectedCandidateItem?.candidateId ||
        undefined,
    };

    recruitmentService
      .getInterviewAvailability(params)
      .then((res) => {
        if (res?.slots) {
          setAvailableSlots(res.slots);
          // Auto-select first available slot if current selectedSlot is invalid or not set
          const firstAvailable = res.slots.find((s) => s.available);
          if (firstAvailable && (!selectedSlot || !res.slots.some((s) => s.slot === selectedSlot.slot && s.available))) {
            setSelectedSlot(firstAvailable);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load availability slots:", err);
        // Fallback default slots
        const defaults = [
          { slot: "09:30 AM - 10:15 AM", startTime: "09:30 AM", endTime: "10:15 AM", durationMinutes: duration, available: true },
          { slot: "10:30 AM - 11:15 AM", startTime: "10:30 AM", endTime: "11:15 AM", durationMinutes: duration, available: true },
          { slot: "11:30 AM - 12:15 PM", startTime: "11:30 AM", endTime: "12:15 PM", durationMinutes: duration, available: true },
          { slot: "02:00 PM - 02:45 PM", startTime: "02:00 PM", endTime: "02:45 PM", durationMinutes: duration, available: true },
          { slot: "03:00 PM - 03:45 PM", startTime: "03:00 PM", endTime: "03:45 PM", durationMinutes: duration, available: true },
          { slot: "04:00 PM - 04:45 PM", startTime: "04:00 PM", endTime: "04:45 PM", durationMinutes: duration, available: true },
          { slot: "05:00 PM - 05:45 PM", startTime: "05:00 PM", endTime: "05:45 PM", durationMinutes: duration, available: true },
        ];
        setAvailableSlots(defaults);
        if (!selectedSlot) setSelectedSlot(defaults[1]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate, selectedRound?.durationMinutes, selectedInterviewer, selectedCandidateItem]);

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen, fetchSlots]);

  // Derived Candidate details
  const candidateName =
    selectedCandidateItem?.candidateName ||
    selectedCandidateItem?.studentName ||
    selectedCandidateItem?.candidateId?.fullName ||
    "Candidate";

  const jobTitle =
    selectedCandidateItem?.opportunityTitle ||
    selectedCandidateItem?.jobId?.title ||
    selectedCandidateItem?.internshipId?.title ||
    "Position";

  const roundsList = useMemo(() => {
    return selectedCandidateItem?.roundsPipeline || [
      {
        roundNumber: 1,
        name: "Round 1 - Technical Assessment",
        type: "Technical",
        durationMinutes: 45,
        status: "available",
        label: "Available",
        isSelectable: true,
      },
      {
        roundNumber: 2,
        name: "Round 2 - Live Problem Solving & Coding",
        type: "Coding",
        durationMinutes: 45,
        status: "locked",
        label: "Locked",
        isSelectable: false,
      },
      {
        roundNumber: 3,
        name: "Round 3 - HR & Culture Fit Discussion",
        type: "HR",
        durationMinutes: 30,
        status: "locked",
        label: "Locked",
        isSelectable: false,
      },
    ];
  }, [selectedCandidateItem]);

  // Submit Handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!selectedCandidateItem) {
      setError("Please select an eligible candidate.");
      return;
    }

    if (!selectedRound) {
      setError("Please select an interview round.");
      return;
    }

    if (!selectedDate) {
      setError("Please select an interview date.");
      return;
    }

    if (!selectedSlot) {
      setError("Please choose an available time slot.");
      return;
    }

    if (meetingMode === "Online" && !meetingLink.trim()) {
      setError("Please provide a valid meeting link for Online interviews.");
      return;
    }

    if (meetingMode === "Offline" && !location.trim()) {
      setError("Please specify the physical location for Offline interviews.");
      return;
    }

    if (isRescheduling && !rescheduledReason.trim()) {
      setError("Please state the reason for rescheduling.");
      return;
    }

    try {
      setSaving(true);

      if (isRescheduling && onReschedule) {
        await onReschedule(interviewToReschedule._id, {
          scheduledDate: selectedDate,
          scheduledTime: selectedSlot.slot,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          durationMinutes: selectedRound.durationMinutes || selectedSlot.durationMinutes || 45,
          meetingMode,
          meetingLink: meetingMode === "Online" ? meetingLink.trim() : "",
          location: meetingMode === "Offline" ? location.trim() : "",
          rescheduledReason: rescheduledReason.trim(),
          preparationGuidelines: preparationGuidelines.trim() || undefined,
        });
      } else if (onSchedule) {
        const payload = {
          candidateId:
            selectedCandidateItem.candidateId?._id ||
            selectedCandidateItem.candidateId ||
            selectedCandidateItem.candidate?._id,
          applicationId:
            selectedCandidateItem.applicationId ||
            selectedCandidateItem._id,
          jobId:
            selectedCandidateItem.jobId?._id ||
            selectedCandidateItem.jobId ||
            undefined,
          internshipId:
            selectedCandidateItem.internshipId?._id ||
            selectedCandidateItem.internshipId ||
            undefined,
          roundNumber: selectedRound.roundNumber,
          roundName: selectedRound.name,
          interviewType: selectedRound.type || "Technical",
          title: selectedRound.name,
          interviewerId: selectedInterviewer?._id || undefined,
          interviewerName: selectedInterviewer?.fullName || "Hiring Lead",
          interviewerRole:
            selectedInterviewer?.designation ||
            selectedInterviewer?.roleInCompany ||
            "Interviewer",
          interviewerEmail: selectedInterviewer?.email || "",
          scheduledDate: selectedDate,
          scheduledTime: selectedSlot.slot,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration: selectedRound.durationMinutes || selectedSlot.durationMinutes || 45,
          durationMinutes: selectedRound.durationMinutes || selectedSlot.durationMinutes || 45,
          meetingMode,
          meetingLink: meetingMode === "Online" ? meetingLink.trim() : "",
          location: meetingMode === "Offline" ? location.trim() : "",
          preparationGuidelines: preparationGuidelines.trim() || undefined,
        };

        await onSchedule(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to schedule interview. Please check your inputs."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* ======================================================== */}
        {/* MODAL HEADER                                             */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isRescheduling ? "Reschedule Interview Slot" : "Schedule Live Interview"}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-9">
              {isRescheduling
                ? "Select a new available date and time slot for this interview."
                : "Schedule a verified round with an eligible candidate."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* MODAL BODY (Scrollable Form)                             */}
        {/* ======================================================== */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* 1. CANDIDATE SELECTION                                */}
          {/* ---------------------------------------------------- */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Candidate *</span>
              {loadingCandidates && (
                <span className="text-[11px] text-blue-600 font-normal animate-pulse">
                  Loading eligible candidates...
                </span>
              )}
            </label>

            {isRescheduling ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{candidateName}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{jobTitle}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  Rescheduling
                </span>
              </div>
            ) : eligibleCandidates.length === 0 && !loadingCandidates ? (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  No shortlisted candidates found. Please shortlist a candidate from the Applications screen first.
                </span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedCandidateItem?.applicationId || selectedCandidateItem?._id || ""}
                  onChange={(e) => {
                    const match = eligibleCandidates.find(
                      (c) => (c.applicationId || c._id) === e.target.value
                    );
                    if (match) handleCandidateSelect(match);
                  }}
                  className="w-full appearance-none px-3.5 py-2.5 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                  required
                >
                  {eligibleCandidates.map((item) => {
                    const cName =
                      item.candidateName ||
                      item.studentName ||
                      item.candidateId?.fullName ||
                      "Candidate";
                    const role =
                      item.opportunityTitle ||
                      item.jobId?.title ||
                      item.internshipId?.title ||
                      "Position";
                    const st = item.applicationStatus || "Shortlisted";
                    const keyVal = item.applicationId || item._id;
                    return (
                      <option key={keyVal} value={keyVal}>
                        {cName} — {role} ({st})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* 2. INTERVIEW ROUND (Job Configured Pipeline)         */}
          {/* ---------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800">Interview Round *</label>
              {selectedRound && (
                <span className="text-[11px] text-slate-500">
                  Estimated duration:{" "}
                  <strong className="text-slate-700">{selectedRound.durationMinutes} mins</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {roundsList.map((r) => {
                const isSelected = selectedRound?.roundNumber === r.roundNumber;
                const isCompleted = r.status === "completed";
                const isLocked = r.status === "locked" || (!r.isSelectable && !isCompleted && !isRescheduling);
                const isAvailable = r.status === "available" || (r.isSelectable && !isCompleted);

                return (
                  <button
                    key={r.roundNumber}
                    type="button"
                    disabled={isCompleted || isLocked}
                    onClick={() => setSelectedRound(r)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : isCompleted
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 cursor-not-allowed opacity-80"
                        : isLocked
                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                        : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : isLocked
                            ? "bg-slate-200 text-slate-600"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        Round {r.roundNumber}
                      </span>

                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      ) : isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div>
                      <h5 className="font-bold truncate text-xs">{r.name.replace(/Round \d+ - /, "")}</h5>
                      <p
                        className={`text-[10.5px] mt-0.5 ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {isCompleted
                          ? "Completed ✓"
                          : isLocked
                          ? "Locked"
                          : `${r.type} • ${r.durationMinutes}m`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 3. INTERVIEWER (From Employee Directory)            */}
          {/* ---------------------------------------------------- */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Interviewer *</span>
              {loadingEmployees && (
                <span className="text-[11px] text-blue-600 font-normal animate-pulse">
                  Loading directory...
                </span>
              )}
            </label>

            <div className="relative">
              <select
                value={selectedInterviewer?._id || selectedInterviewer?.fullName || ""}
                onChange={(e) => {
                  const match = employees.find(
                    (emp) => (emp._id || emp.fullName) === e.target.value
                  );
                  if (match) setSelectedInterviewer(match);
                }}
                className="w-full appearance-none px-3.5 py-2.5 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                required
              >
                {employees.length === 0 ? (
                  <option value="Hiring Team Lead">Hiring Team Lead (Hiring Manager)</option>
                ) : (
                  employees.map((emp) => (
                    <option key={emp._id || emp.fullName} value={emp._id || emp.fullName}>
                      {emp.fullName} — {emp.designation || emp.roleInCompany || "Interviewer"} ({emp.department || "Company"})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {selectedInterviewer && (
              <p className="text-[11px] text-slate-500 mt-1 pl-1">
                Assigned Role:{" "}
                <strong className="text-slate-700">
                  {selectedInterviewer.designation || selectedInterviewer.roleInCompany || "Technical Interviewer"}
                </strong>
                {selectedInterviewer.department ? ` • ${selectedInterviewer.department}` : ""}
              </p>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* 4. DATE & CONFLICT-CHECKED AVAILABLE TIME SLOTS     */}
          {/* ---------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date Picker */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Interview Date *</label>
              <div className="relative">
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Selected Slot Recap */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Selected Time Slot</label>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold flex items-center justify-between">
                <span>{selectedSlot ? selectedSlot.slot : "None selected"}</span>
                {selectedSlot && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                    {selectedRound?.durationMinutes || 45}m
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Available Time Slots *</span>
              </label>
              {loadingSlots && (
                <span className="text-[11px] text-blue-600 animate-pulse">Checking availability...</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSlots.map((slotItem) => {
                const isSelected = selectedSlot?.slot === slotItem.slot;
                const isAvail = slotItem.available;

                return (
                  <button
                    key={slotItem.slot}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => setSelectedSlot(slotItem)}
                    title={slotItem.reason}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : isAvail
                        ? "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        : "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed line-through opacity-60"
                    }`}
                  >
                    <span>{slotItem.startTime}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                      {slotItem.endTime}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1 pl-1">
              Slots are verified against existing scheduled interviews to prevent double booking.
            </p>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 5. INTERVIEW MODE (Online / Offline)                 */}
          {/* ---------------------------------------------------- */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">Interview Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMeetingMode("Online")}
                className={`py-2 px-3 rounded-xl font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  meetingMode === "Online"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Online Video Meeting</span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingMode("Offline")}
                className={`py-2 px-3 rounded-xl font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                  meetingMode === "Offline"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>In-Person / Offline</span>
              </button>
            </div>
          </div>

          {/* Online details */}
          {meetingMode === "Online" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Platform</label>
                <div className="relative">
                  <select
                    value={meetingPlatform}
                    onChange={(e) => setMeetingPlatform(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-7 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                  >
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">Meeting Link *</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-slate-800 mb-1">Office / Campus Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Conference Room 3B, Panipat Main Campus"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </div>
          )}

          {/* Reschedule Reason if applicable */}
          {isRescheduling && (
            <div>
              <label className="block font-bold text-slate-800 mb-1">Reason for Rescheduling *</label>
              <input
                type="text"
                value={rescheduledReason}
                onChange={(e) => setRescheduledReason(e.target.value)}
                placeholder="e.g. Interviewer conflict / Candidate requested adjustment"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* 6. PREPARATION GUIDELINES (Optional)                 */}
          {/* ---------------------------------------------------- */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Preparation Guidelines</span>
              <span className="text-slate-400 font-normal text-[11px]">Optional</span>
            </label>
            <textarea
              rows={2}
              value={preparationGuidelines}
              onChange={(e) => setPreparationGuidelines(e.target.value)}
              placeholder="e.g. Please review past projects and core concepts in the job description."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200/80 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* ---------------------------------------------------- */}
          {/* 7. INTERVIEW SUMMARY RECAP                           */}
          {/* ---------------------------------------------------- */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900 flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Interview Summary</span>
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400">Candidate:</span>
                <p className="font-bold text-slate-800 truncate">{candidateName}</p>
              </div>
              <div>
                <span className="text-slate-400">Job:</span>
                <p className="font-bold text-slate-800 truncate">{jobTitle}</p>
              </div>
              <div>
                <span className="text-slate-400">Round:</span>
                <p className="font-bold text-slate-800 truncate">
                  {selectedRound?.name || "Round 1"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Interviewer:</span>
                <p className="font-bold text-slate-800 truncate">
                  {selectedInterviewer?.fullName || "Hiring Lead"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Date & Time:</span>
                <p className="font-bold text-slate-800 truncate">
                  {selectedDate} • {selectedSlot?.startTime || "Time TBD"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Mode:</span>
                <p className="font-bold text-slate-800 truncate">
                  {meetingMode === "Online" ? `Online (${meetingPlatform})` : "In-Person"}
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* MODAL ACTIONS                                        */}
          {/* ==================================================== */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedCandidateItem || !selectedSlot}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs hover:shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {isRescheduling ? "Update & Reschedule Slot" : "Confirm & Send Invite"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewScheduleModal;
