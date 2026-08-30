import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/authSlice";
import { logoutUser } from "../../services/authService";
import { getFresherDashboardData } from "../../services/fresherDashboardService";

const FresherDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFresherDashboardData();
      if (res?.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error("Failed to load fresher dashboard:", err);
      setError("Unable to load workspace data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    dispatch(logout());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Fresher Workspace...</h2>
        <p className="text-xs text-slate-500 mt-1">Fetching your customized job matches and metrics</p>
      </div>
    );
  }

  const profile = dashboardData?.profile || {};
  const fresherName = dashboardData?.user?.fullName || user?.fullName || "Graduate";
  const completion = dashboardData?.profileCompletion ?? 75;
  const readiness = dashboardData?.jobReadiness || { score: 70, tips: [] };
  const recommendedJobs = dashboardData?.recommendedJobs || [];
  const recommendedInternships = dashboardData?.recommendedInternships || [];
  const applications = dashboardData?.applications || { stats: { applied: 0, underReview: 0, shortlisted: 0 }, recent: [] };

  const projects = profile?.projects || [];
  const internships = profile?.internships || [];
  const skills = [
    ...(profile?.skills?.programmingLanguages || []).map((s) => s.name),
    ...(profile?.skills?.frameworks || []).map((s) => s.name),
    ...(profile?.skills?.databases || []).map((s) => s.name),
    ...(profile?.skills?.tools || []).map((s) => s.name),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-emerald-600/30">
              C
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">CareerConnect</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Fresher Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/fresher/profile"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Manage Profile
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium mb-3 backdrop-blur-sm">
              🚀 Entry-Level Career Launchpad
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {fresherName}!
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-2 leading-relaxed max-w-2xl">
              {profile?.professionalHeadline ||
                "Launch your career. Discover entry-level roles, track applications, and showcase your project portfolio."}
            </p>

            {/* Metrics Dual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-2xl">
              {/* Profile Completion */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span>Profile Strength</span>
                  <span className="text-emerald-200">{completion}% Complete</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <Link
                  to="/fresher/profile"
                  className="inline-block text-[11px] font-semibold text-emerald-200 hover:text-white mt-2"
                >
                  {completion >= 80 ? "Profile is fully detailed →" : "Boost profile to 100% →"}
                </Link>
              </div>

              {/* Job Readiness */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span>Job Readiness Score</span>
                  <span className="text-emerald-200">{readiness.score} / 100</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-100/80 mt-2 truncate">
                  {readiness.tips?.[0] || "Top candidate match profile"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Matched Jobs & Projects */}
          <div className="lg:col-span-2 space-y-8">
            {/* Matched Entry-Level Jobs */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Recommended Jobs for You</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Rule-Matched
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Entry-level openings calculated against your skills & target preferences
                  </p>
                </div>
                <Link to="/fresher/profile" className="text-xs font-bold text-emerald-600 hover:underline">
                  Filter Preferences
                </Link>
              </div>

              <div className="space-y-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-emerald-200 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {job.matchPercentage}% Match
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {job.company} • 📍 {job.location} ({job.workMode})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-emerald-700">{job.salary}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500">{job.experienceRequired}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {(job.skillsRequired || []).map((sk, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-semibold border border-slate-200"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Application submitted for ${job.title} at ${job.company}!`)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs self-start sm:self-center whitespace-nowrap"
                    >
                      1-Click Apply
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Projects Showcase */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Featured Projects Portfolio</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Your live demonstrations and repositories</p>
                </div>
                <Link
                  to="/fresher/profile"
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  + Add Project
                </Link>
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {p.projectType || "Personal"}
                          </span>
                          {p.role && <span className="text-[11px] text-slate-500 font-semibold">{p.role}</span>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">{p.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(p.technologies || []).slice(0, 3).map((t, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded border border-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50">
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            Source Code ↗
                          </a>
                        )}
                        {p.liveUrl && (
                          <a
                            href={p.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Live Demo ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-2">No projects added yet.</p>
                  <Link
                    to="/fresher/profile"
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Add projects to boost your readiness score →
                  </Link>
                </div>
              )}
            </section>

            {/* Internship Experience */}
            {internships.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Internship Experience</h2>
                  <Link to="/fresher/profile" className="text-xs font-bold text-emerald-600 hover:underline">
                    Edit
                  </Link>
                </div>

                <div className="space-y-3">
                  {internships.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{item.role}</h3>
                          <p className="text-xs font-bold text-emerald-700">{item.companyName}</p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">{item.workMode}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Skills, ATS Resume, Intern-to-Hire */}
          <div className="space-y-8">
            {/* Key Skills */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900">Technical Skills</h2>
                <Link to="/fresher/profile" className="text-xs font-semibold text-emerald-600 hover:underline">
                  Update
                </Link>
              </div>

              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No skills added yet.</p>
              )}
            </section>

            {/* ATS Resume Quick Card */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-900">Fresher ATS Resume</h3>
              <p className="text-xs text-slate-500">
                Your ATS-compliant resume is automatically generated from your profile.
              </p>
              <Link
                to="/fresher/profile"
                className="inline-block w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                View & Download Resume →
              </Link>
            </section>

            {/* Intern-to-Hire Programs */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Intern-to-Hire Programs</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Campus
                </span>
              </div>

              <div className="space-y-3">
                {recommendedInternships.map((int) => (
                  <div key={int.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900">{int.title}</h3>
                    <p className="text-[11px] font-semibold text-emerald-700">{int.company}</p>
                    <div className="flex justify-between items-center text-[11px] text-slate-600 font-semibold pt-1">
                      <span>{int.stipend}</span>
                      <span className="text-slate-400">• {int.workMode}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FresherDashboard;
