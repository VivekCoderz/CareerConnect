import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import internshipService from "../../services/internshipService";
import { applyOpportunity, saveOpportunity } from "../../services/studentDashboardService";
import InternshipDiscoveryMenu from "../../components/internships/InternshipDiscoveryMenu";

const InternshipDiscoveryPage = () => {
  const { city: cityParam, category: categoryParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Parse path context
  const pathname = location.pathname;
  const isWorkFromHome = pathname.includes("/work-from-home");
  const isInternational = pathname.includes("/international");
  const isLatest = pathname.includes("/latest");
  const isPaidOnly = pathname.includes("/paid");
  const isJobOfferOnly = pathname.includes("/with-job-offer");

  // State
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [savedIds, setSavedIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(cityParam ? cityParam.replace(/-/g, " ") : "All");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam ? categoryParam.replace(/-/g, " ") : "All");
  const [selectedWorkMode, setSelectedWorkMode] = useState(isWorkFromHome ? "Remote" : "All");
  const [selectedPaid, setSelectedPaid] = useState(isPaidOnly ? "true" : "All");
  const [selectedJobOffer, setSelectedJobOffer] = useState(isJobOfferOnly ? "true" : "All");
  const [sortBy, setSortBy] = useState(isLatest ? "latest" : "latest");

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
    if (isPaidOnly) setSelectedPaid("true");
    if (isJobOfferOnly) setSelectedJobOffer("true");
  }, [pathname, cityParam, categoryParam, isWorkFromHome, isPaidOnly, isJobOfferOnly]);

  // Fetch Internships
  const fetchInternships = async () => {
    try {
      setLoading(true);
      const params = {
        sort: sortBy,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCity !== "All") params.city = selectedCity;
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (selectedWorkMode !== "All") params.workMode = selectedWorkMode;
      if (selectedPaid !== "All") params.isPaid = selectedPaid;
      if (selectedJobOffer !== "All") params.hasJobOffer = selectedJobOffer;
      if (isInternational) params.isInternational = "true";

      const res = await internshipService.getInternships(params);
      if (res?.success) {
        setInternships(res.internships || res.data || []);
        setTotalCount(res.pagination?.total || (res.internships || []).length);
      }
    } catch (err) {
      console.error("Failed to load internships:", err);
      setInternships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, [selectedCity, selectedCategory, selectedWorkMode, selectedPaid, selectedJobOffer, sortBy, isInternational]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInternships();
  };

  // Quick Apply
  const handleApply = async (intItem) => {
    if (!user) {
      navigate("/login?redirect=" + encodeURIComponent(location.pathname));
      return;
    }

    try {
      const res = await applyOpportunity({
        opportunityId: intItem._id || intItem.id,
        jobId: intItem._id || intItem.id,
        title: intItem.title,
        company: intItem.company,
        type: "Internship",
      });

      if (res?.success) {
        showToast(res.message || `Application submitted for "${intItem.title}"!`, "success");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Application could not be submitted.";
      showToast(msg, "error");
    }
  };

  // Save Bookmark
  const handleSaveToggle = async (intItem) => {
    const isSaved = savedIds.includes(intItem.id || intItem._id);
    if (isSaved) {
      setSavedIds((prev) => prev.filter((id) => id !== (intItem.id || intItem._id)));
      showToast("Removed from saved opportunities", "info");
    } else {
      setSavedIds((prev) => [...prev, intItem.id || intItem._id]);
      try {
        await saveOpportunity({
          opportunityId: intItem._id || intItem.id,
          title: intItem.title,
          type: "Internship",
        });
        showToast("Saved to your workspace!", "success");
      } catch (e) {
        // ignore
      }
    }
  };

  // Dynamic Title Generator
  const pageHeading = useMemo(() => {
    if (isWorkFromHome) return "Work From Home / Remote Internships";
    if (isInternational) return "International Global Internships";
    if (isLatest) return "Latest & Recently Posted Internships";
    if (isPaidOnly) return "Paid Stipend Internships";
    if (isJobOfferOnly) return "Internships with Pre-Placement Job Offer (PPO)";
    if (cityParam) return `Internships in ${cityParam.charAt(0).toUpperCase() + cityParam.slice(1)}`;
    if (categoryParam) return `${categoryParam.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Internships`;
    return "Explore All Internships";
  }, [isWorkFromHome, isInternational, isLatest, isPaidOnly, isJobOfferOnly, cityParam, categoryParam]);

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

      {/* Top Navbar Header */}
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
                CareerConnect · Internship Hub
              </p>
            </div>
          </Link>

          {/* Internshala-style Category Dropdown Menu */}
          <div className="hidden sm:block">
            <InternshipDiscoveryMenu studentCity={user?.location || "Bangalore"} />
          </div>
        </div>

        {/* Right Navigation */}
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

      {/* Main Discovery Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Hero Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[11px] font-bold">
                🎯 {totalCount} Opportunities Found
              </span>
              <span className="text-xs text-blue-200/80">· Verified Geeta University Partner Employers</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {pageHeading}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Apply directly to verified corporate & startup internships with real-time application tracking.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, company, or skills (e.g. React, Python, Figma)..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              className="px-5 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex-shrink-0"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdowns Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            {/* City */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
            >
              <option value="All">All Locations</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Delhi">Delhi / NCR</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
              <option value="Chennai">Chennai</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Jaipur">Jaipur</option>
            </select>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
            >
              <option value="All">All Categories</option>
              <option value="Web Development">Web Development</option>
              <option value="Software Development">Software Development</option>
              <option value="Data Science">Data Science & AI</option>
              <option value="UI/UX Design">UI/UX Design</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance & Sales</option>
            </select>

            {/* Work Mode */}
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
            >
              <option value="All">All Work Modes</option>
              <option value="Remote">Remote / Work From Home</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>

            {/* Paid / PPO */}
            <select
              value={selectedJobOffer}
              onChange={(e) => setSelectedJobOffer(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
            >
              <option value="All">Offer Type: All</option>
              <option value="true">With Job Offer (PPO)</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-blue-600"
            >
              <option value="latest">Sort: Recently Posted</option>
              <option value="stipend_high">Stipend: High to Low</option>
              <option value="stipend_low">Stipend: Low to High</option>
            </select>
          </div>
        </div>

        {/* Results Content */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading categorized internships from database...</p>
          </div>
        ) : internships.length > 0 ? (
          <div className="space-y-4">
            {internships.map((intItem) => {
              const isSaved = savedIds.includes(intItem.id || intItem._id);
              return (
                <div
                  key={intItem.id || intItem._id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{intItem.title}</h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {intItem.workMode}
                      </span>
                      {intItem.hasJobOffer && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          🎯 With Job Offer (PPO)
                        </span>
                      )}
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {intItem.category}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-900">{intItem.company}</span> • 📍 {intItem.location}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                        {intItem.stipend}
                      </span>
                      <span>• Duration: {intItem.duration}</span>
                      {intItem.deadline && <span>• Apply before: {intItem.deadline}</span>}
                    </div>

                    {intItem.skillsRequired && intItem.skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {intItem.skillsRequired.map((skill, sIdx) => (
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
                      onClick={() => handleSaveToggle(intItem)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        isSaved
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      title={isSaved ? "Saved" : "Save Internship"}
                    >
                      {isSaved ? "★ Saved" : "☆ Save"}
                    </button>

                    <button
                      onClick={() => handleApply(intItem)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Quick Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              🔍
            </div>
            <h3 className="text-sm font-bold text-slate-900">No internships found in this category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No live openings matching your selected filters. Try broadening your location or skill filter.
            </p>
            <div className="pt-2">
              <Link
                to="/internships"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-block shadow-xs transition"
              >
                Explore All Internships
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InternshipDiscoveryPage;
