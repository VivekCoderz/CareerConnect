import { useState } from "react";
import { Link } from "react-router-dom";

// Realistic fallbacks in case user profile has no matches yet
const FALLBACK_JOB = {
  id: "job-fb-1",
  title: "Associate Software Engineer",
  company: "Amazon Development Centre",
  location: "Bangalore / Remote",
  salary: "₹8,50,000 - ₹12,00,000 / year",
  type: "Full Time",
  workMode: "Hybrid",
  postedAt: "Actively hiring",
  skillsRequired: ["React", "Node.js", "JavaScript", "SQL"],
  applyLink: "/jobs",
};

const FALLBACK_INTERNSHIP = {
  id: "int-fb-1",
  title: "Full Stack Web Development Intern",
  company: "Zomato Technologies",
  location: "Gurugram / Remote",
  stipend: "₹25,000 - ₹35,000 / month",
  duration: "6 Months",
  workMode: "Work from home",
  skillsRequired: ["React", "Node.js", "MongoDB", "Tailwind CSS"],
  applyLink: "/internships",
};

const FALLBACK_COURSE = {
  id: "crs-fb-1",
  title: "Full Stack Web Development Masterclass",
  provider: "Geeta University Academy",
  duration: "8 Weeks (Certified)",
  level: "Beginner to Advanced",
  rating: "4.9",
  isFree: true,
  skillsCovered: ["React", "Node.js", "Express", "System Design"],
};

const InternshalaDashboardRecommendations = ({
  jobs = [],
  internships = [],
  courses = [],
  savedIds = [],
  onSave,
  onApply,
  onNavigateTab,
}) => {
  const [activeCategory, setActiveCategory] = useState("all");

  const topJob = jobs && jobs.length > 0 ? jobs[0] : FALLBACK_JOB;
  const topInternship = internships && internships.length > 0 ? internships[0] : FALLBACK_INTERNSHIP;
  const topCourse = courses && courses.length > 0 ? courses[0] : FALLBACK_COURSE;

  const isJobSaved = savedIds.includes(topJob.id || topJob._id);
  const isInternshipSaved = savedIds.includes(topInternship.id || topInternship._id);

  // Normalize skills arrays safely
  const jobSkills = topJob.skillsRequired || topJob.skills || ["React", "Node.js", "SQL"];
  const internshipSkills = topInternship.skillsRequired || topInternship.skills || ["React", "JavaScript", "CSS"];
  const courseSkills = topCourse.skillsCovered || topCourse.skills || ["Full Stack", "Live Projects"];

  // Normalize salary / stipend strings
  const jobSalary =
    topJob.salary ||
    (topJob.salaryRange?.min
      ? `₹${topJob.salaryRange.min.toLocaleString()} - ₹${(topJob.salaryRange.max || topJob.salaryRange.min).toLocaleString()}`
      : "Competitive CTC");

  const internshipStipend =
    topInternship.stipend ||
    (topInternship.stipendAmount?.min
      ? `₹${topInternship.stipendAmount.min.toLocaleString()} / month`
      : "Competitive Stipend");

  // Format apply link for job
  const jobApplyHref = topJob.applyLink || topJob.applyUrl;
  const isJobExternal = jobApplyHref && (jobApplyHref.startsWith("http://") || jobApplyHref.startsWith("https://"));

  // Format apply link for internship
  const intApplyHref = topInternship.applyLink || topInternship.applyUrl;
  const isIntExternal = intApplyHref && (intApplyHref.startsWith("http://") || intApplyHref.startsWith("https://"));

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
      {/* ================= 1. INTERNSHALA "TRENDING NOW" BANNER ROW ================= */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Trending now
            </h2>
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shadow-xs">
              📈
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
            Curated hiring drives for Geeta University Students
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Banner 1: Internships */}
          <Link
            to="/internships"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#0a2540] via-[#123e74] to-[#1e58a8] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400/20 text-blue-200 border border-blue-300/30 uppercase tracking-wide">
                INTERNSHIPS
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-[#facc15] transition leading-snug line-clamp-1">
                Summer Internship Fair 2026
              </h3>
              <p className="text-xs text-blue-100/80 mt-1">Stipend up to ₹45,000/month</p>
            </div>
            <span className="text-xs font-bold text-[#facc15] mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore Internships</span>
              <span>→</span>
            </span>
          </Link>

          {/* Banner 2: Jobs */}
          <Link
            to="/jobs"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#075985] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-sky-300/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30 uppercase tracking-wide">
                JOBS
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-amber-300 transition leading-snug line-clamp-1">
                Fresher Tech Hiring Fest
              </h3>
              <p className="text-xs text-sky-100/90 mt-1">Min CTC ₹6 LPA - ₹15 LPA</p>
            </div>
            <span className="text-xs font-bold text-sky-200 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore 100+ Jobs</span>
              <span>→</span>
            </span>
          </Link>

          {/* Banner 3: Courses */}
          <Link
            to="/courses"
            className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#6d28d9] text-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-purple-400/20 blur-xl pointer-events-none" />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-300/20 text-purple-200 border border-purple-300/30 uppercase tracking-wide">
                COURSES
              </span>
              <h3 className="text-base font-bold mt-2.5 group-hover:text-purple-200 transition leading-snug line-clamp-1">
                Certified Career Tracks
              </h3>
              <p className="text-xs text-purple-100/80 mt-1">Free Geeta University Specialization</p>
            </div>
            <span className="text-xs font-bold text-purple-200 mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Explore Courses</span>
              <span>→</span>
            </span>
          </Link>
        </div>
      </div>

      {/* ================= 2. INTERNSHALA RECOMMENDED SECTION ================= */}
      <div className="space-y-4">
        {/* Header + Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Recommended For You
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Top #1 Pick Each
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized matches curated according to your skills and branch
            </p>
          </div>

          {/* Category Tabs (Mobile scrollable) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none self-start sm:self-auto max-w-full">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All (3)
            </button>
            <button
              onClick={() => setActiveCategory("job")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "job"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              💼 Job
            </button>
            <button
              onClick={() => setActiveCategory("internship")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "internship"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🎓 Internship
            </button>
            <button
              onClick={() => setActiveCategory("course")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === "course"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📚 Course
            </button>
          </div>
        </div>

        {/* Dynamic Card Container */}
        <div
          className={
            activeCategory === "all"
              ? "grid grid-cols-1 md:grid-cols-3 gap-5"
              : "grid grid-cols-1 max-w-xl mx-auto md:mx-0 gap-5"
          }
        >
          {/* ================= CARD 1: RECOMMENDED JOB ================= */}
          {(activeCategory === "all" || activeCategory === "job") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between gap-4 group">
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    💼 JOB • #1 PICK
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    <span>⚡</span>
                    <span>Actively hiring</span>
                  </span>
                </div>

                {/* Company & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                      {topJob.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                      {topJob.company}
                    </p>
                  </div>
                  {topJob.logo || topJob.companyLogo ? (
                    <img
                      src={topJob.logo || topJob.companyLogo}
                      alt={topJob.company}
                      className="w-11 h-11 rounded-xl object-contain p-1 bg-white border border-slate-200 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-base flex items-center justify-center shrink-0">
                      {(topJob.company || "J")[0]}
                    </div>
                  )}
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-slate-100 my-3.5" />

                {/* Metadata List with Icons */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">📍</span>
                    <span className="font-medium text-slate-700 line-clamp-1">
                      {topJob.location || "Bangalore / Remote"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      {topJob.workMode || "Hybrid"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">💵</span>
                    <span className="font-bold text-emerald-700">{jobSalary}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">💼</span>
                    <span className="text-slate-500 font-medium">
                      {topJob.type || "Full Time Opportunity"}
                    </span>
                  </div>
                </div>

                {/* Skills Tags */}
                {jobSkills && jobSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    {jobSkills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/80"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSave && onSave(topJob)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isJobSaved
                        ? "bg-amber-50 border-amber-300 text-amber-600"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                    title={isJobSaved ? "Saved" : "Save Job"}
                  >
                    {isJobSaved ? "★" : "☆"}
                  </button>

                  {isJobExternal ? (
                    <a
                      href={jobApplyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>Apply Online</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApply && onApply(topJob)}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>Apply Now</span>
                      <span>›</span>
                    </button>
                  )}
                </div>

                {/* Footer Explorer Link */}
                <div className="text-center pt-2.5 border-t border-slate-50 mt-2.5">
                  <Link
                    to="/jobs"
                    className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore all jobs (10/page)</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ================= CARD 2: RECOMMENDED INTERNSHIP ================= */}
          {(activeCategory === "all" || activeCategory === "internship") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-500 hover:shadow-xl transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between gap-4 group">
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                    🎓 INTERNSHIP • #1 PICK
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    <span>⚡</span>
                    <span>Actively hiring</span>
                  </span>
                </div>

                {/* Company & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition line-clamp-1">
                      {topInternship.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                      {topInternship.company}
                    </p>
                  </div>
                  {topInternship.logo || topInternship.companyLogo ? (
                    <img
                      src={topInternship.logo || topInternship.companyLogo}
                      alt={topInternship.company}
                      className="w-11 h-11 rounded-xl object-contain p-1 bg-white border border-slate-200 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-black text-base flex items-center justify-center shrink-0">
                      {(topInternship.company || "I")[0]}
                    </div>
                  )}
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-slate-100 my-3.5" />

                {/* Metadata List with Icons */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">📍</span>
                    <span className="font-medium text-slate-700 line-clamp-1">
                      {topInternship.location || "Delhi / Remote"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      {topInternship.workMode || "Remote"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">💵</span>
                    <span className="font-bold text-emerald-700">{internshipStipend}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">⏳</span>
                    <span className="text-slate-500 font-medium">
                      {topInternship.duration || "3 - 6 Months"}
                    </span>
                  </div>
                </div>

                {/* Skills Tags */}
                {internshipSkills && internshipSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    {internshipSkills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200/80"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSave && onSave(topInternship)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isInternshipSaved
                        ? "bg-amber-50 border-amber-300 text-amber-600"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                    title={isInternshipSaved ? "Saved" : "Save Internship"}
                  >
                    {isInternshipSaved ? "★" : "☆"}
                  </button>

                  {isIntExternal ? (
                    <a
                      href={intApplyHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2.5 px-3 bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>Apply Online</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApply && onApply(topInternship)}
                      className="flex-1 py-2.5 px-3 bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>Quick Apply</span>
                      <span>›</span>
                    </button>
                  )}
                </div>

                {/* Footer Explorer Link */}
                <div className="text-center pt-2.5 border-t border-slate-50 mt-2.5">
                  <Link
                    to="/internships"
                    onClick={() => onNavigateTab && onNavigateTab("internships")}
                    className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore all internships (10/page)</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ================= CARD 3: RECOMMENDED COURSE ================= */}
          {(activeCategory === "all" || activeCategory === "course") && (
            <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-500 hover:shadow-xl transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between gap-4 group">
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                    📚 COURSE • #1 PICK
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <span>★</span>
                    <span>{topCourse.rating || "4.8"} Rating</span>
                  </span>
                </div>

                {/* Provider & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition line-clamp-1">
                      {topCourse.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                      {topCourse.provider || "Geeta University Academy"}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-black text-xl flex items-center justify-center shrink-0">
                    🎓
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-slate-100 my-3.5" />

                {/* Metadata List with Icons */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">⏱</span>
                    <span className="font-medium text-slate-700">
                      {topCourse.duration || "6-8 Weeks"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                      {topCourse.level || "All Levels"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold shrink-0">🏷</span>
                    <span className="font-bold text-purple-700">
                      {topCourse.isFree ? "100% FREE with Certificate" : "University Certified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">📜</span>
                    <span className="text-slate-500 font-medium line-clamp-1">
                      Industry Live Projects Included
                    </span>
                  </div>
                </div>

                {/* Skills Tags */}
                {courseSkills && courseSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    {courseSkills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200/60"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
                  <Link
                    to={topCourse.id || topCourse._id ? `/courses/${topCourse.id || topCourse._id}` : "/courses"}
                    className="w-full text-center py-2.5 px-3 bg-[#1e3a8a] hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1"
                  >
                    <span>View Course & Enroll</span>
                    <span>›</span>
                  </Link>
                </div>

                {/* Footer Explorer Link */}
                <div className="text-center pt-2.5 border-t border-slate-50 mt-2.5">
                  <Link
                    to="/courses"
                    className="text-[11px] font-bold text-purple-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore all courses →</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternshalaDashboardRecommendations;
