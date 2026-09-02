import React, { useState, useMemo } from "react";
import CertificateViewerModal from "./CertificateViewerModal";
import CompetencyAssessmentModal from "./CompetencyAssessmentModal";
import learningService from "../../services/learningService";

const LearningAndCertificationsHub = ({
  myLearning = { enrollments: [], certificates: [], learningPaths: [] },
  onRefresh,
  showToast,
  userName = "Verified Professional",
}) => {
  const [activeSubTab, setActiveSubTab] = useState("overview"); // "overview" | "paths" | "mandatory" | "courses" | "certificates" | "history"
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [assessmentEnrollment, setAssessmentEnrollment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const enrollments = myLearning.enrollments || [];
  const stats = myLearning.stats || {
    activeLearningPaths: 4,
    certificationsCount: 6,
    skillsAcquiredCount: 12,
    requiredTrainingCount: 2,
    expiringSoonCount: 1,
    complianceScore: 94,
  };

  const learningPaths = myLearning.learningPaths || [];
  const certificates = myLearning.certificates || [];
  const mandatoryTraining = (myLearning.mandatoryTraining && myLearning.mandatoryTraining.length > 0)
    ? myLearning.mandatoryTraining
    : enrollments.filter((e) => e.trainingType === "Mandatory");
  const recommendedTraining = (myLearning.recommendedTraining && myLearning.recommendedTraining.length > 0)
    ? myLearning.recommendedTraining
    : enrollments.filter((e) => e.trainingType !== "Mandatory");

  // Quick Action Handlers
  const handleCompleteLesson = async (enrollmentId, currentProgress) => {
    try {
      setActionLoading(true);
      const nextProgress = Math.min(100, (currentProgress || 0) + 25);
      await learningService.updateProgress(enrollmentId, nextProgress);
      if (showToast) {
        if (nextProgress >= 100) {
          showToast("Course completed! Take the competency assessment to earn your certificate.");
        } else {
          showToast(`Lesson completed! Progress: ${nextProgress}%`);
        }
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to update progress", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidateCompetencySubmit = async (enrollmentId, payload) => {
    const res = await learningService.validateCompetency({ enrollmentId, ...payload });
    if (showToast && res.passed) {
      showToast("🏆 Competency Validated! Certificate Issued.");
    }
    if (onRefresh) onRefresh();
    return res;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              My Learning, Competencies & Certifications
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based learning roadmaps, mandatory compliance tracking, and verifiable accreditation credentials
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Compliance Score: <strong>{stats.complianceScore}%</strong></span>
          </span>
        </div>
      </div>

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Learning Paths */}
        <div
          onClick={() => setActiveSubTab("paths")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            activeSubTab === "paths" ? "border-blue-600 ring-2 ring-blue-600/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Learning Paths</span>
            <span className="text-sm">🗺️</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.activeLearningPaths || 4}</p>
          <span className="text-[10px] text-blue-600 font-medium">Career roadmaps</span>
        </div>

        {/* Verifiable Certifications */}
        <div
          onClick={() => setActiveSubTab("certificates")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            activeSubTab === "certificates" ? "border-amber-500 ring-2 ring-amber-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Certifications</span>
            <span className="text-sm">🏆</span>
          </div>
          <p className="text-2xl font-black text-amber-800">{certificates.length || stats.certificationsCount || 6}</p>
          <span className="text-[10px] text-amber-600 font-medium">Verifiable credentials</span>
        </div>

        {/* Skills Acquired */}
        <div
          onClick={() => setActiveSubTab("overview")}
          className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Skills Acquired</span>
            <span className="text-sm">⚡</span>
          </div>
          <p className="text-2xl font-black text-purple-800">{stats.skillsAcquiredCount || 12}</p>
          <span className="text-[10px] text-purple-600 font-medium">Competency profile</span>
        </div>

        {/* Required / Mandatory Training */}
        <div
          onClick={() => setActiveSubTab("mandatory")}
          className={`p-4 rounded-3xl bg-white border cursor-pointer transition hover:shadow-sm ${
            activeSubTab === "mandatory" ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Required Training</span>
            <span className="text-sm">⚠️</span>
          </div>
          <p className="text-2xl font-black text-rose-700">{stats.requiredTrainingCount || 2}</p>
          <span className="text-[10px] text-rose-600 font-medium">HR & compliance</span>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => setActiveSubTab("certificates")}
          className="p-4 rounded-3xl bg-amber-500/5 border border-amber-300/80 cursor-pointer hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring Soon</span>
            <span className="text-sm">⌛</span>
          </div>
          <p className="text-2xl font-black text-amber-800">{stats.expiringSoonCount || 1}</p>
          <span className="text-[10px] text-amber-700 font-medium">Requires renewal</span>
        </div>

        {/* Compliance Score */}
        <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-300/80">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Compliance</span>
            <span className="text-sm">🛡️</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-emerald-900 font-mono">{stats.complianceScore || 94}</p>
            <span className="text-xs text-emerald-700 font-bold">%</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Audit ready</span>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="bg-white rounded-3xl p-2 border border-slate-200/80 shadow-2xs flex items-center gap-1 overflow-x-auto scrollbar-thin text-xs">
        {[
          { id: "overview", label: "📊 Learning Overview" },
          { id: "paths", label: "🗺️ Learning Paths" },
          { id: "mandatory", label: "🎯 Mandatory vs Recommended" },
          { id: "courses", label: "📚 Active Courses & Modules" },
          { id: "certificates", label: "🏆 Verifiable Certifications" },
          { id: "history", label: "📜 Learning History & Audit" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-2xl font-bold transition whitespace-nowrap ${
              activeSubTab === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW & COMPETENCY MATRIX */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Priority Skill Gap Callout */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500 text-white">
                  High Priority Skill Gap
                </span>
                <h3 className="text-sm font-bold text-slate-900">Distributed System Architecture & Cloud Scaling</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identified as a critical competency gap for the Engineering & Technology department. Closing this competency will advance your role readiness.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab("paths")}
              className="px-4 py-2.5 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs flex-shrink-0"
            >
              Start System Design Path →
            </button>
          </div>

          {/* Competency Skills Matrix Badges */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Validated Organizational Competencies</h3>
                <p className="text-xs text-slate-500">Skills officially verified through accredited assessments</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                12 Verified Skills
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { name: "React Architecture", level: "Expert", color: "bg-blue-50 text-blue-800 border-blue-200" },
                { name: "Node.js REST APIs", level: "Advanced", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
                { name: "State Management (Redux)", level: "Expert", color: "bg-purple-50 text-purple-800 border-purple-200" },
                { name: "SQL & MongoDB Schemas", level: "Advanced", color: "bg-amber-50 text-amber-800 border-amber-200" },
                { name: "Docker Containerization", level: "Intermediate", color: "bg-teal-50 text-teal-800 border-teal-200" },
                { name: "Agile Scrum Leadership", level: "Advanced", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
                { name: "Technical Interviewing", level: "Expert", color: "bg-rose-50 text-rose-800 border-rose-200" },
                { name: "System Design Fundamentals", level: "Intermediate", color: "bg-amber-50 text-amber-800 border-amber-200" },
              ].map((skill, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${skill.color}`}
                >
                  <span>✓ {skill.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-white text-[10px] font-extrabold text-slate-700 shadow-2xs">
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. LEARNING PATHS */}
      {activeSubTab === "paths" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {learningPaths.map((path) => (
            <div
              key={path.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {path.domain}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-2">{path.title}</h3>
                    <p className="text-xs font-semibold text-[#1e3a8a] mt-0.5">Target: {path.targetRole}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {path.progressPercentage}%
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{path.description}</p>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a8a] to-blue-500 rounded-full"
                    style={{ width: `${path.progressPercentage}%` }}
                  />
                </div>

                {/* Required Competencies Roadmap */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Competency Milestones
                  </span>
                  <div className="space-y-1 text-xs">
                    {path.competencies.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className={`font-medium ${c.status === "Completed" ? "text-slate-800 font-semibold" : "text-slate-600"}`}>
                          {c.status === "Completed" ? "✓" : c.status === "In Progress" ? "⏳" : "○"} {c.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          c.status === "Completed"
                            ? "bg-emerald-50 text-emerald-800"
                            : c.status === "In Progress"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Step */}
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-blue-700 block">Recommended Next Step:</span>
                    <strong className="text-xs">{path.recommendedNext}</strong>
                  </div>
                  <span className="text-lg">→</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab("courses")}
                className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs text-center"
              >
                Continue Learning Path
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: 3. MANDATORY VS RECOMMENDED */}
      {activeSubTab === "mandatory" && (
        <div className="space-y-6">
          {/* Mandatory HR & Compliance */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mandatory Organization Compliance Training</h3>
                  <p className="text-xs text-slate-500">Required by HR & Regulatory Governance</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                Action Required
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Workplace Security & Data Protection (GDPR / ISO)",
                  assignedBy: "Corporate HR & Legal Compliance",
                  deadline: "15 September 2026",
                  status: "In Progress (50%)",
                  urgent: true,
                },
                {
                  title: "Ethical AI Principles & Code of Conduct",
                  assignedBy: "University Governance Committee",
                  deadline: "30 September 2026",
                  status: "Pending Start",
                  urgent: false,
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white">
                        MANDATORY
                      </span>
                      <span className="text-[11px] font-bold text-rose-800">Deadline: {item.deadline}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500">Required by: {item.assignedBy}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab("courses")}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs text-center"
                  >
                    Complete Required Training
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended for Skill Gap Closure */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recommended for Role Advancement & Skill Gap Closure</h3>
              <p className="text-xs text-slate-500">Curated based on your department skill matrix and career targets</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Advanced System Design & Scalability",
                  reason: "Engineering Skill Gap Analysis (High Priority)",
                  tag: "Skill Gap",
                },
                {
                  title: "Cloud Infrastructure as Code (Terraform)",
                  reason: "DevOps & Infrastructure Modernization",
                  tag: "Role Upgrade",
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {item.tag}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500">Reason: {item.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab("courses")}
                    className="w-full py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs text-center"
                  >
                    Enroll & Start Learning
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. ACTIVE COURSES & LESSONS */}
      {activeSubTab === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Active Course Enrollments</h3>
            <span className="text-xs text-slate-500">{enrollments.length} Total Enrolled</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((enroll) => {
              const isCompleted = enroll.status === "Completed" || (enroll.progressPercentage >= 100);
              const course = enroll.courseId || {};

              return (
                <div
                  key={enroll._id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {course.domain || "Technology"}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{course.title || "Master Class"}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {enroll.progressPercentage || 0}% Complete
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{course.description || "Comprehensive hands-on curriculum"}</p>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all"
                        style={{ width: `${enroll.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {!isCompleted ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleCompleteLesson(enroll._id, enroll.progressPercentage)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        + Complete Next Lesson
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCertificate({
                            title: course.title,
                            domain: course.domain,
                            certificateId: enroll.certificateId,
                            competencyLevel: enroll.competencyLevel || "Advanced Level",
                            issueDate: enroll.completedAt,
                            skills: enroll.skillsAcquired || course.skills,
                            status: "Valid",
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <span>🏆</span> View Official Certificate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setAssessmentEnrollment(enroll)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      🧪 Take Competency Quiz
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. CERTIFICATIONS */}
      {activeSubTab === "certificates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Verifiable Professional Credentials</h3>
            <span className="text-xs text-slate-500">{certificates.length} Total Earned</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert, idx) => (
              <div
                key={cert._id || idx}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center text-lg font-black">
                      🏅
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      cert.status === "Expiring Soon"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-emerald-50 text-emerald-800 border-emerald-300"
                    }`}>
                      {cert.status || "Valid"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{cert.title}</h4>
                    <p className="text-[11px] text-amber-800 font-semibold mt-0.5">{cert.domain} • {cert.competencyLevel}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {cert.certificateId}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Issued On:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valid Until:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(cert.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCertificate(cert)}
                    className="flex-1 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs text-center"
                  >
                    View Official Certificate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. LEARNING HISTORY & AUDIT */}
      {activeSubTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Complete Professional Learning Record</h3>
            <span className="text-xs text-slate-500">Official Audit Trail</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11.5px] font-bold text-slate-700">
                  <th className="py-3 px-4">Program / Course</th>
                  <th className="py-3 px-4">Training Type</th>
                  <th className="py-3 px-4">Status & Score</th>
                  <th className="py-3 px-4">Competency Level</th>
                  <th className="py-3 px-4">Credential ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{e.courseId?.title || "Course"}</div>
                      <div className="text-[11px] text-slate-500">{e.courseId?.domain}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                        e.trainingType === "Mandatory"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        {e.trainingType || "Recommended"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{e.status}</span>
                      <span className="text-[11px] text-slate-500 block">Progress: {e.progressPercentage}%</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-amber-900">
                      {e.competencyLevel || "Intermediate"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {e.certificateId || "In Progress"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {e.certificateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertificate({
                              title: e.courseId?.title,
                              domain: e.courseId?.domain,
                              certificateId: e.certificateId,
                              competencyLevel: e.competencyLevel || "Advanced Level",
                              issueDate: e.completedAt,
                              skills: e.skillsAcquired || e.courseId?.skills,
                              status: "Valid",
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition"
                        >
                          View Credential
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Official Verifiable Certificate Viewer */}
      <CertificateViewerModal
        isOpen={Boolean(selectedCertificate)}
        onClose={() => setSelectedCertificate(null)}
        certificate={selectedCertificate}
        recipientName={userName}
      />

      {/* 2. Competency Validation Assessment */}
      <CompetencyAssessmentModal
        isOpen={Boolean(assessmentEnrollment)}
        onClose={() => setAssessmentEnrollment(null)}
        enrollment={assessmentEnrollment}
        onValidated={handleValidateCompetencySubmit}
      />
    </div>
  );
};

export default LearningAndCertificationsHub;
