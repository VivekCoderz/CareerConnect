import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/authSlice";
import { logoutUser } from "../../services/authService";
import { getFresherDashboardData } from "../../services/fresherDashboardService";

// Fresher Dashboard Components
import FresherSidebar from "../../components/fresher-dashboard/FresherSidebar";
import FresherNavbar from "../../components/fresher-dashboard/FresherNavbar";
import FresherHeader from "../../components/fresher-dashboard/FresherHeader";
import FresherQuickActions from "../../components/fresher-dashboard/FresherQuickActions";
import FresherRecommendedJobs from "../../components/fresher-dashboard/FresherRecommendedJobs";
import FresherSkillDevelopment from "../../components/fresher-dashboard/FresherSkillDevelopment";
import FresherRecommendedCourses from "../../components/fresher-dashboard/FresherRecommendedCourses";
import FresherResumeCard from "../../components/fresher-dashboard/FresherResumeCard";
import FresherExperienceSection from "../../components/fresher-dashboard/FresherExperienceSection";
import FresherApplicationTracker from "../../components/fresher-dashboard/FresherApplicationTracker";
import FresherCareerRecommendations from "../../components/fresher-dashboard/FresherCareerRecommendations";
import FresherRecentActivity from "../../components/fresher-dashboard/FresherRecentActivity";

const FresherDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
    navigate("/", { replace: true });
  };

  const handleSearch = (term) => {
    if (term.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(term.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Fresher Workspace...</h2>
        <p className="text-xs text-slate-500 mt-1">Fetching your customized job matches and skill benchmarks</p>
      </div>
    );
  }

  const currentUser = dashboardData?.user || user;
  const profile = dashboardData?.profile || {};
  const completion = dashboardData?.profileCompletion ?? 80;
  const careerTarget = dashboardData?.careerTarget || {
    targetRole: profile.targetRole || "Full Stack Developer",
    jobType: "Full-time opportunities",
    workMode: "Remote / Hybrid",
    preferredLocations: ["Bangalore", "Pune", "Remote"],
    careerGoal: "Get my first job",
  };

  const recommendedJobs = dashboardData?.recommendedJobs || [];
  const skillDev = dashboardData?.skillDevelopment || {
    userSkills: ["JavaScript", "React", "MongoDB", "Git"],
    recommendedSkills: [],
  };
  const recommendedCourses = dashboardData?.recommendedCourses || [];
  const resumeData = profile?.resume || {};
  const experienceSummary = dashboardData?.experienceSummary || {};
  const applications = dashboardData?.applications || { stats: {}, recent: [] };
  const careerRecommendations = dashboardData?.careerRecommendations || [];
  const recentActivity = dashboardData?.recentActivity || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      {/* Sidebar */}
      <FresherSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <FresherNavbar
          user={currentUser}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
          onSearch={handleSearch}
        />

        {/* Workspace Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header Banner */}
          <FresherHeader
            user={currentUser}
            careerTarget={careerTarget}
            profileCompletion={completion}
          />

          {/* Module 9: Quick Actions */}
          <FresherQuickActions />

          {/* Module 1: Recommended Jobs */}
          <FresherRecommendedJobs
            jobs={recommendedJobs}
            targetRole={careerTarget.targetRole}
          />

          {/* 2-Column Grid: Skills & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Module 2: Skill Development */}
            <FresherSkillDevelopment
              userSkills={skillDev.userSkills}
              recommendedSkills={skillDev.recommendedSkills}
              targetRole={careerTarget.targetRole}
            />

            {/* Module 7: Career Recommendations */}
            <FresherCareerRecommendations
              recommendations={careerRecommendations}
            />
          </div>

          {/* Module 3: Recommended Courses */}
          <FresherRecommendedCourses
            courses={recommendedCourses}
            targetRole={careerTarget.targetRole}
          />

          {/* 2-Column Grid: Resume & Experience */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Module 4: Resume */}
            <FresherResumeCard resumeData={resumeData} />

            {/* Module 5: Projects & Experience */}
            <FresherExperienceSection
              experienceSummary={experienceSummary}
              profile={profile}
            />
          </div>

          {/* 2-Column Grid: Applications & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Module 6: Application Tracker (2 cols) */}
            <div className="lg:col-span-2">
              <FresherApplicationTracker applications={applications} />
            </div>

            {/* Module 8: Recent Activity (1 col) */}
            <div className="lg:col-span-1">
              <FresherRecentActivity activities={recentActivity} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FresherDashboard;
