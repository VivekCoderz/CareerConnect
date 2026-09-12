import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector,useDispatch } from "react-redux";
import InternshipDiscoveryMenu from "../components/internships/InternshipDiscoveryMenu";
import JobDiscoveryMenu from "../components/jobs/JobDiscoveryMenu";
import { getDashboardPath } from "../utils/dashboardRedirect";
import { logout } from "../redux/features/authSlice";
import { logoutUser } from "../services/authService";
import internshipService from "../services/internshipService";
import jobService from "../services/jobService";

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isInitialized } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isInitialized && user) {
      if (user.hasPassword === false) {
        navigate("/set-password", { replace: true });
      } else if (!user.phone?.trim() || !user.isProfileComplete) {
        navigate(user.role === "employer" ? "/onboarding/employer" : "/onboarding/profile", { replace: true });
      } else {
        navigate(getDashboardPath(user.userType || user.role, user), { replace: true });
      }
    }
  }, [user, isInitialized, navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [internships, setInternships] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const sampleFeaturedOpportunities = [
    {
      id: "sample-1",
      title: "Full Stack Developer (E2E Test)",
      company: "TechCorp Global",
      opportunityType: "Full-time",
      salary: "Competitive Package",
      location: "Panipat / Remote",
    },
    {
      id: "sample-2",
      title: "MVP Test Job",
      company: "Geeta University",
      opportunityType: "Full-time",
      salary: "₹0.3 - 0.3 LPA",
      location: "On-Campus",
    },
    {
      id: "sample-3",
      title: "Frontend Engineering Intern (E2E Test)",
      company: "TechCorp Global",
      opportunityType: "Internship",
      salary: "₹25000 INR/month",
      location: "Remote",
    },
  ];

  const featuredJobs = jobs && jobs.length > 0 ? jobs : sampleFeaturedOpportunities;

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [intRes, jobRes] = await Promise.all([
          internshipService.getInternships({ limit: 8, sort: "latest" }).catch(() => ({ internships: [] })),
          jobService.getJobs({ limit: 8, sort: "latest" }).catch(() => ({ jobs: [] })),
        ]);

        if (intRes?.success && Array.isArray(intRes.internships || intRes.data)) {
          setInternships((intRes.internships || intRes.data).slice(0, 8));
        }
        if (jobRes?.success && Array.isArray(jobRes.jobs || jobRes.data)) {
          setJobs((jobRes.jobs || jobRes.data).slice(0, 8));
        }
      } catch (err) {
        console.warn("Home data fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleHeroSearchSubmit = (e) => {
    e?.preventDefault?.();
    if (searchQuery.trim()) {
      navigate(`/opportunities?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/opportunities");
    }
  };

  const dashboardUrl = user ? getDashboardPath(user.userType, user) : "/home";

  if (!isInitialized || user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* ================= 1. INTERNSHALA-STYLE NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px] gap-4">
            {/* Left: Logo & Dropdowns */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Link to="/" className="flex items-center gap-2">
                <img
                  src="/geeta-university-logo.png"
                  alt="Geeta University CareerConnect"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                {/* Fallback Branding */}
                <div className="hidden items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-black text-sm shadow-xs">
                    GU
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-black text-[#1e3a8a] tracking-tight">GEETA</p>
                    <p className="text-[10px] font-bold text-[#f59e0b] tracking-wider uppercase">UNIVERSITY</p>
                  </div>
                </div>
              </Link>

              {/* Navigation Dropdowns like Internshala */}
              <div className="hidden md:flex items-center gap-2">
                <JobDiscoveryMenu />
                <InternshipDiscoveryMenu />
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50/40 transition shadow-2xs"
                >
                  <span>Courses</span>
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-[#ea580c] text-white uppercase tracking-wider">
                    OFFER
                  </span>
                </Link>
              </div>
            </div>


            {/* Right: Auth / Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 pr-1">
                    <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                      {user.fullName?.charAt(0) || "U"}
                    </div>
                    <div className="text-left leading-none">
                      <p className="text-xs font-semibold text-slate-800">{user.fullName || "User"}</p>
                      <span className="text-[10px] text-slate-400 font-medium capitalize">
                        {user.role === "employer" ? "Employer" : (user.userType || "Student")}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={dashboardUrl}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#008bdc] hover:bg-[#0074b7] text-white text-xs font-bold transition shadow-xs"
                  >
                    <span>Dashboard</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="hidden md:inline-flex items-center h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="h-9 px-4 rounded-xl border border-[#008bdc] text-[#008bdc] hover:bg-[#008bdc]/5 text-xs font-bold transition inline-flex items-center justify-center"
                  >
                    Login
                  </Link>

                  <div className="relative group">
                    <Link
                      to="/register/student"
                      className="h-9 px-4 rounded-xl bg-[#008bdc] hover:bg-[#0074b7] text-white text-xs font-bold transition inline-flex items-center justify-center shadow-xs"
                    >
                      Register
                    </Link>
                  </div>

                  <div className="hidden sm:block pl-1">
                    <Link
                      to="/register/employer"
                      className="text-xs font-bold text-[#008bdc] hover:text-[#005f96] transition flex items-center gap-1"
                    >
                      <span>For Employers</span>
                      <span className="text-sm font-normal">›</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. MODERN HERO BANNER SECTION (LIGHT THEME) ================= */}
   <section className="relative overflow-hidden bg-gradient-to-b from-[#eff6ff] via-white to-white">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e3a8a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fff7ed] border border-[#fed7aa] text-[12px] font-semibold text-[#c2410c] mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                Official Career Platform · Geeta University
              </div>

              <h1 className="text-[2.35rem] sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-slate-900 leading-[1.15]">
                Internships & jobs that{" "}
                <span className="text-[#1e3a8a]">shape your career</span>
              </h1>

              <p className="mt-5 text-[16px] text-slate-600 leading-relaxed max-w-xl">
                Explore verified internships, jobs and projects. Build your profile, apply in one click, and take the next step — built for Geeta University students & alumni.
              </p>

              {/* Search */}
              <form onSubmit={handleHeroSearchSubmit} className="mt-8 max-w-xl">
                <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                  <div className="flex-1 flex items-center gap-3 px-3">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search internships, jobs, companies..."
                      className="w-full h-11 text-sm outline-none placeholder:text-slate-400 bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-6 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    Search
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Internship", "Remote", "Fresher", "Part-time", "Work from Home"].map((tag) => (
                    <Link
                      key={tag}
                      to={`/opportunities?type=${encodeURIComponent(tag.toLowerCase())}`}
                      className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e40af] transition shadow-2xs"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </form>

              {/* Dual CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {user ? (
                  <>
                    <Link
                      to={dashboardUrl}
                      className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-bold transition shadow-lg shadow-blue-900/20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to My Dashboard →
                    </Link>
                    <Link
                      to="/opportunities"
                      className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
                    >
                      Browse Opportunities
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register/student"
                      className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition shadow-lg shadow-blue-900/20"
                    >
                      I’m a Student / Fresher
                    </Link>
                    <Link
                      to="/register/employer"
                      className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-semibold transition shadow-lg shadow-amber-500/25"
                    >
                      I’m an Employer / Recruiter
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right - Visual cards */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-6 -right-4 w-72 h-72 bg-[#f59e0b]/10 rounded-full blur-3xl" />
              <div className="relative space-y-4">
                {(featuredJobs.length > 0 ? featuredJobs.slice(0, 3) : []).map((job, i) => (
                  <div
                    key={job.id || job._id || job.title || i}
                    className={`bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 ${
                      i === 1 ? "ml-8" : i === 2 ? "ml-4" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1e3a8a]">
                          {job.opportunityType || job.type || "Live Opportunity"}
                        </span>
                        <p className="mt-2 text-[15px] font-semibold text-slate-900 line-clamp-1">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.company?.name || job.company || "Verified Company"}</p>
                      </div>
                      <p className="text-sm font-bold text-[#1e3a8a] shrink-0">{job.salary || (job.stipend?.amount ? `₹${job.stipend.amount}/month` : "Verified")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    {/* ================= COMPANIES MARQUEE ================= */}
      <section id="companies" className="py-14 lg:py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Hiring partners
            </h2>
            <p className="mt-1.5 text-slate-500 text-sm">
              Companies hiring Geeta University talent
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10" />

          <div className="flex overflow-hidden">
            <div className="flex animate-marquee gap-4 sm:gap-5 py-2">
              {[
                "Google", "Microsoft", "Amazon", "Infosys", "TCS",
                "Wipro", "HCLTech", "Accenture", "Cognizant", "Capgemini",
                "Tech Mahindra", "IBM", "L&T Technology", "Deloitte",
                "Google", "Microsoft", "Amazon", "Infosys", "TCS",
                "Wipro", "HCLTech", "Accenture", "Cognizant", "Capgemini",
                "Tech Mahindra", "IBM", "L&T Technology", "Deloitte",
              ].map((company, i) => (
                <div
                  key={`${company}-${i}`}
                  className="flex-shrink-0 w-36 sm:w-40 h-[88px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-1.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {company.slice(0, 2)}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{company}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ================= 4. TRENDING NOW SECTION ================= */}
      <section className="py-10 bg-slate-50/60 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Trending now
            </h2>
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              📈
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Banner 1: Internships */}
            <Link
              to="/internships"
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  INTERNSHIPS
                </span>
                <h3 className="text-base font-bold mt-2.5 group-hover:text-blue-300 transition leading-snug">
                  Summer Internship Fair 2026
                </h3>
                <p className="text-xs text-slate-300 mt-1">Stipend up to ₹45,000/month</p>
              </div>
              <span className="text-xs font-bold text-blue-400 mt-4 inline-flex items-center gap-1">
                Apply now →
              </span>
            </Link>

            {/* Banner 2: Jobs */}
            <Link
              to="/jobs"
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#075985] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30">
                  JOBS
                </span>
                <h3 className="text-base font-bold mt-2.5 group-hover:text-amber-300 transition leading-snug">
                  Fresher Tech Hiring Fest
                </h3>
                <p className="text-xs text-sky-100 mt-1">Min CTC ₹6 LPA - ₹15 LPA</p>
              </div>
              <span className="text-xs font-bold text-sky-200 mt-4 inline-flex items-center gap-1">
                Explore 85+ Jobs →
              </span>
            </Link>

            {/* Banner 3: Campus Drives */}
            <Link
              to="/opportunities?source=campus"
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#b45309] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  CAMPUS DRIVES
                </span>
                <h3 className="text-base font-bold mt-2.5 group-hover:text-amber-200 transition leading-snug">
                  Geeta University Recruitment
                </h3>
                <p className="text-xs text-amber-100 mt-1">120+ Partner Companies On-Campus</p>
              </div>
              <span className="text-xs font-bold text-amber-200 mt-4 inline-flex items-center gap-1">
                View On-Campus Drives →
              </span>
            </Link>

            {/* Banner 4: Courses */}
            <Link
              to="/courses"
              className="group p-5 rounded-3xl bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#6d28d9] text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-400/20 text-purple-200 border border-purple-300/30">
                  COURSES
                </span>
                <h3 className="text-base font-bold mt-2.5 group-hover:text-purple-200 transition leading-snug">
                  Job Oriented Certifications
                </h3>
                <p className="text-xs text-purple-100 mt-1">With Live Industry Projects</p>
              </div>
              <span className="text-xs font-bold text-purple-300 mt-4 inline-flex items-center gap-1">
                Enroll with 55% OFF →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 5. LATEST INTERNSHIPS ON CAREERCONNECT ================= */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Latest internships on CareerConnect
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                POPULAR CATEGORIES:{" "}
                <Link to="/internships/work-from-home" className="text-blue-600 font-semibold hover:underline">
                  Work from home
                </Link>{" "}
                •{" "}
                <Link to="/internships/in/delhi" className="text-blue-600 font-semibold hover:underline">
                  Delhi/NCR
                </Link>{" "}
                •{" "}
                <Link to="/internships/in/bangalore" className="text-blue-600 font-semibold hover:underline">
                  Bangalore
                </Link>{" "}
                •{" "}
                <Link to="/internships/category/data-science" className="text-blue-600 font-semibold hover:underline">
                  Data Science
                </Link>
              </p>
            </div>
            <Link
              to="/internships"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1 shrink-0"
            >
              <span>View all internships (10/page)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Internships Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-5 bg-slate-200 rounded w-4/5" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : internships.length > 0 ? (
              internships.slice(0, 4).map((item, idx) => (
                <div
                  key={item._id || item.id || idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {item.workMode || "Remote"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.postedAt || "Recently"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">{item.company}</p>
                    <p className="text-[11px] text-slate-400">📍 {item.location}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-700">{item.stipend || "Paid"}</span>
                    <Link
                      to="/internships"
                      className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Apply ›
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No internships found right now.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 6. LATEST JOBS ON CAREERCONNECT ================= */}
      <section className="py-12 bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Latest jobs on CareerConnect
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                POPULAR STREAMS:{" "}
                <Link to="/jobs/category/software-development" className="text-blue-600 font-semibold hover:underline">
                  Software Engineer
                </Link>{" "}
                •{" "}
                <Link to="/jobs/category/data-science" className="text-blue-600 font-semibold hover:underline">
                  Data Analyst
                </Link>{" "}
                •{" "}
                <Link to="/jobs/category/marketing" className="text-blue-600 font-semibold hover:underline">
                  Marketing
                </Link>{" "}
                •{" "}
                <Link to="/jobs/work-from-home" className="text-blue-600 font-semibold hover:underline">
                  Remote Jobs
                </Link>
              </p>
            </div>
            <Link
              to="/jobs"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1 shrink-0"
            >
              <span>View all jobs (10/page)</span>
              <span>→</span>
            </Link>
          </div>

          {/* Jobs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-5 bg-slate-200 rounded w-4/5" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : jobs.length > 0 ? (
              jobs.slice(0, 4).map((jobItem, idx) => (
                <div
                  key={jobItem._id || jobItem.id || idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        {jobItem.employmentType || "Full Time"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {jobItem.postedAt || "Recently"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                      {jobItem.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">{jobItem.company}</p>
                    <p className="text-[11px] text-slate-400">📍 {jobItem.location}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{jobItem.salary || "Competitive"}</span>
                    <Link
                      to="/jobs"
                      className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Apply ›
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No jobs found right now.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 7. CERTIFICATION COURSES BANNER ================= */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-extrabold mb-1">
                <span>⚡ PLACEMENT ASSISTANCE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Certification courses for students & freshers
              </h2>
            </div>
            <Link to="/courses" className="text-xs font-bold text-blue-600 hover:underline">
              View all courses →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Full Stack Web Development", icon: "💻", duration: "8 Weeks", tag: "Most Popular" },
              { title: "Python with AI & Machine Learning", icon: "🤖", duration: "6 Weeks", tag: "Trending" },
              { title: "Data Science & PowerBI", icon: "📊", duration: "6 Weeks", tag: "High Demand" },
              { title: "Digital Marketing & Growth", icon: "📈", duration: "4 Weeks", tag: "Beginner Friendly" },
            ].map((course, idx) => (
              <Link
                key={idx}
                to="/courses"
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition space-y-3 group"
              >
                <div className="text-2xl">{course.icon}</div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {course.tag}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition mt-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Duration: {course.duration}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

        {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How it works
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Register & verify", desc: "Create your account with email OTP verification as student, fresher or professional." },
              { step: "2", title: "Complete your profile", desc: "Add education, skills, projects and resume so recruiters can find you." },
              { step: "3", title: "Apply & get hired", desc: "Browse opportunities, apply in one click, and track interviews & offers." },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl border border-slate-200 p-6">
                <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center text-sm font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 8. STATS & NUMBERS STRIP ================= */}
      <section className="border-t border-slate-100 bg-[#0a2540] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#facc15]">300K+</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">Companies hiring</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white">10K+</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">New openings monthly</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#facc15]">21Mn+</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">Active candidates</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white">100%</p>
              <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">Verified opportunities</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. INTERNSHALA STYLE FOOTER ================= */}
      <footer className="bg-[#121b2b] text-slate-300 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {/* Col 1: Internships by Place */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Internships by places
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/internships/in/delhi" className="hover:text-white">Internship in Delhi</Link></li>
                <li><Link to="/internships/in/bangalore" className="hover:text-white">Internship in Bangalore</Link></li>
                <li><Link to="/internships/in/hyderabad" className="hover:text-white">Internship in Hyderabad</Link></li>
                <li><Link to="/internships/in/mumbai" className="hover:text-white">Internship in Mumbai</Link></li>
                <li><Link to="/internships/in/chennai" className="hover:text-white">Internship in Chennai</Link></li>
                <li><Link to="/internships/in/pune" className="hover:text-white">Internship in Pune</Link></li>
                <li><Link to="/internships/work-from-home" className="hover:text-white">Virtual internship</Link></li>
              </ul>
            </div>

            {/* Col 2: Internships by Stream */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Internship by Stream
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/internships/category/computer-science" className="hover:text-white">Computer Science</Link></li>
                <li><Link to="/internships/category/web-development" className="hover:text-white">Web Development</Link></li>
                <li><Link to="/internships/category/data-science" className="hover:text-white">Data Science</Link></li>
                <li><Link to="/internships/category/marketing" className="hover:text-white">Marketing</Link></li>
                <li><Link to="/internships/category/finance" className="hover:text-white">Finance</Link></li>
                <li><Link to="/internships/category/graphic-design" className="hover:text-white">Graphic Design</Link></li>
                <li><Link to="/internships/category/hr" className="hover:text-white">Human Resources</Link></li>
              </ul>
            </div>

            {/* Col 3: Jobs by Places */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Jobs by Places
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/jobs/in/delhi" className="hover:text-white">Jobs in Delhi</Link></li>
                <li><Link to="/jobs/in/bangalore" className="hover:text-white">Jobs in Bangalore</Link></li>
                <li><Link to="/jobs/in/mumbai" className="hover:text-white">Jobs in Mumbai</Link></li>
                <li><Link to="/jobs/in/hyderabad" className="hover:text-white">Jobs in Hyderabad</Link></li>
                <li><Link to="/jobs/in/pune" className="hover:text-white">Jobs in Pune</Link></li>
                <li><Link to="/jobs/work-from-home" className="hover:text-white">Remote Jobs</Link></li>
              </ul>
            </div>

            {/* Col 4: Jobs by Stream */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Jobs by Stream
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/jobs/category/software-development" className="hover:text-white">Software Engineer</Link></li>
                <li><Link to="/jobs/category/data-science" className="hover:text-white">Data Analyst</Link></li>
                <li><Link to="/jobs/category/marketing" className="hover:text-white">Digital Marketing</Link></li>
                <li><Link to="/jobs/category/sales" className="hover:text-white">Sales & Business Dev</Link></li>
                <li><Link to="/jobs/category/finance" className="hover:text-white">Finance Executive</Link></li>
              </ul>
            </div>

            {/* Col 5: About & Campus */}
            <div className="space-y-2.5">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                About CareerConnect
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li><Link to="/home" className="hover:text-white">About Geeta University</Link></li>
                <li><Link to="/opportunities?source=campus" className="hover:text-white">Placement Cell</Link></li>
                <li><Link to="/courses" className="hover:text-white">Training & Certifications</Link></li>
                <li><Link to="/register/employer" className="hover:text-white">Hire from Campus</Link></li>
                <li><Link to="/login" className="hover:text-white">Candidate Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} Geeta University · CareerConnect. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/home" className="hover:text-slate-300">Privacy Policy</Link>
              <span>•</span>
              <Link to="/home" className="hover:text-slate-300">Terms & Conditions</Link>
              <span>•</span>
              <Link to="/home" className="hover:text-slate-300">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;