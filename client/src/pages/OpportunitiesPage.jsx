import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Search,
  Briefcase,
  MapPin,
  Building,
  ExternalLink,
  Bookmark,
  Sparkles,
  Globe,
  GraduationCap,
  Share2,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle,
  Building2
} from "lucide-react";
import opportunityService from "../services/opportunityService";

export default function OpportunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [program, setProgram] = useState(searchParams.get("program") || "all");
  const [specialization, setSpecialization] = useState(
    searchParams.get("specialization") || "all"
  );
  const getInitialOppType = () => {
    const raw = (searchParams.get("type") || searchParams.get("opportunityType") || "all").toLowerCase().replace(/[-_ ]/g, "");
    if (raw === "job" || raw === "fulltime") return "fulltime";
    if (raw === "internship" || raw === "intern") return "internship";
    if (raw === "parttime") return "parttime";
    return "all";
  };
  const getInitialWorkMode = () => {
    if (searchParams.get("remote") === "true") return "Remote";
    return searchParams.get("workMode") || "all";
  };

  const [opportunityType, setOpportunityType] = useState(getInitialOppType);
  const [source, setSource] = useState(searchParams.get("source") || "all");
  const [region, setRegion] = useState(searchParams.get("region") || "all");
  const [workMode, setWorkMode] = useState(getInitialWorkMode);
  const [scope, setScope] = useState(searchParams.get("scope") || "all");

  // Data States
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [metadata, setMetadata] = useState({
    programs: [],
    specializations: [],
    regions: [],
    sources: [],
    opportunityTypes: [],
    workModes: []
  });
  const [savedIds, setSavedIds] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Metadata (Programs, Specializations list)
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await opportunityService.getOpportunityMetadata();
        if (res?.success && res?.data) {
          setMetadata(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch opportunity meta:", err);
      }
    };
    loadMeta();
  }, []);

  // Fetch Opportunities
  const fetchOpportunities = async (pageToFetch = currentPage) => {
    try {
      setLoading(true);
      const params = {
        program: program && program !== "all" ? program : undefined,
        specialization: specialization && specialization !== "all" ? specialization : undefined,
        opportunityType: opportunityType !== "all" ? opportunityType : undefined,
        source: source !== "all" ? source : undefined,
        region: region !== "all" ? region : undefined,
        workMode: workMode !== "all" ? workMode : undefined,
        scope: scope !== "all" ? scope : undefined,
        search: searchQuery.trim() || undefined,
        page: pageToFetch,
        limit: 10,
      };

      const res = await opportunityService.getOpportunities(params);
      if (res?.success && Array.isArray(res.data)) {
        setOpportunities(res.data);
        const total = res.pagination?.total ?? res.count ?? res.data.length;
        setTotalCount(total);
        setTotalPages(res.pagination?.totalPages || Math.ceil(total / 10) || 1);
      } else {
        setOpportunities([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to load opportunities:", error);
      setOpportunities([]);
      setTotalCount(0);
      setTotalPages(1);
      showToast("Unable to fetch live opportunities at the moment", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchOpportunities(1);
  }, [program, specialization, opportunityType, source, region, workMode, scope]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchOpportunities(newPage);
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOpportunities(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setProgram("all");
    setSpecialization("all");
    setOpportunityType("all");
    setSource("all");
    setRegion("all");
    setWorkMode("all");
    setScope("all");
    setCurrentPage(1);
  };

  // Save Bookmark
  const handleSaveToggle = (item) => {
    const key = item.applyLink || item.title;
    if (savedIds.includes(key)) {
      setSavedIds((prev) => prev.filter((id) => id !== key));
      showToast("Removed from saved opportunities", "info");
    } else {
      setSavedIds((prev) => [...prev, key]);
      showToast("Saved to your bookmark list!", "success");
    }
  };

  // Copy Link
  const handleShare = (item) => {
    if (navigator.clipboard && item.applyLink) {
      navigator.clipboard.writeText(item.applyLink);
      showToast("Direct apply link copied to clipboard!", "success");
    }
  };

  // Helper Badge Colors
  const getSourceBadge = (item) => {
    const src = (item.platformSource || item.type || "").toLowerCase();
    if (item.isExclusive || src.includes("campus") || src.includes("gu")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-600" /> GU On-Campus Drive
        </span>
      );
    }
    if (src.includes("linkedin")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          LinkedIn Verified
        </span>
      );
    }
    if (src.includes("internshala")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          Internshala Partner
        </span>
      );
    }
    if (src.includes("remotive")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          Remotive Remote
        </span>
      );
    }
    if (src.includes("arbeitnow")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Arbeitnow Global
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {item.platformSource || "Verified Portal"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all ${
            toast.type === "error"
              ? "bg-rose-900 text-white border border-rose-700"
              : toast.type === "info"
              ? "bg-slate-800 text-white border border-slate-700"
              : "bg-emerald-900 text-white border border-emerald-700"
          }`}
        >
          <CheckCircle className="w-4 h-4 text-white" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              GU
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                GEETA UNIVERSITY
              </h1>
              <p className="text-[10px] text-blue-600 font-bold tracking-wide uppercase mt-0.5">
                CareerConnect · Matrix Gateway
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 pl-4 border-l border-slate-200">
            <Link to="/internships" className="hover:text-blue-600 transition">
              Internships
            </Link>
            <span>/</span>
            <span className="text-blue-700 font-bold">Live Opportunities</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={user.role === "employer" ? "/employer/dashboard" : "/student/dashboard"}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              Dashboard →
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Log In
              </Link>
              <Link
                to="/register/student"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Hero Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Live Job & Internship Aggregator Matrix
              </span>
              <span className="text-xs text-blue-200/80">
                · LinkedIn + Internshala + Remotive + Arbeitnow + GU Drives
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Opportunities tailored for your Degree & Domain
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Real-time multi-source crawler scraping top job boards, remote platforms, and campus placement drives calibrated specifically to Geeta University curriculum & specializations.
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold text-white border border-white/10">
                🎯 {opportunities.length} Results Available
              </div>
              <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold text-white border border-white/10">
                🏛️ Geeta University Placement Cell
              </div>
              <div className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-xs text-xs font-semibold text-white border border-white/10">
                ⚡ 30-min Auto-Refreshed Cache
              </div>
            </div>
          </div>
        </div>

        {/* Filter Control Center */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
          {/* Top Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specific keywords (e.g. MERN, Python, Digital Forensics, Financial Analyst)..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <button
              type="submit"
              className="px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              type="button"
              onClick={fetchOpportunities}
              className="px-4 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 flex-shrink-0"
              title="Refresh results"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </form>

          {/* Core Academic Selectors: Degree & Specialization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            {/* Degree/Program */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                Degree / Program
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-50"
              >
                <option value="all">🎓 All Degrees / Programs (Show Everything)</option>
                {metadata.programs
                  .filter((p) => p !== "all")
                  .map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
              </select>
            </div>

            {/* Specialization / Domain */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                Specialization / Domain Matrix
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50"
              >
                <option value="all">⚡ All Specializations / Domains (Show Everything)</option>
                {metadata.specializations
                  .filter((s) => s !== "all")
                  .map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters: Opportunity Type, Source, Region, Work Mode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
            {/* Opportunity Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Opportunity Type
              </label>
              <select
                value={opportunityType}
                onChange={(e) => setOpportunityType(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="all">All Types</option>
                <option value="fulltime">Full-Time Job</option>
                <option value="internship">Internship</option>
                <option value="parttime">Part-Time Job</option>
              </select>
            </div>

            {/* Source / Scraper Platform */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Source Platform
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="all">All Platforms (100+ Live Jobs)</option>
                <option value="linkedin">LinkedIn Verified</option>
                <option value="internshala">Internshala Portal</option>
                <option value="remotive">Remotive Remote</option>
                <option value="arbeitnow">Arbeitnow Global</option>
                <option value="campus">GU Campus Drives Only</option>
              </select>
            </div>

            {/* Region / Geographic Scrubbing */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Target Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="all">🌐 All Locations (Global & India)</option>
                <option value="India">🇮🇳 All India</option>
                <option value="Delhi NCR">📍 Delhi NCR / Panipat</option>
                <option value="Bangalore">📍 Bengaluru / Karnataka</option>
                <option value="Pune">📍 Pune / Mumbai</option>
                <option value="Chandigarh">📍 Chandigarh / Punjab</option>
                <option value="International">🌍 International (Worldwide)</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
              >
                <option value="all">All Work Modes</option>
                <option value="Remote">Remote / WFH</option>
                <option value="On-Site">On-Site / Hybrid</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Tabs Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">Quick:</span>
            {[
              { label: "🌟 All Opportunities", onClick: () => { setOpportunityType("all"); setWorkMode("all"); setScope("all"); } },
              { label: "💼 Full-Time Jobs", onClick: () => { setOpportunityType("fulltime"); setScope("all"); } },
              { label: "🎓 Internships", onClick: () => { setOpportunityType("internship"); setScope("all"); } },
              { label: "🏛️ GU Campus Drives", onClick: () => { setScope("on-campus"); setSource("campus"); } },
              { label: "🏠 Remote Jobs", onClick: () => { setWorkMode("Remote"); } },
            ].map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={tab.onClick}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition border border-slate-200/60"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              Scraping and Aggregating Live Multi-Source Feed...
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Querying LinkedIn, Internshala, Remotive, Arbeitnow APIs and Geeta University placement drives for "{program} · {specialization}".
            </p>
          </div>
        ) : opportunities.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span className="font-semibold">
                Showing <strong className="text-slate-900">{totalCount > 0 ? `${((currentPage - 1) * 10) + 1}–${Math.min(currentPage * 10, totalCount)} of ${totalCount}` : opportunities.length}</strong> matching opportunities
              </span>
              <span className="text-slate-400">Sorted by latest & freshness</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {opportunities.map((item, index) => {
                const isSaved = savedIds.includes(item.applyLink || item.title);
                const isCampusDrive = item.isExclusive || item.platformSource === "GU Placement Cell";

                return (
                  <div
                    key={index}
                    className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      isCampusDrive
                        ? "border-amber-300 bg-gradient-to-r from-amber-50/40 via-white to-white shadow-sm hover:shadow-md hover:border-amber-400"
                        : "border-slate-200/90 hover:border-blue-400 hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-2.5 flex-1">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSourceBadge(item)}

                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.opportunityType || "Full-Time"}
                        </span>

                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                            item.workMode === "Remote"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {item.workMode}
                        </span>

                        {item.postedDate && (
                          <span className="text-[10.5px] text-slate-400 ml-auto hidden sm:inline">
                            🕒 {item.postedDate}
                          </span>
                        )}
                      </div>

                      {/* Title & Company */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-blue-900 font-bold flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            {item.company}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {item.location}
                          </span>
                        </p>
                      </div>

                      {/* Campus Drive Perks / Notes */}
                      {isCampusDrive && (
                        <div className="text-[11px] font-medium text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>Exclusive on-campus recruitment drive for enrolled Geeta University students.</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleSaveToggle(item)}
                        className={`p-2.5 rounded-xl border transition ${
                          isSaved
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                        title={isSaved ? "Saved" : "Save opportunity"}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-blue-600" : ""}`} />
                      </button>

                      <button
                        onClick={() => handleShare(item)}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                        title="Copy direct apply link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <a
                        href={item.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 ${
                          isCampusDrive
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        }`}
                      >
                        <span>Apply Online</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-900 font-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-slate-900 font-bold">{Math.min(currentPage * 10, totalCount)}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> opportunities
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            disabled={loading}
                            className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition ${
                              currentPage === p
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No matching opportunities found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No live listings currently matched the selected program, specialization or geographic filters. Try broadening your region to "All India" or selecting "All Types".
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
