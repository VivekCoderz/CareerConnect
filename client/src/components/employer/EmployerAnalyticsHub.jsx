import React, { useState, useMemo } from "react";

const EmployerAnalyticsHub = ({
  analyticsData = null,
  jobs = [],
  onNavigateTab = () => {},
  onOpenAssignTraining = () => {},
  showToast = () => {},
}) => {
  // Global Filters
  const [timePeriod, setTimePeriod] = useState("30d");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedJob, setSelectedJob] = useState("All");
  const [trendMetric, setTrendMetric] = useState("applications"); // 'applications' | 'interviews' | 'hires' | 'learningHours'
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportCategory, setSelectedExportCategory] = useState("Complete Organization Intelligence");
  const [selectedExportFormat, setSelectedExportFormat] = useState("PDF");

  const hiring = analyticsData?.hiring || {};
  const learning = analyticsData?.learning || {};
  const aiInsights = analyticsData?.aiInsights || [];

  // Funnel Data with calculations
  const funnel = useMemo(() => {
    return (
      hiring.funnel || [
        { stage: "Applied", count: 148, percentage: 100, conversionFromPrev: 100, dropOffRate: 0 },
        { stage: "Screened", count: 110, percentage: 74, conversionFromPrev: 74, dropOffRate: 26 },
        { stage: "Shortlisted", count: 26, percentage: 18, conversionFromPrev: 24, dropOffRate: 76 },
        { stage: "Interviewed", count: 12, percentage: 8, conversionFromPrev: 46, dropOffRate: 54 },
        { stage: "Offered", count: 6, percentage: 4, conversionFromPrev: 50, dropOffRate: 50 },
        { stage: "Hired", count: 4, percentage: 3, conversionFromPrev: 67, dropOffRate: 33 },
      ]
    );
  }, [hiring.funnel]);

  // Time Series Trend Data
  const trendData = useMemo(() => {
    return (
      hiring.timeSeriesTrend || [
        { month: "Jan", applications: 45, interviews: 4, offers: 2, hires: 1, learningHours: 32 },
        { month: "Feb", applications: 62, interviews: 6, offers: 3, hires: 2, learningHours: 48 },
        { month: "Mar", applications: 88, interviews: 8, offers: 4, hires: 3, learningHours: 72 },
        { month: "Apr", applications: 110, interviews: 9, offers: 5, hires: 3, learningHours: 95 },
        { month: "May", applications: 130, interviews: 11, offers: 5, hires: 4, learningHours: 120 },
        { month: "Jun", applications: 148, interviews: 12, offers: 6, hires: 4, learningHours: 148 },
      ]
    );
  }, [hiring.timeSeriesTrend]);

  // Max value in trend for proportional heights
  const maxTrendVal = useMemo(() => {
    return Math.max(...trendData.map((d) => d[trendMetric] || 1), 10);
  }, [trendData, trendMetric]);

  // Department Hiring Distribution
  const departmentBreakdown = useMemo(() => {
    return (
      hiring.departmentBreakdown || [
        { department: "Engineering", hires: 14, openRoles: 5, avgDays: 16, percentage: 58 },
        { department: "Product & Design", hires: 6, openRoles: 2, avgDays: 14, percentage: 25 },
        { department: "Marketing & Growth", hires: 2, openRoles: 1, avgDays: 12, percentage: 9 },
        { department: "Human Resources", hires: 2, openRoles: 1, avgDays: 10, percentage: 8 },
      ]
    );
  }, [hiring.departmentBreakdown]);

  // Job Performance Matrix
  const jobPerformance = useMemo(() => {
    return (
      hiring.jobPerformance || [
        { id: "j1", title: "Frontend Developer Intern", department: "Engineering", applicationsCount: 68, interviewsCount: 8, offersCount: 3, hiredCount: 2, timeToHireDays: 16 },
        { id: "j2", title: "Full Stack Engineer Intern", department: "Engineering", applicationsCount: 42, interviewsCount: 6, offersCount: 2, hiredCount: 1, timeToHireDays: 21 },
        { id: "j3", title: "Backend Development Intern", department: "Engineering", applicationsCount: 38, interviewsCount: 4, offersCount: 1, hiredCount: 1, timeToHireDays: 14 },
        { id: "j4", title: "Junior Software Engineer", department: "Engineering", applicationsCount: 24, interviewsCount: 3, offersCount: 1, hiredCount: 1, timeToHireDays: 19 },
      ]
    );
  }, [hiring.jobPerformance]);

  // Candidate Sources
  const candidateSources = useMemo(() => {
    return (
      hiring.candidateSources || [
        { source: "CareerConnect Talent Network", percentage: 42, count: 62, icon: "🎓", color: "#f59e0b" },
        { source: "LinkedIn Recruiter", percentage: 25, count: 37, icon: "🔗", color: "#0ea5e9" },
        { source: "University Campus Drives", percentage: 18, count: 27, icon: "🏛️", color: "#8b5cf6" },
        { source: "Employee Referrals", percentage: 10, count: 15, icon: "🤝", color: "#10b981" },
        { source: "Direct & Career Site", percentage: 5, count: 7, icon: "🌐", color: "#64748b" },
      ]
    );
  }, [hiring.candidateSources]);

  // Quality & In-demand skills
  const quality = hiring.qualityMetrics || {
    averageCandidateMatchScore: 86,
    averageSkillMatch: 82,
    interviewPassRate: 48,
    offerAcceptanceRate: 72,
    costPerHireINR: "₹12,400",
    topHiringSkills: [
      { skill: "React.js", demandScore: 94, applicantsMatching: 88 },
      { skill: "Node.js & Express", demandScore: 88, applicantsMatching: 74 },
      { skill: "SQL & Databases", demandScore: 82, applicantsMatching: 68 },
      { skill: "AWS & Cloud", demandScore: 78, applicantsMatching: 42 },
      { skill: "Docker & DevOps", demandScore: 70, applicantsMatching: 35 },
    ],
  };

  const handleExportDownload = () => {
    showToast?.(`Generated ${selectedExportCategory} (${selectedExportFormat}) ready for download!`, "success");
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner & Global Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 rounded-3xl text-white shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide uppercase border border-amber-400/30">
                Decision Intelligence & Telemetry
              </span>
              <span className="text-xs text-slate-400">· Real-time Aggregation</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1">
              Hiring & Learning Analytics Hub
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
              Comprehensive telemetry connecting recruitment velocity, ATS drop-offs, internal employee
              learning hours, and competency development.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 whitespace-nowrap self-start md:self-auto"
          >
            <span>📥</span> Export Intelligence Report
          </button>
        </div>

        {/* Global Filter Toolbar */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
          {/* Time Range Pills */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/15 backdrop-blur-xs">
            {[
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "90d", label: "Last 90 Days" },
              { id: "1y", label: "This Year" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimePeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  timePeriod === p.id
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="All" className="text-slate-900">All Departments</option>
            <option value="Engineering" className="text-slate-900">Engineering</option>
            <option value="Product & Design" className="text-slate-900">Product & Design</option>
            <option value="Marketing & Growth" className="text-slate-900">Marketing & Growth</option>
            <option value="Human Resources" className="text-slate-900">Human Resources</option>
          </select>

          {/* Job Requisition Filter */}
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-xs truncate"
          >
            <option value="All" className="text-slate-900">All Job Requisitions</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id} className="text-slate-900">
                {j.title}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-slate-400 ml-auto hidden xl:inline">
            ⚡ Telemetry synced with live MongoDB pipelines
          </span>
        </div>
      </div>

      {/* 8 Top Executive KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hires</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              +14% ↑
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{hiring.hiredCount || 4}</span>
            <span className="text-xs text-slate-500 font-medium">Candidates</span>
          </div>
          <p className="text-[11px] text-slate-400">Target for Q3: 6 Hires</p>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Positions</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              {hiring.publishedJobs || 5} Live
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{hiring.totalJobs || 5}</span>
            <span className="text-xs text-slate-500 font-medium">Requisitions</span>
          </div>
          <p className="text-[11px] text-slate-400">{hiring.totalApplications || 148} Total Applicants</p>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Time to Hire</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              -3 Days ↓
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-800">{hiring.averageTimeToHireDays || 18}</span>
            <span className="text-xs text-slate-500 font-medium">Days</span>
          </div>
          <p className="text-[11px] text-slate-400">Industry benchmark: 24 Days</p>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Offer Acceptance</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
              High
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-700">{quality.offerAcceptanceRate}%</span>
            <span className="text-xs text-slate-500 font-medium">({hiring.offerCount || 6} Offers)</span>
          </div>
          <p className="text-[11px] text-slate-400">Cost / Hire: {quality.costPerHireINR}</p>
        </div>

        {/* KPI 5 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Learners</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              {learning.totalEmployees || 18} Staff
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{learning.activeLearners || 12}</span>
            <span className="text-xs text-slate-500 font-medium">Enrolled</span>
          </div>
          <p className="text-[11px] text-slate-400">66.7% Employee Participation</p>
        </div>

        {/* KPI 6 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Training Hours</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
              +28 hrs ↑
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{learning.totalLearningHours || 148}</span>
            <span className="text-xs text-slate-500 font-medium">Hours</span>
          </div>
          <p className="text-[11px] text-slate-400">Avg {learning.averageHoursPerEmployee || 8.2} hrs / employee</p>
        </div>

        {/* KPI 7 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">LMS Completion Rate</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              Verified
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{learning.completionRate || 78}%</span>
            <span className="text-xs text-slate-500 font-medium">Compliance</span>
          </div>
          <p className="text-[11px] text-slate-400">{learning.certificatesEarned || 8} Certificates Issued</p>
        </div>

        {/* KPI 8 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skill Growth Index</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
              Telemetry
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{learning.skillImprovementRate || "+18%"}</span>
            <span className="text-xs text-slate-500 font-medium">Upskilling</span>
          </div>
          <p className="text-[11px] text-slate-400">4 Skill gaps closed this month</p>
        </div>
      </div>

      {/* AI Actionable Insights Banner Section */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-300">
              CareerConnect AI Actionable Intelligence
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Auto-detected from active pipeline metrics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{insight.icon}</span>
                    <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${insight.badgeColor}`}>
                    {insight.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>
                <p className="text-[11px] text-amber-200 font-medium">
                  <span className="font-bold">Recommended Action:</span> {insight.recommendation}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (insight.actionTab === "training" && insight.recommendedCourseId) {
                      onOpenAssignTraining({ _id: insight.recommendedCourseId, title: "AWS Cloud Practitioner & Microservices" });
                    } else {
                      onNavigateTab(insight.actionTab || "ats");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1"
                >
                  <span>{insight.actionLabel}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Charts & Funnel Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Advanced Recruitment Funnel (7 Cols) */}
        <div className="xl:col-span-7 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Recruitment Funnel & Drop-Off Diagnostics</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                  Interactive Drill-Down
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click any funnel step to inspect matching candidates in the ATS Pipeline
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900">2.7%</span>
              <p className="text-[10px] text-slate-400">Total Funnel Yield</p>
            </div>
          </div>

          {/* Diagnostic Stage Callouts */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🌟</span>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Best Performing Stage</p>
                <p className="font-bold text-emerald-700">Interviewed → Offered (50.0%)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Highest Drop-Off Stage</p>
                <p className="font-bold text-rose-700">Screened → Shortlisted (76.4% Drop)</p>
              </div>
            </div>
          </div>

          {/* Interactive Step-by-Step Funnel */}
          <div className="space-y-3 pt-1">
            {funnel.map((item, idx) => (
              <div
                key={item.stage}
                onClick={() => onNavigateTab("ats", item.stage)}
                className="p-3 rounded-2xl hover:bg-amber-50/50 border border-transparent hover:border-amber-200 transition cursor-pointer group"
                title={`Click to open ATS Pipeline filtered to '${item.stage}'`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 group-hover:text-amber-800 transition">
                      {item.stage}
                    </span>
                    {idx > 0 && (
                      <span className="text-[10.5px] text-slate-400 font-normal">
                        ({item.conversionFromPrev}% of prev stage)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {idx > 0 && item.dropOffRate > 0 && (
                      <span className="text-[10px] font-semibold text-rose-600">
                        -{item.dropOffRate}% drop
                      </span>
                    )}
                    <span className="text-slate-900 font-black">
                      {item.count} <span className="text-slate-400 font-normal text-[11px]">({item.percentage}%)</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0
                        ? "bg-blue-600"
                        : idx === 1
                        ? "bg-indigo-600"
                        : idx === 2
                        ? "bg-purple-600"
                        : idx === 3
                        ? "bg-amber-600"
                        : idx === 4
                        ? "bg-emerald-600"
                        : "bg-teal-600"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center italic">
            💡 Pro-Tip: Sourcing and technical screening stages currently filter out 92% of candidate volume.
          </p>
        </div>

        {/* RIGHT COLUMN: Interactive Trend Telemetry Graph (5 Cols) */}
        <div className="xl:col-span-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Activity Telemetry Trends</h3>
              <p className="text-xs text-slate-500">6-Month volume trajectory</p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-[10px] font-bold">
              {[
                { id: "applications", label: "Apps" },
                { id: "interviews", label: "Interviews" },
                { id: "hires", label: "Hires" },
                { id: "learningHours", label: "LMS Hours" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrendMetric(m.id)}
                  className={`px-2 py-1 rounded-lg transition ${
                    trendMetric === m.id
                      ? "bg-white text-slate-900 shadow-2xs font-black text-amber-700"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bar / Column Chart Visual */}
          <div className="pt-4 flex items-end justify-between gap-3 h-48 border-b border-slate-100">
            {trendData.map((d, idx) => {
              const val = d[trendMetric] || 0;
              const heightPercent = Math.max(12, Math.round((val / maxTrendVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                    {val}
                  </span>
                  <div
                    className="w-full max-w-[32px] rounded-t-xl transition-all duration-300 group-hover:scale-105 bg-gradient-to-t from-slate-900 to-amber-600 group-hover:from-amber-600 group-hover:to-amber-400 shadow-xs"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[11px] font-bold text-slate-500">{d.month}</span>
                </div>
              );
            })}
          </div>

          {/* Department Hiring Breakdown */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Hiring by Department
            </h4>
            <div className="space-y-2">
              {departmentBreakdown.map((dept, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{dept.department}</span>
                    <span className="text-slate-600 font-bold">
                      {dept.hires} Hires <span className="text-slate-400 font-normal">({dept.openRoles} open)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Job Performance Matrix with ATS Action */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Job Requisition Performance Matrix</h3>
            <p className="text-xs text-slate-500">
              Conversion speed and pipeline velocity across active requisitions
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("jobs")}
            className="text-xs font-bold text-amber-700 hover:underline"
          >
            Manage All Jobs →
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Job Requisition</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Applications</th>
                <th className="py-3 px-4 text-center">Interviews</th>
                <th className="py-3 px-4 text-center">Offers</th>
                <th className="py-3 px-4 text-center">Hired</th>
                <th className="py-3 px-4">Avg. Time to Hire</th>
                <th className="py-3 px-4 text-right">ATS Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobPerformance.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{job.title}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                      Live / Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{job.department}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{job.applicationsCount}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-700">{job.interviewsCount}</td>
                  <td className="py-3 px-4 text-center font-bold text-purple-700">{job.offersCount}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">{job.hiredCount}</td>
                  <td className="py-3 px-4 text-slate-600">{job.timeToHireDays} Days</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigateTab("ats", null, job.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-xs"
                    >
                      View ATS Pipeline →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Source of Hire & Candidate Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Channels */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Source of Hire & Applicant Channels</h3>
            <p className="text-xs text-slate-500">Distribution of candidate origin and sourcing ROI</p>
          </div>

          <div className="space-y-3">
            {candidateSources.map((source, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span>{source.icon}</span>
                    {source.source}
                  </span>
                  <span className="font-bold text-slate-900">
                    {source.percentage}% <span className="text-slate-400 font-normal">({source.count} Candidates)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${source.percentage}%`, backgroundColor: source.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <p>
              <span className="font-bold">Channel Insight:</span> CareerConnect Talent Portal yields the highest interview pass rate at 64% vs LinkedIn at 38%.
            </p>
          </div>
        </div>

        {/* Candidate Quality & In-Demand Skills */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Candidate Quality & Skill Benchmarks</h3>
            <p className="text-xs text-slate-500">Applicant match score and skill market demand</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-xl font-black text-slate-900">{quality.averageCandidateMatchScore}%</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Match Score</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-xl font-black text-emerald-600">{quality.averageSkillMatch}%</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Skill Fit</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-xl font-black text-blue-600">{quality.interviewPassRate}%</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Interview Pass</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-xl font-black text-purple-600">{quality.offerAcceptanceRate}%</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Offer Accept</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Top Required Hiring Skills
            </h4>
            {quality.topHiringSkills.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{s.skill}</span>
                  <span className="text-slate-600 font-bold">
                    {s.applicantsMatching}% of applicants matching
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    style={{ width: `${s.demandScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Talent Intelligence Bridge (Hiring Demand vs Internal Upskilling) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border border-amber-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Cross-Module Talent Intelligence Loop
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Bridge open hiring bottlenecks by automatically upskilling internal employees
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("skill-gaps")}
            className="text-xs font-bold text-amber-800 hover:underline"
          >
            View Full Skill Gap Matrix →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <span>⚠️</span> Sourcing Scarcity: Cloud & DevOps
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              DevOps candidates have a 21-day time-to-hire with only 35% applicant skill match.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-700">
              <span>👥</span> Internal Potential: 8 Staff
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Engineering team members have 62% prerequisite skills in Linux & Docker ready for cloud training.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-emerald-700">
                <span>🎯</span> Recommended LMS Course
              </div>
              <p className="text-slate-600 text-[11px] mt-1 font-semibold">
                AWS Cloud Practitioner & Microservices
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenAssignTraining({ title: "AWS Cloud Practitioner & Microservices" })}
              className="mt-2 w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
            >
              1-Click Assign Training →
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPORT REPORT MODAL                                      */}
      {/* ======================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Export Intelligence Report</h3>
                <p className="text-xs text-slate-500">Download formatted telemetry datasets and summaries</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Report Category
                </label>
                <select
                  value={selectedExportCategory}
                  onChange={(e) => setSelectedExportCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="Complete Organization Intelligence">Complete Organization Intelligence (All Modules)</option>
                  <option value="Recruitment Funnel & ATS Performance">Recruitment Funnel & ATS Performance</option>
                  <option value="Job Requisitions Velocity & Yield">Job Requisitions Velocity & Yield</option>
                  <option value="Employee LMS Training & Compliance">Employee LMS Training & Compliance</option>
                  <option value="Skill Gap Analysis & Recommendations">Skill Gap Analysis & Recommendations</option>
                  <option value="Candidate Sourcing Channels & Quality">Candidate Sourcing Channels & Quality</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["PDF", "CSV", "Excel"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedExportFormat(fmt)}
                      className={`p-3 rounded-xl border text-xs font-bold transition text-center ${
                        selectedExportFormat === fmt
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {fmt === "PDF" ? "📄 PDF Document" : fmt === "CSV" ? "📊 CSV Dataset" : "📈 Excel (.xlsx)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Report Snapshot Includes:</p>
                <p>• {hiring.totalApplications || 148} Candidate Applications & Funnel Conversion</p>
                <p>• {jobs.length || 5} Job Requisitions & Time-to-Hire Analytics</p>
                <p>• {learning.totalEmployees || 18} Employee Training & Skill Gap Telemetry</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportDownload}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm"
              >
                Download {selectedExportFormat} Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerAnalyticsHub;
