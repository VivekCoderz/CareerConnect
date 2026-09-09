import React, { useState } from "react";

const STAGES = [
  { id: "Applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Approved", label: "Approved", color: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" },
  { id: "Screening", label: "Screening", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Shortlisted", label: "Shortlisted", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Assessment", label: "Assessment", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Interview", label: "Interview", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "Offer", label: "Offer", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "Hired", label: "Hired", color: "bg-green-100 text-green-800 border-green-300" },
  { id: "Rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

const ATSPipelineView = ({
  applications = [],
  onUpdateStage,
  onScheduleInterview,
  onCreateOffer,
  onAddNote,
}) => {
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewingApp, setViewingApp] = useState(null);
  const [activeStageFilter, setActiveStageFilter] = useState("All");
  const [noteText, setNoteText] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  const filteredApps =
    activeStageFilter === "All"
      ? applications
      : applications.filter((app) => app.status === activeStageFilter);

  const handleStageChange = async (appId, nextStage) => {
    setActionLoading((prev) => ({ ...prev, [appId]: true }));
    try {
      await onUpdateStage(appId, nextStage);
      if (selectedApp && selectedApp._id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: nextStage, stage: nextStage }));
      }
      if (viewingApp && viewingApp._id === appId) {
        setViewingApp((prev) => ({ ...prev, status: nextStage, stage: nextStage }));
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: false }));
    }
  };

  const handleApprove = async (appId) => {
    await handleStageChange(appId, "Approved");
  };

  const handleReject = async (appId) => {
    await handleStageChange(appId, "Rejected");
  };

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedApp) return;
    await onAddNote(selectedApp._id, noteText.trim());
    setNoteText("");
  };

  // Helper to extract student display data
  const getStudentInfo = (app) => {
    const cand = app.candidateId || {};
    const appData = app.applicationData || {};

    const name = app.studentName || appData.fullName || cand.fullName || "Candidate";
    const email = app.studentEmail || appData.email || cand.email || "N/A";
    const phone = app.studentPhone || appData.phone || cand.phone || "N/A";
    const address = appData.address || "N/A";
    const education = app.education || appData.education || appData.degree || "B.Tech CSE";
    const college = appData.college || "Geeta University";
    const graduationYear = appData.graduationYear || "";
    
    let skillsList = [];
    if (Array.isArray(app.skills) && app.skills.length > 0) {
      skillsList = app.skills;
    } else if (Array.isArray(appData.skills)) {
      skillsList = appData.skills;
    } else if (typeof appData.skills === "string" && appData.skills.trim()) {
      skillsList = appData.skills.split(",").map((s) => s.trim());
    } else if (typeof app.skills === "string" && app.skills.trim()) {
      skillsList = app.skills.split(",").map((s) => s.trim());
    }

    const experience = app.experience || appData.experience || "Fresher";
    const portfolioUrl = app.portfolioUrl || appData.portfolioUrl || "";
    const resumeUrl = app.resumeUrl || appData.resumeUrl || "";
    const coverLetter = app.coverLetter || app.coverNote || appData.coverLetter || appData.coverNote || "";
    const positionTitle = app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Position";
    const positionType = app.opportunityType || (app.internshipId ? "Internship" : "Job");
    const appliedDate = app.appliedAt || app.createdAt
      ? new Date(app.appliedAt || app.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Recently";

    return {
      name,
      email,
      phone,
      address,
      education,
      college,
      graduationYear,
      skillsList,
      experience,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      positionTitle,
      positionType,
      appliedDate,
    };
  };

  return (
    <div className="space-y-4">
      {/* Top Stage Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveStageFilter("All")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
            activeStageFilter === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Applications ({applications.length})
        </button>
        {STAGES.map((s) => {
          const count = applications.filter((a) => a.status === s.id).length;
          const isActive = activeStageFilter === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStageFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? "bg-[#b45309] text-white shadow-xs font-bold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Applications List / Table */}
      {filteredApps.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#b45309] flex items-center justify-center mx-auto mb-3 text-xl">
            📑
          </div>
          <h4 className="text-sm font-bold text-slate-900">No applications in this category</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Applications submitted by students for your posted jobs and internships will appear here dynamically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* List Column */}
          <div className={`${selectedApp ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
            {filteredApps.map((app) => {
              const info = getStudentInfo(app);
              const isSelected = selectedApp?._id === app._id;
              const isLoading = Boolean(actionLoading[app._id]);

              return (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-5 rounded-3xl border transition cursor-pointer bg-white space-y-3 ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                      : "border-slate-200/80 hover:border-amber-300 shadow-2xs"
                  }`}
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                        {info.name[0] || "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{info.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {info.positionType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Position: <strong className="text-slate-800">{info.positionTitle}</strong>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          📧 {info.email} · 📱 {info.phone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border inline-block ${
                          STAGES.find((s) => s.id === app.status)?.color || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {app.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">Applied: {info.appliedDate}</p>
                    </div>
                  </div>

                  {/* Candidate Details summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Education</span>
                      <span className="font-semibold text-slate-800">{info.education}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Experience</span>
                      <span className="font-semibold text-slate-800">{info.experience}</span>
                    </div>
                  </div>

                  {/* Skills badges */}
                  {info.skillsList.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Skills:</span>
                      {info.skillsList.slice(0, 5).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10.5px] font-semibold border border-blue-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingApp(app);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                    >
                      <span>👁️</span>
                      <span>View Application</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoading || app.status === "Approved"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(app._id);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                          app.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                        }`}
                      >
                        {isLoading ? (
                          <span>Updating...</span>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>{app.status === "Approved" ? "Approved" : "Approve"}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isLoading || app.status === "Rejected"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(app._id);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                          app.status === "Rejected"
                            ? "bg-rose-100 text-rose-800 cursor-default"
                            : "bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                        }`}
                      >
                        <span>✕</span>
                        <span>{app.status === "Rejected" ? "Rejected" : "Reject"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details & Stage Transition Side Panel */}
          {selectedApp && (
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4 sticky top-20 h-fit">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {getStudentInfo(selectedApp).name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {getStudentInfo(selectedApp).positionTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Current Status</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    STAGES.find((s) => s.id === selectedApp.status)?.color || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {selectedApp.status}
                </span>
              </div>

              {/* Primary Direct Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={Boolean(actionLoading[selectedApp._id]) || selectedApp.status === "Approved"}
                  onClick={() => handleApprove(selectedApp._id)}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>✓</span> Approve Application
                </button>

                <button
                  type="button"
                  disabled={Boolean(actionLoading[selectedApp._id]) || selectedApp.status === "Rejected"}
                  onClick={() => handleReject(selectedApp._id)}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>✕</span> Reject Application
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingApp(selectedApp)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <span>📄 View Complete Application Form</span>
              </button>

              {/* Pipeline Stage Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Change Pipeline Stage
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={Boolean(actionLoading[selectedApp._id])}
                      onClick={() => handleStageChange(selectedApp._id, s.id)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition text-center ${
                        selectedApp.status === s.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Interview / Offer buttons */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onScheduleInterview && onScheduleInterview(selectedApp)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>📅</span> Schedule Interview
                </button>
                <button
                  type="button"
                  onClick={() => onCreateOffer && onCreateOffer(selectedApp)}
                  className="w-full py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>📜</span> Generate Job Offer
                </button>
              </div>

              {/* Internal Notes */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Recruiter Notes</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(selectedApp.notes || []).map((n, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600">
                      {n.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendNote} className="flex gap-1.5">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add recruiter note..."
                    className="flex-1 h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#f59e0b]"
                  />
                  <button
                    type="submit"
                    className="px-3 h-8 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                  >
                    Save
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PART 5: COMPLETE APPLICATION VIEW MODAL                  */}
      {/* ======================================================== */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            {(() => {
              const info = getStudentInfo(viewingApp);
              const isLoading = Boolean(actionLoading[viewingApp._id]);

              return (
                <>
                  <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white relative">
                    <button
                      type="button"
                      onClick={() => setViewingApp(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-sm font-bold"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {info.positionType}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 text-white border border-white/20">
                        Status: {viewingApp.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{info.name}</h2>
                    <p className="text-xs font-medium text-blue-200 mt-1">
                      Applied for: <strong className="text-white">{info.positionTitle}</strong> · {info.appliedDate}
                    </p>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
                    {/* Section 1: Personal Information */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Full Name
                          </span>
                          <span className="font-semibold text-slate-800">{info.name}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Email Address
                          </span>
                          <a href={`mailto:${info.email}`} className="font-semibold text-blue-600 hover:underline">
                            {info.email}
                          </a>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Phone Number
                          </span>
                          <a href={`tel:${info.phone}`} className="font-semibold text-slate-800 hover:underline">
                            {info.phone}
                          </a>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Address / Location
                          </span>
                          <span className="font-semibold text-slate-800">{info.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Education */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Education & Academic Background
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Degree / Course
                          </span>
                          <span className="font-semibold text-slate-800">{info.education}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            College / University
                          </span>
                          <span className="font-semibold text-slate-800">{info.college}</span>
                        </div>
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                            Graduation Year
                          </span>
                          <span className="font-semibold text-slate-800">{info.graduationYear || "Not specified"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Professional & Skills */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Professional Information & Skills
                      </h4>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-3">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Skills
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {info.skillsList.length > 0 ? (
                              info.skillsList.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                                >
                                  ✓ {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500">Not specified</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Experience Summary
                          </span>
                          <span className="font-semibold text-slate-800">{info.experience}</span>
                        </div>

                        {info.portfolioUrl && (
                          <div>
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              Portfolio / GitHub Link
                            </span>
                            <a
                              href={info.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>{info.portfolioUrl}</span>
                              <span>↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 4: Documents */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Documents & Pitch
                      </h4>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-3">
                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Submitted Resume
                          </span>
                          {info.resumeUrl ? (
                            <a
                              href={info.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold shadow-xs hover:bg-blue-800 transition"
                            >
                              <span>📄</span>
                              <span>View / Download Resume</span>
                              <span>↗</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No resume URL provided</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Cover Letter / Note
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                            {info.coverLetter || "No cover letter submitted."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setViewingApp(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition"
                    >
                      Close
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoading || viewingApp.status === "Approved"}
                        onClick={() => handleApprove(viewingApp._id)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                          viewingApp.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                        }`}
                      >
                        {isLoading ? (
                          <span>Updating...</span>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>{viewingApp.status === "Approved" ? "Approved" : "Approve Application"}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isLoading || viewingApp.status === "Rejected"}
                        onClick={() => handleReject(viewingApp._id)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                          viewingApp.status === "Rejected"
                            ? "bg-rose-100 text-rose-800 cursor-default"
                            : "bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                        }`}
                      >
                        <span>✕</span>
                        <span>{viewingApp.status === "Rejected" ? "Rejected" : "Reject Application"}</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSPipelineView;
