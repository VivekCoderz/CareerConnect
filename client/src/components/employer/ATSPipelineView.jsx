import React, { useState } from "react";

const STAGES = [
  { id: "Applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Screening", label: "Screening", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "Shortlisted", label: "Shortlisted", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Assessment", label: "Assessment", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "Interview", label: "Interview", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "Offer", label: "Offer", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
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
  const [activeStageFilter, setActiveStageFilter] = useState("All");
  const [noteText, setNoteText] = useState("");

  const filteredApps =
    activeStageFilter === "All"
      ? applications
      : applications.filter((app) => app.status === activeStageFilter);

  const handleStageChange = async (appId, nextStage) => {
    await onUpdateStage(appId, nextStage);
    if (selectedApp && selectedApp._id === appId) {
      setSelectedApp((prev) => ({ ...prev, status: nextStage }));
    }
  };

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedApp) return;
    await onAddNote(selectedApp._id, noteText.trim());
    setNoteText("");
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
              ? "bg-slate-900 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Applicants ({applications.length})
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
                  ? "bg-[#b45309] text-white shadow-2xs font-bold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{s.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
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
          <h4 className="text-sm font-bold text-slate-900">No applicants in this stage</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Candidates who apply to your job listings will appear here automatically with real-time match scores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* List Column */}
          <div className={`${selectedApp ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
            {filteredApps.map((app) => {
              const cand = app.candidateId || {};
              const isSelected = selectedApp?._id === app._id;
              const matchPercent = app.matchScore?.overall || 82;

              return (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`p-4 rounded-2xl border transition cursor-pointer bg-white ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                      : "border-slate-200/80 hover:border-amber-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                        {cand.fullName?.[0] || "C"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{cand.fullName || "Candidate"}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {cand.userType || "Student"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Applied for: <span className="font-semibold text-slate-700">{app.jobId?.title || "Position"}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {cand.email} · {cand.phone || "GU Panipat"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        STAGES.find((s) => s.id === app.status)?.color || "bg-slate-100 text-slate-700"
                      }`}>
                        {app.status}
                      </span>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-600">
                        <span>⚡ {matchPercent}% Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills badges */}
                  {app.matchingDetails?.strongSkills?.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400">Skills:</span>
                      {app.matchingDetails.strongSkills.slice(0, 4).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          ✓ {s}
                        </span>
                      ))}
                      {app.matchingDetails?.missingSkills?.slice(0, 2).map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-semibold">
                          ✕ {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Details & Stage Transition Panel */}
          {selectedApp && (
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4 sticky top-20 h-fit">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedApp.candidateId?.fullName}</h3>
                  <p className="text-[11px] text-slate-500">{selectedApp.jobId?.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Match Details */}
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#92400e]">
                  <span>AI Match Score</span>
                  <span className="text-sm">{selectedApp.matchScore?.overall || 85}%</span>
                </div>
                <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f59e0b] rounded-full"
                    style={{ width: `${selectedApp.matchScore?.overall || 85}%` }}
                  />
                </div>
              </div>

              {/* Move Stage Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Move to Pipeline Stage
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStageChange(selectedApp._id, s.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
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

              {/* Quick Actions */}
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
                  {(selectedApp.internalNotes || []).map((n, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800">{n.author}:</span> {n.note}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendNote} className="flex gap-1.5">
                  <input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add interview note / comment..."
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
    </div>
  );
};

export default ATSPipelineView;
