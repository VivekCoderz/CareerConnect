import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/authSlice";
import { logoutUser } from "../../services/authService";
import { getProfessionalDashboardData } from "../../services/professionalDashboardService";

const ProfessionalDashboard = () => {
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
      const res = await getProfessionalDashboardData();
      if (res?.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error("Failed to load professional dashboard:", err);
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
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Executive Hub...</h2>
        <p className="text-xs text-slate-500 mt-1">Aggregating curated executive matches and career metrics</p>
      </div>
    );
  }

  const profile = dashboardData?.profile || {};
  const proName = dashboardData?.user?.fullName || user?.fullName || "Leader";
  const completion = dashboardData?.profileCompletion ?? 85;
  const careerStrength = dashboardData?.careerStrength || { score: 82, tips: [] };
  const recommendedJobs = dashboardData?.recommendedJobs || [];
  const applications = dashboardData?.applications || {
    stats: { applied: 0, underReview: 0, shortlisted: 0, interview: 0 },
    recent: [],
  };

  const currentEmp = profile?.currentEmployment || {};
  const experienceYears = profile?.totalExperienceYears ? `${profile.totalExperienceYears}+ Years` : "4+ Years";

  const allSkills = [
    ...(profile?.skills?.cloud || []).map((s) => s.name),
    ...(profile?.skills?.programmingLanguages || []).map((s) => s.name),
    ...(profile?.skills?.frameworks || []).map((s) => s.name),
    ...(profile?.skills?.databases || []).map((s) => s.name),
    ...(profile?.skills?.management || []).map((s) => s.name),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-lg text-white shadow-md shadow-violet-600/30">
              C
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">CareerConnect</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                Executive Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/professional/profile"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition border border-violet-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Manage Executive Profile
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
        <section className="bg-gradient-to-r from-violet-800 via-purple-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-violet-200 text-xs font-medium mb-3 backdrop-blur-sm">
              💼 Executive & Leadership Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome, {proName}!
            </h1>
            <p className="text-violet-100 text-xs sm:text-sm mt-2 leading-relaxed max-w-2xl">
              {profile?.professionalHeadline ||
                "Accelerate your career trajectory. Discover confidential leadership transitions, track executive applications, and optimize high-scale compensation."}
            </p>

            {/* Metrics Dual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-2xl">
              {/* Profile Strength */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span>Profile Strength</span>
                  <span className="text-violet-200">{completion}% Complete</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-violet-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <Link
                  to="/professional/profile"
                  className="inline-block text-[11px] font-semibold text-violet-200 hover:text-white mt-2"
                >
                  {completion >= 80 ? "Profile is fully detailed →" : "Boost profile to 100% →"}
                </Link>
              </div>

              {/* Career Strength Score */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span>Career Strength Score</span>
                  <span className="text-violet-200">{careerStrength.score} / 100</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${careerStrength.score}%` }}
                  />
                </div>
                <p className="text-[11px] text-violet-100/80 mt-2 truncate">
                  {careerStrength.tips?.[0] || "Top-tier executive profile strength"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Matched Roles & Career Snapshot */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Position Snapshot */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900">Current Position Snapshot</h2>
                <Link to="/professional/profile" className="text-xs font-bold text-violet-600 hover:underline">
                  Update Role
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Role & Company</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{currentEmp.jobTitle || "Lead Engineer"}</h3>
                  <p className="text-xs font-bold text-violet-700 mt-0.5">{currentEmp.company || "Enterprise"}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Experience & Level</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{experienceYears}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{profile.currentLevel || "Senior"}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Target Promotion</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{profile?.careerGoal?.targetRole || "Staff Architect"}</h3>
                  <p className="text-xs text-emerald-700 font-bold mt-0.5">{profile?.availability?.noticePeriod || "30 Days"} Notice</p>
                </div>
              </div>
            </section>

            {/* Curated Executive & High-Growth Roles */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Curated Senior & Executive Roles</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold">
                      Rule-Matched
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Roles filtered to match your seniority, technical competencies, and target career level
                  </p>
                </div>
                <Link to="/professional/profile" className="text-xs font-bold text-violet-600 hover:underline">
                  Filter Preferences
                </Link>
              </div>

              <div className="space-y-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-violet-300 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                          {job.matchPercentage}% Match
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {job.company} • 📍 {job.location} ({job.workMode})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-violet-800">{job.salary}</span>
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
                      onClick={() => alert(`Confidential inquiry submitted for ${job.title} at ${job.company}!`)}
                      className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-xs self-start sm:self-center whitespace-nowrap"
                    >
                      Express Interest
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Applications Tracker */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Application Pipeline</h2>
                <span className="text-xs font-bold text-slate-500">
                  {applications.stats.applied} Total Submissions
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 font-semibold block">Applied</span>
                  <span className="text-lg font-bold text-slate-800">{applications.stats.applied}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 font-semibold block">Under Review</span>
                  <span className="text-lg font-bold text-blue-600">{applications.stats.underReview}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 font-semibold block">Shortlisted</span>
                  <span className="text-lg font-bold text-purple-600">{applications.stats.shortlisted}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 font-semibold block">Interview 📅</span>
                  <span className="text-lg font-bold text-emerald-600">{applications.stats.interview}</span>
                </div>
              </div>

              <div className="space-y-2">
                {applications.recent.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{app.title}</span>
                      <span className="text-slate-500 ml-2">@ {app.company}</span>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Competencies & Resume */}
          <div className="space-y-8">
            {/* Core Competencies */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900">Technical Competencies</h2>
                <Link to="/professional/profile" className="text-xs font-semibold text-violet-600 hover:underline">
                  Update
                </Link>
              </div>

              {allSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allSkills.slice(0, 12).map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-semibold bg-violet-50 text-violet-800 rounded-lg border border-violet-100"
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
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl font-bold">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-900">Executive ATS Resume</h3>
              <p className="text-xs text-slate-500">
                Your ATS-optimized executive resume is continuously compiled from your latest deliverables and achievements.
              </p>
              <Link
                to="/professional/profile"
                className="inline-block w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-xs"
              >
                View & Download Resume →
              </Link>
            </section>

            {/* Recruiter Confidential Mode */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">Confidential Career Mode</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your current compensation is protected. Only verified enterprise recruiters can reach out about matching leadership roles.
              </p>
              <Link
                to="/professional/profile"
                className="inline-block text-xs font-bold text-violet-600 hover:underline"
              >
                Configure Privacy & Outreach →
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalDashboard;
