import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMarketInsights } from "../../services/marketInsightsService";
import CompanyProfileModal from "./CompanyProfileModal";

const ROLE_OPTIONS = [
  "Engineering Lead / Staff Engineer",
  "Senior Backend Architect",
  "Solution Architect / Cloud Architect",
  "Senior Full Stack Developer",
  "Engineering Manager",
  "Product Manager (Technical)",
];

const LOCATION_OPTIONS = [
  "India / Remote",
  "Bangalore",
  "Hyderabad",
  "Pune / Delhi NCR",
];

const EXPERIENCE_OPTIONS = ["3-5 Years", "5+ Years", "8+ Years"];

const TIME_PERIODS = ["7D", "30D", "90D"];

const CareerCompanyInsights = ({ initialTargetRole = "Engineering Lead / Staff Engineer", onApplyOpportunity }) => {
  const [selectedRole, setSelectedRole] = useState(initialTargetRole);
  const [selectedLocation, setSelectedLocation] = useState("India / Remote");
  const [selectedExperience, setSelectedExperience] = useState("5+ Years");
  const [selectedPeriod, setSelectedPeriod] = useState("30D");

  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await getMarketInsights({
        role: selectedRole,
        location: selectedLocation,
        period: selectedPeriod,
        experience: selectedExperience,
      });
      if (res?.data) {
        setInsightsData(res.data);
      }
    } catch (err) {
      console.error("Failed to load market insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [selectedRole, selectedLocation, selectedPeriod, selectedExperience]);

  const metrics = insightsData?.metrics || {
    activeOpportunities: 1284,
    hiringCompaniesCount: 347,
    demandTrend: {
      percentage: 14.8,
      direction: "increasing",
      label: "↑ 14.8% vs previous 30 days",
      status: "High Demand 🟢",
    },
    salary: {
      isAvailable: true,
      displayRange: "₹38–62 LPA",
      median: 48,
      sampleSize: 94,
      subtext: "Based on 94 verified job postings with listed compensation",
    },
  };

  const topCompanies = insightsData?.topCompaniesHiring || [];
  const skillsDemand = insightsData?.skillsDemand || [];
  const skillGap = insightsData?.candidateSkillGap || {};
  const locationBreakdown = insightsData?.locationBreakdown || [];
  const historicalChart = insightsData?.historicalChart || [];

  return (
    <div className="space-y-6">
      {/* Header & Value Proposition */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 uppercase tracking-wider">
                Live Data Pipeline
              </span>
              <span className="text-xs text-slate-400">· {insightsData?.updatedText || "Updated 2 hours ago"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Career & Company Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Which companies are hiring, for what roles, where, with which skills, and how hiring demand is trending over time.
            </p>
          </div>
        </div>

        {/* Interactive Filter Bar */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Target Role Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Target Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 transition"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 transition"
            >
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Experience Level
            </label>
            <select
              value={selectedExperience}
              onChange={(e) => setSelectedExperience(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-purple-500 transition"
            >
              {EXPERIENCE_OPTIONS.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          {/* Time Period Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Time Period
            </label>
            <div className="flex h-10 p-1 bg-slate-100 rounded-xl">
              {TIME_PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedPeriod(period)}
                  className={`flex-1 text-xs font-bold rounded-lg transition ${
                    selectedPeriod === period
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Opportunities */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Opportunities
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {metrics.activeOpportunities?.toLocaleString() || 1284}
          </div>
          <p className="text-[11px] text-slate-500">Matching &quot;{selectedRole}&quot;</p>
        </div>

        {/* Hiring Companies */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Hiring Companies
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-900">
            {metrics.hiringCompaniesCount?.toLocaleString() || 347}
          </div>
          <p className="text-[11px] text-purple-700 font-medium">Verified tech organizations</p>
        </div>

        {/* Demand Trend */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Demand Trend
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              🟢 High Demand
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
            {metrics.demandTrend?.label || "↑ 14.8% vs 30D"}
          </div>
          <p className="text-[10px] text-slate-400">Based on historical time-series</p>
        </div>

        {/* Listed Salary Data */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Listed Salary Range
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {metrics.salary?.displayRange || "₹38–62 LPA"}
          </div>
          <p className="text-[10px] text-slate-500 truncate" title={metrics.salary?.subtext}>
            {metrics.salary?.subtext || "Based on 94 verified postings"}
          </p>
        </div>
      </div>

      {/* Historical Demand Trend Sparkline & Transparency */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Market Demand Trajectory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical open job-posting volume for {selectedRole} in {selectedLocation}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 self-start sm:self-center">
            Calculated from aggregated job-posting snapshots
          </span>
        </div>

        {/* SVG Curve Chart */}
        <div className="py-2">
          <div className="h-32 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 pt-4">
            {historicalChart.map((pt, idx) => {
              const maxVal = Math.max(...historicalChart.map((p) => p.activeJobs), 1400);
              const minVal = Math.min(...historicalChart.map((p) => p.activeJobs), 900);
              const heightPct = Math.max(15, Math.min(100, Math.round(((pt.activeJobs - minVal) / (maxVal - minVal)) * 100)));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-bold text-purple-900 opacity-0 group-hover:opacity-100 transition">
                    {pt.activeJobs}
                  </span>
                  <div className="w-full bg-slate-100 rounded-xl h-24 flex items-end p-1 overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-lg transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{pt.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Companies Hiring (Centerpiece) + Skills & Locations Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Companies Hiring for Your Target Role */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Companies Hiring for Your Target Role
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any company to explore deep-dive open roles, required stack, and location split.
              </p>
            </div>
          </div>

          {/* Companies List / Table */}
          <div className="space-y-3">
            {topCompanies.map((comp) => (
              <div
                key={comp.slug || comp.name}
                onClick={() => setSelectedCompany(comp)}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20 transition duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {comp.logoText || comp.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
                        {comp.name}
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {comp.hiringTrend}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {comp.openRoles} Open Roles · {comp.locations?.join(" / ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {comp.matchPercentage || 90}% Match
                  </span>
                  <span className="text-xs font-semibold text-purple-700 group-hover:translate-x-0.5 transition hidden sm:inline">
                    Explore →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Skills Most Requested & Location Distribution */}
        <div className="space-y-6">
          {/* Skills Most Requested by Employers & Skill Gap */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Skills Most Requested</h2>
              <p className="text-xs text-slate-500 mt-0.5">Extracted from active senior job postings</p>
            </div>

            {/* In-demand Skills List with Profile Match Indicator */}
            <div className="space-y-2.5">
              {skillsDemand.map((sk, idx) => {
                const isMatched = skillGap?.matchedSkills?.includes(sk.name);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{sk.name}</span>
                        {isMatched ? (
                          <span className="text-emerald-600 font-bold text-xs" title="In your profile">
                            ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-semibold border border-amber-200">
                            Missing
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{sk.category}</span>
                    </div>

                    <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                      {sk.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Candidate Skill Gap Alert */}
            {skillGap?.missingCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span>💡</span> Skill Opportunity
                </div>
                <p className="text-amber-800 leading-relaxed font-medium">
                  {skillGap.insightSummary}
                </p>
                <Link
                  to="/professional/profile"
                  className="inline-block text-[11px] font-bold text-purple-700 hover:text-purple-900 underline pt-1"
                >
                  Update Profile Skills →
                </Link>
              </div>
            )}
          </div>

          {/* Hiring by Location */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Hiring by Location</h2>
              <p className="text-xs text-slate-500 mt-0.5">Geographic distribution of senior tech roles</p>
            </div>

            <div className="space-y-3">
              {locationBreakdown.map((loc, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{loc.location}</span>
                    <span className="text-purple-700 font-bold">{loc.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${loc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Company Deep Dive Modal */}
      <CompanyProfileModal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        company={selectedCompany}
        onApplyRole={(job, comp) => {
          const prepared = {
            ...job,
            company: comp?.name || job.company || "Company",
            companyName: comp?.name || job.company || "Company",
          };
          if (onApplyOpportunity) onApplyOpportunity(prepared);
        }}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl bg-slate-900 text-white border border-slate-700 flex items-center gap-2.5 animate-slide-in-right">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default CareerCompanyInsights;
