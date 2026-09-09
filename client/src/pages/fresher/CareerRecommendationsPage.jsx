import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useLogout from "../../hooks/useLogout";
import recommendationService from "../../services/recommendationService";
import api from "../../api/api";

// Layout
import FresherSidebar from "../../components/fresher-dashboard/FresherSidebar";
import FresherNavbar from "../../components/fresher-dashboard/FresherNavbar";

const CareerRecommendationsPage = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);

  // Layout & UI State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | jobs | skills | projects | paths
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Data State
  const [data, setData] = useState(null);

  // Filter State for Jobs Tab
  const [jobSearch, setJobSearch] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("All");

  // Modals
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [selectedJobExplanation, setSelectedJobExplanation] = useState(null);
  const [selectedProjectModal, setSelectedProjectModal] = useState(null);

  // Preferences Form
  const [prefForm, setPrefForm] = useState({
    targetRole: "",
    careerGoal: "",
    preferredLocations: "",
    workMode: "Remote",
    expectedSalaryMin: 4,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRecommendations = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await recommendationService.getRecommendationsOverview();
      if (res?.success && res?.data) {
        setData(res.data);
        if (res.data.careerSummary) {
          setPrefForm({
            targetRole: res.data.careerSummary.targetRole || "Full Stack Developer",
            careerGoal: res.data.careerSummary.careerGoal || "Get my first full-time job",
            preferredLocations: res.data.careerSummary.preferredLocations || "Bangalore, Remote",
            workMode: res.data.careerSummary.workMode?.split(" / ")[0] || "Remote",
            expectedSalaryMin: 4,
          });
        }
      }
      if (isManualRefresh) {
        showToast("✓ Recommendations refreshed with latest market data.", "success");
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setError("Unable to load recommendations. Please retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      const locArray = prefForm.preferredLocations
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      await api.patch("/fresher/profile", {
        targetRole: prefForm.targetRole,
        careerGoal: prefForm.careerGoal,
        jobPreferences: {
          preferredRoles: [prefForm.targetRole],
          preferredLocations: locArray,
          workMode: [prefForm.workMode],
          expectedSalary: {
            min: Number(prefForm.expectedSalaryMin) * 100000,
            max: (Number(prefForm.expectedSalaryMin) + 4) * 100000,
            currency: "INR (LPA)",
          },
        },
      });

      setShowPreferenceModal(false);
      showToast("Career preferences updated! Recalculating...", "success");
      fetchRecommendations(true);
    } catch (err) {
      console.error("Failed to update preferences:", err);
      showToast("Failed to save preferences.", "error");
    }
  };

  const handleApplyJob = async (job) => {
    try {
      const res = await api.post("/applications", {
        jobId: job._id || job.id,
        opportunityType: "Job",
        opportunityTitle: job.title,
        companyName: job.company,
        coverNote: `Applying for ${job.title} based on personalized Fresher Recommendation match (${job.matchScore}%).`,
      });

      if (res.data?.success) {
        showToast(`✓ Applied to ${job.company}!`, "success");
        fetchRecommendations();
      } else {
        showToast(res.data?.message || "Application submitted.", "info");
      }
    } catch (err) {
      console.error("Apply error:", err);
      showToast(err.response?.data?.message || "Failed to submit application.", "error");
    }
  };

  const careerSummary = data?.careerSummary || {};
  const topOverallMatch = data?.topOverallMatch || {};
  const recommendedJobs = data?.recommendedJobs || [];
  const skillGapAnalysis = data?.skillGapAnalysis || {};
  const recommendedCourses = data?.recommendedCourses || [];
  const recommendedProjects = data?.recommendedProjects || [];
  const resumeRecommendations = data?.resumeRecommendations || [];
  const careerPaths = data?.careerPaths || [];
  const actionPlan = data?.actionPlan || {};

  // Filtered jobs for Jobs tab
  const filteredJobs = recommendedJobs.filter((job) => {
    const matchesSearch =
      !jobSearch ||
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.company.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.requiredSkills.some((s) => s.toLowerCase().includes(jobSearch.toLowerCase()));

    const matchesWorkMode =
      workModeFilter === "All" ||
      (job.workMode || "").toLowerCase() === workModeFilter.toLowerCase();

    return matchesSearch && matchesWorkMode;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <FresherSidebar
        activeTab="recommendations"
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <FresherNavbar
          user={user}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onLogout={logout}
          onSearch={(q) => navigate(`/jobs?search=${encodeURIComponent(q)}`)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6 animate-fade-in">
          {/* ============================================================
              1. CLEAN TOP HEADER WITH COMPACT SUMMARY
          ============================================================ */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Career Recommendations
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personalized next steps and job market insights for your profile.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreferenceModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                >
                  ⚙️ Preferences
                </button>
                <button
                  type="button"
                  onClick={() => fetchRecommendations(true)}
                  disabled={refreshing}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className={refreshing ? "animate-spin" : ""}>🔄</span>
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Quick Profile Summary Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                🎯 <strong>{careerSummary.targetRole || "Full Stack Developer"}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                📍 {careerSummary.preferredLocations || "Remote / Pan-India"}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                💼 {careerSummary.workMode || "Remote"}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                🎓 Fresher (0–1 yr)
              </span>
            </div>
          </div>

          {/* ============================================================
              2. FOCUSED CATEGORY TABS
          ============================================================ */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: "overview", label: "Overview Summary" },
              { id: "jobs", label: `Recommended Jobs (${recommendedJobs.length})` },
              { id: "skills", label: "Skill Gaps & Courses" },
              { id: "projects", label: "Project Ideas & Resume" },
              { id: "paths", label: "Career Paths" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error / Loading */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex justify-between items-center">
              <span>⚠️ {error}</span>
              <button onClick={() => fetchRecommendations()} className="underline text-xs">
                Retry
              </button>
            </div>
          )}

          {loading && !refreshing && (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading recommendations...</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-6">
              {/* ============================================================
                  TAB 1: OVERVIEW SUMMARY (ESSENTIAL AT A GLANCE)
              ============================================================ */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Top Career Match Card */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/30">
                        Top Recommendation
                      </span>
                      <h2 className="text-xl font-extrabold tracking-tight">
                        {topOverallMatch.roleTitle || "Full Stack Developer"}
                      </h2>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {(topOverallMatch.reasons || [
                          "Core skills match entry requirements",
                          "Degree aligns with role expectations",
                        ])
                          .slice(0, 3)
                          .map((r, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="text-emerald-400">✓</span> {r}
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className="text-left md:text-right space-y-2 shrink-0">
                      <div className="flex items-baseline md:justify-end gap-2">
                        <span className="text-3xl font-black text-emerald-400">
                          {topOverallMatch.matchScore || 87}%
                        </span>
                        <span className="text-xs text-slate-300">Match Score</span>
                      </div>
                      <div className="flex flex-wrap md:justify-end gap-1.5">
                        {(topOverallMatch.missingSkills || ["Node.js", "Express"]).map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30"
                          >
                            + {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Essential Grid: Skill Gaps & 30-Day Plan */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Missing Skills */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">
                          ⚡ Priority Skills to Learn
                        </h3>
                        <button
                          onClick={() => setActiveTab("skills")}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          View All ({skillGapAnalysis.missingSkills?.length || 0}) →
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(skillGapAnalysis.missingSkills || []).slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-900">{item.skill}</strong>
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Required by {item.demandPercentage}% of matching jobs
                              </p>
                            </div>
                            <Link
                              to={`/courses?search=${encodeURIComponent(item.skill)}`}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 text-xs font-bold transition shrink-0"
                            >
                              Learn
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Immediate 30-Day Checklist */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">
                          📅 Recommended Next Steps
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          30-Day Plan
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {(actionPlan.timeline || []).slice(0, 3).map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span className="text-blue-700">{step.week}:</span>
                              <span className="text-[10px] text-slate-600">{step.status}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium">{step.focus}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top 4 Recommended Jobs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        💼 Top Job Matches for You
                      </h3>
                      <button
                        onClick={() => setActiveTab("jobs")}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        View All Jobs ({recommendedJobs.length}) →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendedJobs.slice(0, 4).map((job) => (
                        <div
                          key={job._id || job.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-blue-300 transition flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                                <p className="text-[11px] font-semibold text-slate-500">
                                  {job.company} · {job.location}
                                </p>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[11px] shrink-0 border border-emerald-200">
                                {job.matchScore}% Match
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                              {job.matchingSkills?.slice(0, 3).map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium"
                                >
                                  ✓ {s}
                                </span>
                              ))}
                              {job.missingSkills?.slice(0, 2).map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium"
                                >
                                  • {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              {job.salary}
                            </span>
                            <button
                              onClick={() => handleApplyJob(job)}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 2: RECOMMENDED JOBS (FILTERABLE & CLEAN)
              ============================================================ */}
              {activeTab === "jobs" && (
                <div className="space-y-4">
                  {/* Job Search & Filter Bar */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search jobs by title, company, or skill..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <select
                      value={workModeFilter}
                      onChange={(e) => setWorkModeFilter(e.target.value)}
                      className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none shrink-0"
                    >
                      <option value="All">All Work Modes</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  {filteredJobs.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No matching jobs found with current filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredJobs.map((job) => (
                        <div
                          key={job._id || job.id}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-blue-300 transition flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                                <p className="text-xs font-semibold text-slate-500">
                                  {job.company} · {job.location}
                                </p>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[11px] shrink-0 border border-emerald-200">
                                {job.matchScore}% Match
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 text-[10px] text-slate-600">
                              <span className="px-2 py-0.5 bg-slate-100 rounded">
                                💼 {job.workMode}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded">
                                💰 {job.salary}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded">
                                🎓 {job.experience}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                              {job.matchingSkills?.slice(0, 4).map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium"
                                >
                                  ✓ {s}
                                </span>
                              ))}
                              {job.missingSkills?.slice(0, 3).map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium"
                                >
                                  • {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => setSelectedJobExplanation(job)}
                              className="text-[11px] font-bold text-slate-500 hover:text-blue-600"
                            >
                              ℹ️ Why this match?
                            </button>
                            <button
                              onClick={() => handleApplyJob(job)}
                              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs"
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================
                  TAB 3: SKILL GAPS & RECOMMENDED COURSES
              ============================================================ */}
              {activeTab === "skills" && (
                <div className="space-y-6">
                  {/* Skill Gap Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                      <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                        <span>✓</span> Skills You Have ({skillGapAnalysis.masteredSkills?.length || 0})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {skillGapAnalysis.masteredSkills?.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                      <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                        <span>⚡</span> Skills to Develop ({skillGapAnalysis.missingSkills?.length || 0})
                      </h3>
                      <div className="space-y-2">
                        {skillGapAnalysis.missingSkills?.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <strong className="text-slate-900">{item.skill}</strong>
                              <span className="text-[10px] text-slate-500 block">
                                In {item.demandPercentage}% of matching jobs
                              </span>
                            </div>
                            <Link
                              to={`/courses?search=${encodeURIComponent(item.skill)}`}
                              className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-blue-600 text-xs font-bold hover:bg-blue-50"
                            >
                              Learn
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Courses */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      🎓 Targeted Learning Courses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendedCourses.map((c, idx) => (
                        <div
                          key={c._id || c.id || idx}
                          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">
                              {c.duration} · {c.difficulty}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">
                              {c.title}
                            </h4>
                            <p className="text-[11px] text-slate-500">{c.careerRelevance}</p>
                          </div>
                          <Link
                            to={c.url || "/courses"}
                            className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center block transition"
                          >
                            View Course →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 4: PROJECT IDEAS & RESUME OPTIMIZATION
              ============================================================ */}
              {activeTab === "projects" && (
                <div className="space-y-6">
                  {/* Project Ideas */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      🚀 Project Ideas to Close Portfolio Gaps
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {recommendedProjects.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {p.difficulty} · ~{p.estimatedHours}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                            <p className="text-[11px] text-slate-600">{p.description}</p>
                            <div className="p-2.5 bg-amber-50 rounded-xl text-[10px] text-amber-900">
                              <strong>Why:</strong> {p.tailoredWhy}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedProjectModal(p)}
                            className="w-full py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            View Blueprint
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resume Improvements */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900">
                        📄 Actionable Resume Improvements
                      </h3>
                      <Link
                        to="/resume-builder"
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Open Resume Builder →
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {resumeRecommendations.map((rec, idx) => (
                        <div
                          key={rec.id || idx}
                          className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <strong className="text-slate-900">{rec.title}</strong>
                            <p className="text-[11px] text-slate-500">{rec.description}</p>
                          </div>
                          <Link
                            to={rec.actionUrl}
                            className="px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-800 text-xs font-bold shrink-0"
                          >
                            {rec.actionLabel}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 5: CAREER PATHS
              ============================================================ */}
              {activeTab === "paths" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {careerPaths.map((path) => (
                      <div
                        key={path.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            {path.fitLevel}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {path.fitPercentage}% Fit
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{path.roleTitle}</h4>
                        <p className="text-xs text-slate-500">{path.description}</p>
                        <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                          <span>Avg Salary: </span>
                          <strong className="text-slate-900">{path.salaryRange}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ============================================================
          PREFERENCES MODAL
      ============================================================ */}
      {showPreferenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Career Preferences</h3>
              <button
                onClick={() => setShowPreferenceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Role</label>
                <input
                  type="text"
                  value={prefForm.targetRole}
                  onChange={(e) => setPrefForm({ ...prefForm, targetRole: e.target.value })}
                  placeholder="e.g. Full Stack Developer"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Career Goal</label>
                <input
                  type="text"
                  value={prefForm.careerGoal}
                  onChange={(e) => setPrefForm({ ...prefForm, careerGoal: e.target.value })}
                  placeholder="e.g. Get my first job"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preferred Locations</label>
                <input
                  type="text"
                  value={prefForm.preferredLocations}
                  onChange={(e) => setPrefForm({ ...prefForm, preferredLocations: e.target.value })}
                  placeholder="e.g. Bangalore, Remote"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Mode</label>
                <select
                  value={prefForm.workMode}
                  onChange={(e) => setPrefForm({ ...prefForm, workMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPreferenceModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          JOB TRANSPARENCY MODAL
      ============================================================ */}
      {selectedJobExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900">Why this recommendation?</h4>
              <button onClick={() => setSelectedJobExplanation(null)}>✕</button>
            </div>
            <p className="font-bold text-blue-700">
              {selectedJobExplanation.title} ({selectedJobExplanation.matchScore}% Match)
            </p>
            <ul className="space-y-1.5 text-slate-600">
              {(selectedJobExplanation.reasons || ["Matching skill portfolio"]).map((r, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> {r}
                </li>
              ))}
            </ul>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedJobExplanation(null)}
                className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PROJECT BLUEPRINT MODAL
      ============================================================ */}
      {selectedProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900">Project Blueprint</h4>
              <button onClick={() => setSelectedProjectModal(null)}>✕</button>
            </div>
            <h5 className="font-bold text-slate-900">{selectedProjectModal.title}</h5>
            <p className="text-slate-600">{selectedProjectModal.description}</p>
            <div className="space-y-1 pt-1">
              <strong className="text-slate-800">Key Deliverables:</strong>
              <ul className="space-y-1 text-slate-600">
                {(selectedProjectModal.keyDeliverables || ["Build and deploy on live URL"]).map(
                  (d, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-blue-600">📌</span> {d}
                    </li>
                  )
                )}
              </ul>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProjectModal(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-rose-900 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default CareerRecommendationsPage;
