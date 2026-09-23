import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getApplicationById,
  moveNextStage,
  selectCandidate,
  rejectCandidate,
  markStageFailed,
  updateRound,
  addNote,
} from "../../services/applicationService";
import { createInterview } from "../../services/interviewService";
import EmployerNavbar from "../../components/employer/EmployerNavbar";

const DEFAULT_STAGES = [
  { name: "Resume Screening", type: "Resume Screening", order: 0 },
  { name: "Technical Interview", type: "Technical Interview", order: 1 },
  { name: "HR Interview", type: "HR Interview", order: 2 },
];

export default function EmployerApplicationDetailPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Modals & form states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [targetScheduleStage, setTargetScheduleStage] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: "",
    startTime: "11:00 AM",
    duration: 45,
    interviewType: "Online",
    meetingLink: "",
    location: "",
    instructions: "",
    interviewerName: "",
    interviewerEmail: "",
  });

  const [actionModal, setActionModal] = useState(null); // { type: 'pass'|'select'|'reject'|'fail', stage: Object }
  const [actionRemarks, setActionRemarks] = useState("");
  const [newNote, setNewNote] = useState("");

  const fetchApplication = async (silent = false) => {
    if (!applicationId) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getApplicationById(applicationId);
      if (res?.success && res.application) {
        setApplication(res.application);
      } else {
        setError(res?.message || "Failed to load application.");
      }
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || "Application not found or unauthorized.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading applicant details...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-sm font-bold text-slate-900">Application Not Found</h2>
          <p className="text-xs text-slate-500">{error || "Access denied or record missing."}</p>
          <Link
            to="/employer/dashboard"
            className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const opp = application.jobId || application.internshipId || {};
  const isInternship = application.opportunityType === "Internship" || opp.employmentType === "Internship";
  const stages = (opp.recruitmentStages && opp.recruitmentStages.length > 0)
    ? [...opp.recruitmentStages].sort((a, b) => a.order - b.order)
    : (application.recruitmentStages && application.recruitmentStages.length > 0)
    ? [...application.recruitmentStages].sort((a, b) => a.order - b.order)
    : DEFAULT_STAGES;

  const currentIdx = application.currentStageIndex ?? 0;
  const isSelected = application.overallStatus === "Selected" || application.status === "Selected" || application.status === "Hired";
  const isRejected = application.overallStatus === "Rejected" || application.status === "Rejected";
  const isWithdrawn = application.overallStatus === "Withdrawn" || application.status === "Withdrawn";

  const appData = application.applicationData || {};
  const studentName = application.studentName || appData.fullName || application.candidateId?.fullName || "Applicant";
  const studentEmail = application.studentEmail || appData.email || application.candidateId?.email || "";
  const studentPhone = application.studentPhone || appData.phone || application.candidateId?.phone || "";
  const education = application.education || appData.education || appData.degree || "B.Tech";
  const college = appData.college || "CareerConnect";
  const graduationYear = appData.graduationYear || "";
  const skills = Array.isArray(application.skills) && application.skills.length > 0
    ? application.skills
    : Array.isArray(appData.skills)
    ? appData.skills
    : typeof application.skills === "string" && application.skills
    ? application.skills.split(",").map(s => s.trim())
    : [];

  const resumeUrl = application.resumeUrl || appData.resumeUrl || "";
  const portfolioUrl = application.portfolioUrl || appData.portfolioUrl || "";
  const coverNote = application.coverNote || application.coverLetter || appData.coverNote || "";

  // Handlers for Pipeline Actions
  const handlePassStage = async () => {
    try {
      setActionLoading(true);
      const res = await moveNextStage(application._id, { remarks: actionRemarks });
      if (res.success) {
        setFeedbackMsg(`Candidate advanced to next stage successfully!`);
        setActionModal(null);
        setActionRemarks("");
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to advance stage.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to advance stage.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectCandidate = async () => {
    try {
      setActionLoading(true);
      const res = await selectCandidate(application._id, { remarks: actionRemarks });
      if (res.success) {
        setFeedbackMsg(`Candidate marked as SELECTED!`);
        setActionModal(null);
        setActionRemarks("");
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to select candidate.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to select candidate.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCandidate = async () => {
    try {
      setActionLoading(true);
      const res = await rejectCandidate(application._id, { remarks: actionRemarks });
      if (res.success) {
        setFeedbackMsg(`Candidate marked as Rejected.`);
        setActionModal(null);
        setActionRemarks("");
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to reject candidate.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject candidate.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkFailed = async (shouldReject = false) => {
    try {
      setActionLoading(true);
      const res = await markStageFailed(application._id, { remarks: actionRemarks, shouldReject });
      if (res.success) {
        setFeedbackMsg(`Stage marked as Failed.`);
        setActionModal(null);
        setActionRemarks("");
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to update round.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update round.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleForm.scheduledDate) {
      alert("Please choose an interview date.");
      return;
    }
    try {
      setActionLoading(true);
      const roundNum = (targetScheduleStage?.order ?? currentIdx) + 1;
      const payload = {
        applicationId: application._id,
        candidateId: application.candidateId?._id || application.candidateId,
        jobId: application.jobId?._id || application.jobId || null,
        internshipId: application.internshipId?._id || application.internshipId || null,
        roundNumber: roundNum,
        roundName: targetScheduleStage?.name || `Round ${roundNum}`,
        interviewType: scheduleForm.interviewType,
        scheduledDate: scheduleForm.scheduledDate,
        startTime: scheduleForm.startTime,
        duration: Number(scheduleForm.duration) || 45,
        durationMinutes: Number(scheduleForm.duration) || 45,
        meetingLink: scheduleForm.meetingLink,
        location: scheduleForm.location,
        instructions: scheduleForm.instructions,
        interviewerName: scheduleForm.interviewerName,
        interviewerEmail: scheduleForm.interviewerEmail,
      };

      const res = await createInterview(payload);
      if (res.success) {
        setFeedbackMsg(`Interview scheduled successfully for ${targetScheduleStage?.name || `Round ${roundNum}`}!`);
        setScheduleModalOpen(false);
        await fetchApplication(true);
      } else {
        alert(res.message || "Failed to schedule interview.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error scheduling interview.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setActionLoading(true);
      const res = await addNote(application._id, newNote);
      if (res.success) {
        setNewNote("");
        await fetchApplication(true);
      }
    } catch (err) {
      alert("Failed to save note");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      <EmployerNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/employer/dashboard" className="hover:text-amber-700 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold">Applicant Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {studentName} · Application Evaluation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <span className="font-bold text-slate-700">{application.opportunityTitle || opp.title}</span> ({application.opportunityType || "Opportunity"})
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
              isSelected
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : isRejected
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
            }`}>
              Overall: {application.overallStatus || application.status}
            </span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>🎉 {feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg("")} className="font-bold text-emerald-600">✕</button>
          </div>
        )}

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student Profile & Application Details */}
          <div className="lg:col-span-1 space-y-5">
            {/* Candidate Card */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                  {studentName[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{studentName}</h3>
                  <p className="text-xs text-slate-500">{studentEmail}</p>
                  {studentPhone && <p className="text-xs text-slate-500">{studentPhone}</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Education & College</span>
                  <span className="font-bold text-slate-800">{education} {college ? `· ${college}` : ""}</span>
                  {graduationYear && <span className="text-slate-500 block text-[11px]">Class of {graduationYear}</span>}
                </div>

                {skills.length > 0 && (
                  <div className="pt-2">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1.5">Candidate Skills</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {skills.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-[#92400e] text-[10.5px] font-semibold border border-amber-200/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {portfolioUrl && (
                  <div className="pt-2">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Portfolio / Link</span>
                    <a
                      href={portfolioUrl.startsWith("http") ? portfolioUrl : `https://${portfolioUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:underline font-bold text-xs truncate block"
                    >
                      {portfolioUrl} ↗
                    </a>
                  </div>
                )}

                {resumeUrl && (
                  <div className="pt-3 border-t border-slate-100">
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>📄</span>
                      <span>Review Candidate Resume ↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Note Card if provided */}
            {coverNote && (
              <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Cover Note</span>
                <p className="text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                  "{coverNote}"
                </p>
              </div>
            )}

            {/* Activity Notes & Audit Card */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-3 text-xs">
              <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">Internal Team Notes</span>
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal evaluation remark..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !newNote.trim()}
                  className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-50"
                >
                  Save Note
                </button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(application.notes || []).slice().reverse().map((n, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                    <p className="text-slate-800 font-medium">{n.text}</p>
                    <span className="text-[9.5px] text-slate-400 block mt-1">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN") : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Recruitment Pipeline & Round-by-Round Controls */}
          <div className="lg:col-span-2 space-y-5">
            {/* Timeline Stepper Header Card */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Recruitment Stages ({stages.length} Rounds)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate currently at: <span className="font-extrabold text-[#1e3a8a]">{stages[currentIdx]?.name || "Stage"}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Step {currentIdx + 1} of {stages.length}
                </span>
              </div>

              {/* Progress Steps Horizontal Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {stages.map((stg, idx) => {
                  const isPassed = idx < currentIdx || isSelected;
                  const isCurrent = idx === currentIdx && !isSelected && !isRejected && !isWithdrawn;
                  const isFailed = idx === currentIdx && isRejected;

                  return (
                    <div key={stg._id || idx} className="flex items-center shrink-0">
                      <div
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition ${
                          isCurrent
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20"
                            : isPassed
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : isFailed
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-500 border-slate-200 opacity-70"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isCurrent ? "bg-white text-amber-700" : isPassed ? "bg-emerald-200 text-emerald-900" : "bg-slate-200 text-slate-700"
                        }`}>
                          {isPassed ? "✓" : isFailed ? "✕" : idx + 1}
                        </span>
                        <span>{stg.name}</span>
                      </div>
                      {idx < stages.length - 1 && <span className="text-slate-300 font-bold mx-1">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Round-by-Round Management Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Round-by-Round Management & Action Controls
              </h3>

              {stages.map((stage, idx) => {
                const isPassed = idx < currentIdx || isSelected;
                const isCurrent = idx === currentIdx && !isSelected && !isRejected && !isWithdrawn;
                const isFailed = idx === currentIdx && isRejected;

                const historyItem = (application.stageHistory || []).find(
                  (sh) =>
                    sh.stageIndex === idx ||
                    (sh.stageId && stage._id && sh.stageId.toString() === stage._id.toString()) ||
                    (sh.stageName && sh.stageName.toLowerCase() === stage.name.toLowerCase())
                );

                const interview = (application.interviews || []).find(
                  (inv) =>
                    inv.roundNumber === idx + 1 ||
                    (inv.roundName && inv.roundName.toLowerCase().includes(stage.name.toLowerCase()))
                );

                const isInterviewRound = stage.type.includes("Interview") || stage.type === "Group Discussion";
                const isScheduled = historyItem?.status === "Scheduled" || interview?.status?.toLowerCase() === "scheduled";

                return (
                  <div
                    key={stage._id || idx}
                    className={`p-5 rounded-3xl border transition-all ${
                      isCurrent
                        ? "bg-white border-amber-300 shadow-md ring-2 ring-amber-500/10"
                        : isPassed
                        ? "bg-white border-slate-200 shadow-2xs"
                        : isFailed
                        ? "bg-rose-50/30 border-rose-200"
                        : "bg-white border-slate-200/80 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          isPassed
                            ? "bg-emerald-100 text-emerald-800"
                            : isCurrent
                            ? "bg-amber-500 text-white"
                            : isFailed
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {isPassed ? "✓" : isFailed ? "✕" : idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{stage.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {stage.type}
                            </span>
                          </div>
                          {stage.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          isPassed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isCurrent
                            ? isScheduled
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                            : isFailed
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          Status: {isPassed ? "Passed" : isFailed ? "Failed" : isScheduled ? "Scheduled" : isCurrent ? "Active Round" : "Pending"}
                        </span>
                      </div>
                    </div>

                    {/* Interview details if scheduled */}
                    {isScheduled && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <span>📅</span> Interview Scheduled
                          </span>
                          <span className="text-[10.5px] font-semibold text-indigo-700">
                            Mode: {interview?.meetingMode || historyItem?.meetingMode || "Online"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Date</span>
                            <span className="font-bold">{interview?.scheduledDate || historyItem?.scheduledDate || "TBD"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Time</span>
                            <span className="font-bold">{interview?.scheduledTime || interview?.startTime || historyItem?.scheduledTime || "TBD"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Meeting Link</span>
                            {interview?.meetingLink || historyItem?.meetingLink ? (
                              <a
                                href={interview?.meetingLink || historyItem?.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 font-bold hover:underline truncate block"
                              >
                                {interview?.meetingLink || historyItem?.meetingLink}
                              </a>
                            ) : (
                              <span className="text-slate-500 font-medium">Link not set</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage Action Buttons for Current Active Round */}
                    {isCurrent && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2.5 flex-wrap">
                        {isInterviewRound && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetScheduleStage(stage);
                              setScheduleForm({
                                scheduledDate: new Date().toISOString().split("T")[0],
                                startTime: "11:00 AM",
                                duration: stage.configuration?.durationMinutes || 45,
                                interviewType: stage.configuration?.interviewType || "Online",
                                meetingLink: "",
                                location: "",
                                instructions: stage.configuration?.instructions || "",
                                interviewerName: "",
                                interviewerEmail: "",
                              });
                              setScheduleModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>📅</span>
                            <span>{isScheduled ? "Reschedule Interview" : "Schedule Interview"}</span>
                          </button>
                        )}

                        {idx < stages.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ type: "pass", stage });
                              setActionRemarks("");
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>✓</span>
                            <span>Pass Round & Advance Stage</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActionModal({ type: "select", stage });
                              setActionRemarks("");
                            }}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs"
                          >
                            <span>🏆</span>
                            <span>Select Candidate (Final Round Clear)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActionModal({ type: "fail", stage });
                            setActionRemarks("");
                          }}
                          className="px-3.5 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-bold transition"
                        >
                          Mark Failed
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionModal({ type: "reject", stage });
                            setActionRemarks("");
                          }}
                          className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition ml-auto"
                        >
                          Reject Candidate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Final Decision Banner if Decided */}
            {isSelected && (
              <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <h3 className="font-black text-base text-emerald-900">Candidate Selected</h3>
                </div>
                <p className="text-xs text-emerald-800">
                  This candidate has cleared all recruitment rounds and has been officially selected.
                </p>
              </div>
            )}

            {isRejected && (
              <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1 shadow-xs">
                <h3 className="font-bold text-sm text-rose-900">Application Closed / Rejected</h3>
                <p className="text-xs text-rose-800">
                  This candidate application has been marked as rejected. No further round actions are pending.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Schedule Interview Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Schedule {targetScheduleStage?.name || "Interview"}
                </h3>
                <p className="text-xs text-slate-500">Applicant: {studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="11:00 AM"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Interview Mode</label>
                  <select
                    value={scheduleForm.interviewType}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, interviewType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option>Online</option>
                    <option>Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, duration: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              {scheduleForm.interviewType === "Online" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Meeting Link (Google Meet / Zoom)</label>
                  <input
                    type="text"
                    placeholder="https://meet.google.com/..."
                    value={scheduleForm.meetingLink}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Physical Location *</label>
                  <input
                    type="text"
                    placeholder="Office floor / Conference room address"
                    value={scheduleForm.location}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructions for Student</label>
                <textarea
                  rows={2}
                  value={scheduleForm.instructions}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  placeholder="Prepare a 5-minute project walkthrough, check microphone..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Scheduling..." : "Confirm & Send Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Action Modal (Pass, Select, Reject, Fail) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {actionModal.type === "pass" ? "✓" : actionModal.type === "select" ? "🏆" : "⚠️"}
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {actionModal.type === "pass"
                    ? `Clear ${actionModal.stage?.name}`
                    : actionModal.type === "select"
                    ? "Confirm Final Selection"
                    : actionModal.type === "reject"
                    ? "Confirm Rejection"
                    : `Mark ${actionModal.stage?.name} as Failed`}
                </h3>
                <p className="text-xs text-slate-500">Applicant: {studentName}</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Evaluation Remarks & Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter feedback or internal note regarding this round..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  if (actionModal.type === "pass") handlePassStage();
                  else if (actionModal.type === "select") handleSelectCandidate();
                  else if (actionModal.type === "reject") handleRejectCandidate();
                  else if (actionModal.type === "fail") handleMarkFailed(false);
                }}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs disabled:opacity-50 ${
                  actionModal.type === "reject" || actionModal.type === "fail"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
