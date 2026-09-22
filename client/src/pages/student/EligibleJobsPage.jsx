// client/src/pages/student/EligibleJobsPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Briefcase,
  Building2,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Sliders,
  Users,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Filter,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Send,
} from "lucide-react";
import {
  getEligibleJobsForStudent,
  getEligibleJobDetails,
  applyToEligibleJob,
} from "../../services/jobVisibilityService";
import BrandLogo from "../../components/common/BrandLogo";

export default function EligibleJobsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    student: null,
    counts: { total: 0, onCampus: 0, offCampus: 0, eligible: 0 },
    jobs: [],
  });

  const [selectedScope, setSelectedScope] = useState("All"); // "All" | "On-Campus" | "Open / Off-Campus"
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal & Application Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appSuccess, setAppSuccess] = useState("");
  const [appError, setAppError] = useState("");

  useEffect(() => {
    fetchEligibleJobs();
  }, [selectedScope, onlyEligible]);

  const fetchEligibleJobs = async () => {
    try {
      setLoading(true);
      const res = await getEligibleJobsForStudent({
        scope: selectedScope,
        onlyEligible: onlyEligible ? "true" : "false",
      });
      if (res.success) {
        setData({
          student: res.student || null,
          counts: res.counts || { total: 0, onCampus: 0, offCampus: 0, eligible: 0 },
          jobs: res.jobs || [],
        });
      }
    } catch (err) {
      console.error("Failed to load eligible jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyingJob) return;
    setAppError("");
    setAppSuccess("");
    setSubmittingApp(true);

    try {
      const res = await applyToEligibleJob(applyingJob._id, { coverNote });
      if (res.success) {
        setAppSuccess("Application submitted successfully! Your verified profile was shared with the employer.");
        setCoverNote("");
        // Update local status
        setData((prev) => ({
          ...prev,
          jobs: prev.jobs.map((j) => (j._id === applyingJob._id ? { ...j, hasApplied: true } : j)),
        }));
        setTimeout(() => {
          setApplyingJob(null);
          setAppSuccess("");
        }, 1500);
      }
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setSubmittingApp(false);
    }
  };

  // Filter by search query in title, company, or skills
  const filteredJobs = data.jobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = job.title?.toLowerCase().includes(q);
    const compMatch = job.companyName?.toLowerCase().includes(q);
    const skillMatch = job.visibilityConfig?.requiredSkills?.some((s) => s.toLowerCase().includes(q));
    return titleMatch || compMatch || skillMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/student/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">Eligible Opportunities</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                Backend Security Enforced
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/profile"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
            >
              <span>View Profile & Skills</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verified Student Profile Badge Banner */}
        {data.student && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Institution & Skill Verification Active
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome, {data.student.fullName || user?.fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-slate-300 text-xs sm:text-sm mt-1.5">
                  <span className="flex items-center gap-1 font-medium text-white">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    {data.student.institution || "Geeta University"}
                  </span>
                  {data.student.degree && (
                    <>
                      <span>•</span>
                      <span>{data.student.degree}</span>
                    </>
                  )}
                  {data.student.endYear && (
                    <>
                      <span>•</span>
                      <span>Class of {data.student.endYear}</span>
                    </>
                  )}
                </div>

                {/* Profile Skills Chips */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-medium mr-1">Your Verified Skills:</span>
                  {data.student.skills && data.student.skills.length > 0 ? (
                    data.student.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-0.5 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/10"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-300 italic">
                      No skills added yet. Update your profile to qualify for skill-based jobs!
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats counter */}
              <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs shrink-0">
                <div className="text-center px-3 border-r border-white/15">
                  <div className="text-2xl font-black text-emerald-400">{data.counts.eligible}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                    100% Eligible
                  </div>
                </div>
                <div className="text-center px-3 border-r border-white/15">
                  <div className="text-2xl font-black text-amber-400">{data.counts.onCampus}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                    On-Campus
                  </div>
                </div>
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-blue-400">{data.counts.offCampus}</div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                    Open / Off-Campus
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Scope Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedScope("All")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                selectedScope === "All"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Visible ({data.counts.total})
            </button>

            <button
              type="button"
              onClick={() => setSelectedScope("On-Campus")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedScope === "On-Campus"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              🏛️ On-Campus Drives ({data.counts.onCampus})
            </button>

            <button
              type="button"
              onClick={() => setSelectedScope("Open / Off-Campus")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedScope === "Open / Off-Campus"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              🌐 Open / Off-Campus ({data.counts.offCampus})
            </button>
          </div>

          {/* Search and Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>100% Eligible Only</span>
            </label>
          </div>
        </div>

        {/* =========================================================================
            JOB OPPORTUNITY CARDS
        ========================================================================= */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Evaluating your eligibility for campus drives...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No matching eligible opportunities found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search filter or updating your profile skills in the Student Profile settings.
            </p>
            {onlyEligible && (
              <button
                type="button"
                onClick={() => setOnlyEligible(false)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
              >
                Show All Visible Opportunities
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => {
              const cfg = job.visibilityConfig || {};
              const evalRes = job.evaluation || {};
              const isCampus = cfg.hiringScope === "On-Campus";
              const targetInst = cfg.targetInstitution || "Geeta University";
              const isEligible = evalRes.isEligible;
              const matchScore = evalRes.matchScore || 0;
              const matchedSkills = evalRes.matchedSkills || [];
              const missingSkills = evalRes.missingSkills || [];

              return (
                <div
                  key={job._id}
                  className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                    isEligible
                      ? "border-emerald-200/80 hover:border-emerald-300"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                          isCampus
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-100 text-blue-900 border border-blue-300"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        {isCampus ? `🏛️ On-Campus: ${targetInst}` : "🌐 Open Off-Campus"}
                      </span>

                      {/* Eligibility Status Pill */}
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          100% Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                          Skill/Criteria Gap
                        </span>
                      )}
                    </div>

                    {/* Job Title & Company */}
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{job.title}</h3>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">
                      {job.companyName || "CareerConnect Partner"} • {job.workMode} • {job.location}
                    </p>

                    {/* Match Score Progress Bar */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700">Skill Compatibility</span>
                        <span className={`font-bold ${matchScore >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                          {matchScore}% Match
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            matchScore === 100
                              ? "bg-emerald-500"
                              : matchScore >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${matchScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Skill Matching Chips */}
                    <div className="mt-3 space-y-1.5">
                      {matchedSkills.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-emerald-700 block mb-1">
                            ✓ Matched in your profile:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {matchedSkills.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {missingSkills.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-amber-700 block mb-1">
                            Required skills you don't have listed:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {missingSkills.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Academic Criteria Met Checklist */}
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            evalRes.breakdown?.institutionMatch ? "text-emerald-500" : "text-rose-500"
                          }`}
                        />
                        <span>
                          Campus: <strong className="text-slate-800">{targetInst}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            evalRes.breakdown?.degreeMatch ? "text-emerald-500" : "text-rose-500"
                          }`}
                        />
                        <span>
                          Degree:{" "}
                          <strong className="text-slate-800">
                            {cfg.eligibilityCriteria?.degrees?.join(", ") || "Any Graduate"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>

                    {job.hasApplied ? (
                      <span className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                        <Check className="w-4 h-4 text-emerald-600" />
                        Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setApplyingJob(job)}
                        disabled={!isEligible}
                        className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                          isEligible
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            JOB DETAILS MODAL
        ========================================================================= */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold mb-2 ${
                      selectedJob.visibilityConfig?.hiringScope === "On-Campus"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {selectedJob.visibilityConfig?.hiringScope === "On-Campus"
                      ? `🏛️ On-Campus: ${selectedJob.visibilityConfig?.targetInstitution}`
                      : "🌐 Open Off-Campus"}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{selectedJob.title}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedJob.companyName} • {selectedJob.location} • {selectedJob.employmentType}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Eligibility Breakdown Section */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Your Eligibility Verification Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        selectedJob.evaluation?.breakdown?.institutionMatch ? "text-emerald-600" : "text-rose-500"
                      }`}
                    />
                    <span>Institution: {selectedJob.evaluation?.targetInstitution}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        selectedJob.evaluation?.breakdown?.skillsMatch ? "text-emerald-600" : "text-amber-500"
                      }`}
                    />
                    <span>Skills: {selectedJob.evaluation?.matchScore}% Compatibility</span>
                  </div>
                </div>

                {selectedJob.evaluation?.reasons?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-amber-800">
                    <strong>Notice:</strong> {selectedJob.evaluation.reasons.join(" • ")}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">Description</h4>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {selectedJob.description}
                  </p>
                </div>

                {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                      Key Responsibilities
                    </h4>
                    <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                      {selectedJob.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 text-slate-600 text-xs font-semibold hover:text-slate-800"
                >
                  Close
                </button>
                {!selectedJob.hasApplied && selectedJob.evaluation?.isEligible && (
                  <button
                    type="button"
                    onClick={() => {
                      const j = selectedJob;
                      setSelectedJob(null);
                      setApplyingJob(j);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Apply for Position
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            APPLY MODAL
        ========================================================================= */}
        {applyingJob && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Submit Application</h3>
                  <p className="text-xs text-slate-500">{applyingJob.title} • {applyingJob.companyName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setApplyingJob(null);
                    setAppError("");
                    setAppSuccess("");
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {appSuccess ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-900 text-base">Application Sent!</h4>
                  <p className="text-xs text-slate-500 mt-1">{appSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleApply} className="mt-4 space-y-4">
                  {appError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      {appError}
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Automatic Verification Passed
                    </div>
                    <p className="text-emerald-700">
                      Your institution ({data.student?.institution || "Geeta University"}) and skills were verified.
                      Your application will flow directly into the company's ATS candidate pool.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Cover Note (Optional)
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Briefly explain why you're a great fit for this role..."
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setApplyingJob(null)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingApp}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {submittingApp ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
