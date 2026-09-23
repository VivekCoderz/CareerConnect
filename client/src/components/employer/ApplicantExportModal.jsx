import React, { useState, useMemo } from "react";

export default function ApplicantExportModal({
  isOpen,
  onClose,
  jobs = [],
  applications = [],
  initialJobId = "All",
  initialStage = "All",
  companyName = "CareerConnect Employer",
}) {
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || "All");
  const [selectedStage, setSelectedStage] = useState(initialStage || "All");
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "print"

  if (!isOpen) return null;

  // Selected Job Object
  const currentJob = jobs.find(
    (j) => (j._id || j.id)?.toString() === selectedJobId
  );

  // Available stages for the chosen job
  const availableStages = useMemo(() => {
    if (currentJob && Array.isArray(currentJob.recruitmentStages) && currentJob.recruitmentStages.length > 0) {
      return [...currentJob.recruitmentStages].sort((a, b) => a.order - b.order);
    }
    return [
      { name: "Resume Screening", order: 0 },
      { name: "Technical Interview", order: 1 },
      { name: "HR Interview", order: 2 },
    ];
  }, [currentJob]);

  // Filter applications by Job
  const jobApps = useMemo(() => {
    if (selectedJobId === "All") return applications;
    return applications.filter((app) => {
      const jId = (app.jobId?._id || app.jobId)?.toString();
      return jId === selectedJobId;
    });
  }, [applications, selectedJobId]);

  // Extract clean candidate information
  const getCandidateRow = (app, idx) => {
    const cand = app.candidateId || {};
    const appData = app.applicationData || {};

    const name = app.studentName || appData.fullName || cand.fullName || "Candidate";
    const email = app.studentEmail || appData.email || cand.email || "N/A";
    const phone = app.studentPhone || appData.phone || cand.phone || "N/A";
    const college = appData.college || "CareerConnect Partner Campus";
    const education = app.education || appData.education || appData.degree || "B.Tech / Graduate";
    const experience = app.experience || appData.experience || "Fresher";

    let skillsStr = "";
    if (Array.isArray(app.skills)) {
      skillsStr = app.skills.join(", ");
    } else if (typeof app.skills === "string") {
      skillsStr = app.skills;
    } else if (Array.isArray(appData.skills)) {
      skillsStr = appData.skills.join(", ");
    } else {
      skillsStr = "N/A";
    }

    const jobTitle = app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Job Opening";
    const currentRound = app.currentStageName || app.stage || "Resume Screening";
    const status = app.overallStatus || app.status || "In Review";

    // Stage history feedback or remarks
    const latestFeedback =
      app.stageHistory?.slice(-1)[0]?.feedback ||
      app.stageHistory?.slice(-1)[0]?.remarks ||
      app.decisionRemarks ||
      app.selectionRemarks ||
      "";

    // Scheduled interview info
    const interviewInfo = app.latestInterview
      ? `${app.latestInterview.scheduledDate || ""} ${app.latestInterview.startTime || ""}`.trim()
      : "Not scheduled";

    const appliedDate = app.appliedAt || app.createdAt
      ? new Date(app.appliedAt || app.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    const resume = app.resumeUrl || appData.resumeUrl || "";

    return {
      sNo: idx + 1,
      id: app._id,
      name,
      email,
      phone,
      college,
      education,
      experience,
      skills: skillsStr,
      jobTitle,
      currentRound,
      status,
      latestFeedback: latestFeedback || "None",
      interviewInfo,
      appliedDate,
      resume,
    };
  };

  // Filter applications by Stage
  const filteredRows = useMemo(() => {
    const list = jobApps.filter((app) => {
      if (selectedStage === "All") return true;

      const isSelected = app.overallStatus === "Selected" || app.status === "Selected";
      const isRejected = app.overallStatus === "Rejected" || app.status === "Rejected";

      if (selectedStage === "Selected") return isSelected;
      if (selectedStage === "Rejected") return isRejected;

      const stName = (app.currentStageName || app.stage || "").toLowerCase();
      return !isSelected && !isRejected && stName === selectedStage.toLowerCase();
    });

    return list.map((app, idx) => getCandidateRow(app, idx));
  }, [jobApps, selectedStage]);

  // CSV Generator
  const handleDownloadCSV = () => {
    if (filteredRows.length === 0) {
      alert("No applicant records found to export.");
      return;
    }

    const headers = [
      "S.No",
      "Candidate Name",
      "Email Address",
      "Phone Number",
      "College / University",
      "Degree / Program",
      "Experience",
      "Skills",
      "Applied Role",
      "Current Stage / Round",
      "Application Status",
      "Evaluator Feedback",
      "Interview Scheduled",
      "Applied Date",
      "Resume Link",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.map(escapeCsv).join(","),
      ...filteredRows.map((r) =>
        [
          r.sNo,
          r.name,
          r.email,
          r.phone,
          r.college,
          r.education,
          r.experience,
          r.skills,
          r.jobTitle,
          r.currentRound,
          r.status,
          r.latestFeedback,
          r.interviewInfo,
          r.appliedDate,
          r.resume,
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeJob = (currentJob?.title || "All_Jobs").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeStage = selectedStage.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);

    link.setAttribute("href", url);
    link.setAttribute("download", `Applicants_${safeJob}_${safeStage}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Direct Browser Print (Save as PDF)
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-in-top">
        {/* Modal Top Bar (Hidden on native print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Export Applicant Roster
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate Excel / CSV spreadsheet or download a formatted PDF report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeTab === "preview"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Data Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("print")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activeTab === "print"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                PDF View
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Selection Strip (Hidden on native print) */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Job Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="export-job-select" className="text-xs font-bold text-slate-600">
                Job Vacancy:
              </label>
              <select
                id="export-job-select"
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setSelectedStage("All");
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="All">All Jobs & Openings ({applications.length})</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage / Round Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="export-stage-select" className="text-xs font-bold text-slate-600">
                Recruitment Round:
              </label>
              <select
                id="export-stage-select"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="All">All Stages / Applicants ({jobApps.length})</option>
                {availableStages.map((s, idx) => (
                  <option key={idx} value={s.name}>
                    Round {idx + 1}: {s.name}
                  </option>
                ))}
                <option value="Selected">Selected / Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Download / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {filteredRows.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">No applicants found for the selected criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try switching the job opening or stage filter above.</p>
            </div>
          ) : activeTab === "preview" ? (
            /* Table Data Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>
                  Showing <strong className="text-slate-900">{filteredRows.length}</strong> applicant records
                </span>
                <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {currentJob ? currentJob.title : "All Postings"} · Stage: {selectedStage}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">Candidate</th>
                      <th className="py-3 px-3.5">Contact</th>
                      <th className="py-3 px-3.5">College & Degree</th>
                      <th className="py-3 px-3.5">Skills</th>
                      <th className="py-3 px-3.5">Current Stage</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5">Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3.5 font-bold text-slate-400">{row.sNo}</td>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-slate-900">{row.name}</p>
                          <p className="text-[10px] text-slate-500">{row.jobTitle}</p>
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="text-slate-800">{row.email}</p>
                          <p className="text-[11px] text-slate-400">{row.phone}</p>
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="font-medium text-slate-800">{row.education}</p>
                          <p className="text-[10.5px] text-slate-400">{row.college}</p>
                        </td>
                        <td className="py-3 px-3.5 max-w-[180px] truncate" title={row.skills}>
                          {row.skills}
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-indigo-700">
                          {row.currentRound}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === "Selected"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : row.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {row.appliedDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Printable PDF Report View */
            <div id="applicant-pdf-report" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-6">
              {/* Report Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Candidate Evaluation & Applicant Roster
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {companyName} • CareerConnect Recruitment Intelligence
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Export Date
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {new Date().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Metrics Summary Strip */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Job</span>
                  <span className="text-xs font-bold text-slate-900 truncate block">
                    {currentJob ? currentJob.title : "All Job Vacancies"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pipeline Round</span>
                  <span className="text-xs font-bold text-indigo-700 block">{selectedStage}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Candidates</span>
                  <span className="text-xs font-bold text-slate-900 block">{filteredRows.length}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shortlisted / Selected</span>
                  <span className="text-xs font-bold text-emerald-600 block">
                    {filteredRows.filter((r) => r.status === "Selected").length}
                  </span>
                </div>
              </div>

              {/* Formatted Candidate Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Candidate Details</th>
                    <th className="py-2.5 px-2">Education & College</th>
                    <th className="py-2.5 px-2">Skills</th>
                    <th className="py-2.5 px-2">Stage & Status</th>
                    <th className="py-2.5 px-2">Evaluator Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="text-[11.5px]">
                      <td className="py-2.5 px-2 font-bold text-slate-400 align-top">{row.sNo}</td>
                      <td className="py-2.5 px-2 align-top">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-[10.5px] text-slate-500">{row.email}</p>
                        <p className="text-[10.5px] text-slate-500">{row.phone}</p>
                      </td>
                      <td className="py-2.5 px-2 align-top">
                        <p className="font-semibold text-slate-800">{row.education}</p>
                        <p className="text-[10.5px] text-slate-500">{row.college}</p>
                        <p className="text-[10.5px] text-slate-400">Exp: {row.experience}</p>
                      </td>
                      <td className="py-2.5 px-2 text-[10.5px] text-slate-600 align-top max-w-[140px]">
                        {row.skills}
                      </td>
                      <td className="py-2.5 px-2 align-top">
                        <p className="font-bold text-indigo-700">{row.currentRound}</p>
                        <span className="inline-block mt-0.5 text-[9.5px] font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                          {row.status}
                        </span>
                        {row.interviewInfo !== "Not scheduled" && (
                          <p className="text-[9.5px] text-slate-500 mt-1">
                            📅 {row.interviewInfo}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-[10.5px] text-slate-600 italic align-top max-w-[150px]">
                        {row.latestFeedback}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Printable Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Confidential • For Internal Hiring Evaluation Only</span>
                <span>Page 1 of 1 • CareerConnect Enterprise</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
