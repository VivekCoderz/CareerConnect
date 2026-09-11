import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import jobService from "../../services/jobService";
import { applyOpportunity, saveOpportunity } from "../../services/studentDashboardService";
import InternshipDiscoveryMenu from "../../components/internships/InternshipDiscoveryMenu";
import JobDiscoveryMenu from "../../components/jobs/JobDiscoveryMenu";

const JobDiscoveryPage = () => {
  const { city: cityParam, category: categoryParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Parse path context
  const pathname = location.pathname;
  const isWorkFromHome = pathname.includes("/work-from-home");
  const isLatest = pathname.includes("/latest");

  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [savedIds, setSavedIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(cityParam ? cityParam.replace(/-/g, " ") : "All");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam ? categoryParam.replace(/-/g, " ") : "All");
  const [selectedWorkMode, setSelectedWorkMode] = useState(isWorkFromHome ? "Remote" : "All");
  const [selectedEmpType, setSelectedEmpType] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync state when URL params change
  useEffect(() => {
    if (cityParam) setSelectedCity(cityParam.replace(/-/g, " "));
    else if (!pathname.includes("/in/")) setSelectedCity("All");

    if (categoryParam) setSelectedCategory(categoryParam.replace(/-/g, " "));
    else if (!pathname.includes("/category/")) setSelectedCategory("All");

    if (isWorkFromHome) setSelectedWorkMode("Remote");
  }, [pathname, cityParam, categoryParam, isWorkFromHome]);

  // Fetch Jobs
  const fetchJobs = async (pageToFetch = currentPage) => {
    try {
      setLoading(true);
      const params = {
        sort: sortBy,
        page: pageToFetch,
        limit: 10,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCity !== "All") params.city = selectedCity;
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (selectedWorkMode !== "All") params.workMode = selectedWorkMode;
      if (selectedEmpType !== "All") params.employmentType = selectedEmpType;

      const res = await jobService.getJobs(params);
      if (res?.success) {
        const jobList = res.jobs || res.data || [];
        setJobs(jobList);
        const total = res.pagination?.total ?? jobList.length;
        setTotalCount(total);
        setTotalPages(res.pagination?.totalPages || Math.ceil(total / 10) || 1);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setJobs([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchJobs(1);
  }, [selectedCity, selectedCategory, selectedWorkMode, selectedEmpType, sortBy]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchJobs(newPage);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs(1);
  };

  // Quick Apply
  const handleApply = async (jobItem) => {
    if (!user) {
      navigate("/login?redirect=" + encodeURIComponent(location.pathname));
      return;
    }

    try {
      const res = await applyOpportunity({
        opportunityId: jobItem._id || jobItem.id,
        jobId: jobItem._id || jobItem.id,
        title: jobItem.title,
        company: jobItem.company || jobItem.companyName,
        type: "Job",
      });

      if (res?.success) {
        showToast(res.message || `Application submitted for "${jobItem.title}"!`, "success");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Application could not be submitted.";
      showToast(msg, "error");
    }
  };

  // Save Bookmark
  const handleSaveToggle = async (jobItem) => {
    const key = jobItem.id || jobItem._id;
    const isSaved = savedIds.includes(key);
    if (isSaved) {
      setSavedIds((prev) => prev.filter((id) => id !== key));
      showToast("Removed from saved jobs", "info");
    } else {
      setSavedIds((prev) => [...prev, key]);
      try {
        await saveOpportunity({
          opportunityId: jobItem._id || jobItem.id,
          title: jobItem.title,
          type: "Job",
        });
        showToast("Job saved to your workspace!", "success");
      } catch (e) {
        // ignore
      }
    }
  };

  // Dynamic Title Generator
  const pageHeading = useMemo(() => {
    if (isWorkFromHome) return "Work From Home & Remote Jobs";
    if (isLatest) return "Latest & Recently Posted Jobs";
    if (cityParam) return `Jobs in ${cityParam.charAt(0).toUpperCase() + cityParam.slice(1)}`;
    if (categoryParam) return `${categoryParam.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Jobs`;
    return "Explore All Jobs & Openings";
  }, [isWorkFromHome, isLatest, cityParam, categoryParam]);

  const categoriesList = [
    "Software Development",
    "Data Science",
    "Machine Learning & AI",
    "Web Development",
    "DevOps & Cloud",
    "UI/UX Design",
    "Digital Marketing",
    "Finance & Accounting",
    "Human Resources (HR)",
    "Sales & Business Dev",
  ];

  const citiesList = [
    "All",
    "Bangalore",
    "Delhi NCR",
    "Mumbai",
    "Hyderabad",
    "Pune",
    "Chennai",
    "Remote",
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-slide-in-right ${
            toast.type === "error"
              ? "bg-rose-900 text-white border border-rose-700"
              : "bg-slate-900 text-white border border-slate-700"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
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
                CareerConnect · Jobs Hub
              </p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-2 ml-3">
            <JobDiscoveryMenu />
            <InternshipDiscoveryMenu />
          </div>
        </div>

        <nav className="flex items-center gap-3 text-xs font-bold">
          <Link
            to="/internships"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            🎓 Internships
          </Link>
          <Link
            to="/opportunities"
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition hidden sm:inline-block"
          >
            🚀 Opportunities Matrix
          </Link>
          {user ? (
            <Link
              to="/applications"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
            >
              My Applications
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
            >
              Log in
            </Link>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb] text-white p-6 sm:p-10 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-bold text-blue-200">
              <span>💼 Fresh Openings</span>
              <span>•</span>
              <span>Sorted by Latest First</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {pageHeading}
            </h2>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Discover verified full-time and fresher job openings from partner employers, LinkedIn, Remotive, and Arbeitnow.
            </p>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job title, skills (e.g. React, Python), or company..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50/50"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shrink-0"
            >
              Search Jobs
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Location / City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500"
              >
                {citiesList.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Locations" : c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Work Mode
              </label>
              <select
                value={selectedWorkMode}
                onChange={(e) => setSelectedWorkMode(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Modes</option>
                <option value="Remote">Remote / WFH</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-Site">On-Site</option>
              </select>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="latest">Latest First (Newest)</option>
                <option value="salary_high">Salary: High to Low</option>
                <option value="salary_low">Salary: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="font-semibold">
            Showing <strong className="text-slate-900">{totalCount > 0 ? `${((currentPage - 1) * 10) + 1}–${Math.min(currentPage * 10, totalCount)} of ${totalCount}` : jobs.length}</strong> matching jobs
          </span>
          <span className="text-slate-400">10 jobs per page • Latest first</span>
        </div>

        {/* Results Content */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading categorized jobs from database and live feed...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((jobItem) => {
              const isSaved = savedIds.includes(jobItem.id || jobItem._id);
              const compName = jobItem.employerId?.companyName || jobItem.company || jobItem.companyName || "Partner Employer";
              const salaryStr = jobItem.salary || (jobItem.salaryRange?.min ? `₹${(jobItem.salaryRange.min / 100000).toFixed(1)}L - ₹${(jobItem.salaryRange.max / 100000).toFixed(1)}L / yr` : "Competitive Package");

              return (
                <div
                  key={jobItem.id || jobItem._id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {jobItem.platformSource && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                          {jobItem.platformSource}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {jobItem.employmentType || "Full-Time"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{jobItem.title}</h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {jobItem.workMode}
                      </span>
                      {jobItem.category && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {jobItem.category}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-900">{compName}</span> • 📍 {jobItem.location || "Multiple Locations"}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                        {salaryStr}
                      </span>
                      {jobItem.postedAt && <span>• Posted: {jobItem.postedAt}</span>}
                    </div>

                    {jobItem.requiredSkills && jobItem.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {jobItem.requiredSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10.5px] font-medium rounded-md border border-slate-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <button
                      onClick={() => handleSaveToggle(jobItem)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        isSaved
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      title={isSaved ? "Saved" : "Save Job"}
                    >
                      {isSaved ? "★ Saved" : "☆ Save"}
                    </button>

                    {jobItem.applyLink ? (
                      <a
                        href={jobItem.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
                      >
                        <span>Apply Online</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <button
                        onClick={() => handleApply(jobItem)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        Quick Apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-900 font-bold">{((currentPage - 1) * 10) + 1}</span>–<span className="text-slate-900 font-bold">{Math.min(currentPage * 10, totalCount)}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> jobs
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
          <div className="p-16 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              🔍
            </div>
            <h3 className="text-sm font-bold text-slate-900">No jobs found matching your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try clearing some filters or searching for different keywords to discover more opportunities.
            </p>
            <div className="pt-2">
              <Link
                to="/jobs"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-block shadow-xs transition"
              >
                Explore All Jobs
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JobDiscoveryPage;
