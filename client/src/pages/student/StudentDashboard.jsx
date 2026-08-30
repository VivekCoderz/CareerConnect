import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/authSlice";
import { logoutUser } from "../../services/authService";
import {
  getStudentDashboardData,
  saveOpportunity,
  applyOpportunity,
} from "../../services/studentDashboardService";

// Subcomponents
import Sidebar from "../../components/student-dashboard/Sidebar";
import DashboardHeader from "../../components/student-dashboard/DashboardHeader";
import ProfileCompletionCard from "../../components/student-dashboard/ProfileCompletionCard";
import CareerReadinessCard from "../../components/student-dashboard/CareerReadinessCard";
import ProfileSummaryCard from "../../components/student-dashboard/ProfileSummaryCard";
import EducationSummaryCard from "../../components/student-dashboard/EducationSummaryCard";
import SkillsSectionCard from "../../components/student-dashboard/SkillsSectionCard";
import SkillGapCard from "../../components/student-dashboard/SkillGapCard";
import ResumeStatusCard from "../../components/student-dashboard/ResumeStatusCard";
import ProjectsPortfolioCard from "../../components/student-dashboard/ProjectsPortfolioCard";
import CertificationsCard from "../../components/student-dashboard/CertificationsCard";
import InternshipRecommendationsCard from "../../components/student-dashboard/InternshipRecommendationsCard";
import JobRecommendationsCard from "../../components/student-dashboard/JobRecommendationsCard";
import CourseRecommendationsCard from "../../components/student-dashboard/CourseRecommendationsCard";
import ApplicationTrackerCard from "../../components/student-dashboard/ApplicationTrackerCard";
import SavedOpportunitiesCard from "../../components/student-dashboard/SavedOpportunitiesCard";
import UpcomingDeadlinesCard from "../../components/student-dashboard/UpcomingDeadlinesCard";
import CareerGoalCard from "../../components/student-dashboard/CareerGoalCard";
import Internships from "./Internships";
import InternshipDetail from "./InternshipDetail";
import MyApplications from "./MyApplications";
import QuickActionsCard from "../../components/student-dashboard/QuickActionsCard";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Internship sub-views
  const [internshipView, setInternshipView] = useState("list"); // "list", "detail"
  const [selectedInternshipId, setSelectedInternshipId] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [savedIds, setSavedIds] = useState([]);
  const [savedList, setSavedList] = useState([]);
  const [applicationsData, setApplicationsData] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentDashboardData();
      if (res?.success && res?.data) {
        setDashboardData(res.data);
        setSavedList(res.data.savedOpportunities || []);
        setSavedIds((res.data.savedOpportunities || []).map((s) => s.id));
        setApplicationsData(res.data.applications);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to load live dashboard. Please retry.");
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

  // Handle Save / Bookmark toggle
  const handleSaveToggle = async (item) => {
    const isAlreadySaved = savedIds.includes(item.id);
    if (isAlreadySaved) {
      setSavedIds((prev) => prev.filter((id) => id !== item.id));
      setSavedList((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSavedIds((prev) => [...prev, item.id]);
      const newSavedItem = {
        id: item.id,
        title: item.title,
        company: item.company || "Company",
        type: item.type || "Opportunity",
        deadline: item.deadline || "Open",
      };
      setSavedList((prev) => [newSavedItem, ...prev]);

      try {
        await saveOpportunity({
          opportunityId: item.id,
          title: item.title,
          type: item.type,
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Quick Apply
  const handleApply = async (item) => {
    try {
      const res = await applyOpportunity({
        opportunityId: item._id || item.id,
        jobId: item._id || item.id,
        title: item.title,
        company: item.company,
        type: item.type,
      });

      if (res?.success && res?.application) {
        setApplicationsData((prev) => {
          if (!prev) return { stats: { applied: 1 }, recent: [res.application] };
          return {
            stats: {
              ...prev.stats,
              applied: (prev.stats?.applied || 0) + 1,
            },
            recent: [res.application, ...(prev.recent || [])],
          };
        });
        showToast(res.message || `Application submitted for "${item.title}"!`, "success");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Application could not be submitted. Please try again.";
      showToast(errMsg, "error");
    }
  };

  // Filter items by Search Query
  const filteredInternships = useMemo(() => {
    if (!dashboardData?.recommendedInternships) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedInternships;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedInternships.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.company.toLowerCase().includes(q) ||
        i.skillsRequired?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  const filteredJobs = useMemo(() => {
    if (!dashboardData?.recommendedJobs) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedJobs;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.skillsRequired?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  const filteredCourses = useMemo(() => {
    if (!dashboardData?.recommendedCourses) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedCourses;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q) ||
        c.skillsCovered?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Loading your student workspace...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const {
    profile,
    profileCompletion,
    careerReadiness,
    skillGap,
    education,
    technicalSkills,
    softSkills,
    projects,
    certifications,
    resume,
    careerGoal,
    jobPreferences,
    upcomingDeadlines,
    notifications,
  } = dashboardData || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === "internships") {
            setInternshipView("list");
          }
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <DashboardHeader
          user={user}
          profile={profile}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notifications={notifications}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl w-full mx-auto">
          {/* Top Row: Quick Actions */}
          <QuickActionsCard onNavigateTab={setActiveTab} />

          {/* Render based on active tab view */}
          {activeTab === "dashboard" && (
            <>
              {/* Row 1: Profile Completion + Career Readiness */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProfileCompletionCard
                  profile={profile}
                  user={user}
                  completion={profileCompletion}
                />
                <CareerReadinessCard readiness={careerReadiness} />
              </div>

              {/* Row 2: Profile Summary + Academic Background */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProfileSummaryCard user={user} profile={profile} />
                <EducationSummaryCard education={education} />
              </div>

              {/* Row 3: Skills + Skill Gap Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkillsSectionCard
                  technicalSkills={technicalSkills}
                  softSkills={softSkills}
                />
                <SkillGapCard skillGap={skillGap} />
              </div>

              {/* Row 4: Resume Status + Career Aspirations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResumeStatusCard resume={resume} profile={profile} />
                <CareerGoalCard careerGoal={careerGoal} preferences={jobPreferences} />
              </div>

              {/* Row 5: Projects & Portfolio */}
              <ProjectsPortfolioCard projects={projects} />

              {/* Row 6: Certifications */}
              <CertificationsCard certifications={certifications} />

              {/* Row 7: Internships */}
              <InternshipRecommendationsCard
                internships={filteredInternships}
                onSave={handleSaveToggle}
                onApply={handleApply}
                savedIds={savedIds}
              />

              {/* Row 8: Jobs */}
              <JobRecommendationsCard
                jobs={filteredJobs}
                onSave={handleSaveToggle}
                onApply={handleApply}
                savedIds={savedIds}
              />

              {/* Row 9: Courses */}
              <CourseRecommendationsCard courses={filteredCourses} />

              {/* Row 10: Applications Tracker */}
              <ApplicationTrackerCard applications={applicationsData} />

              {/* Row 11: Saved Opportunities + Upcoming Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SavedOpportunitiesCard
                  savedItems={savedList}
                  onRemove={(id) => {
                    setSavedIds((prev) => prev.filter((item) => item !== id));
                    setSavedList((prev) => prev.filter((item) => item.id !== id));
                  }}
                  onApply={handleApply}
                />
                <UpcomingDeadlinesCard deadlines={upcomingDeadlines} />
              </div>
            </>
          )}

          {/* Dedicated Tab Views */}
          {activeTab === "resume" && (
            <div className="space-y-6">
              <ResumeStatusCard resume={resume} profile={profile} />
              <CareerReadinessCard readiness={careerReadiness} />
            </div>
          )}

          {activeTab === "projects" && (
            <ProjectsPortfolioCard projects={projects} />
          )}

          {activeTab === "skills" && (
            <div className="space-y-6">
              <SkillsSectionCard technicalSkills={technicalSkills} softSkills={softSkills} />
              <SkillGapCard skillGap={skillGap} />
            </div>
          )}

          {activeTab === "certifications" && (
            <CertificationsCard certifications={certifications} />
          )}

          {activeTab === "education" && (
            <EducationSummaryCard education={education} />
          )}

          {activeTab === "internships" && (
            <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              {internshipView === "list" && (
                <Internships
                  studentProfile={profile}
                  onSelectInternship={(id) => {
                    setSelectedInternshipId(id);
                    setInternshipView("detail");
                  }}
                />
              )}
              {internshipView === "detail" && (
                <InternshipDetail
                  id={selectedInternshipId}
                  onBack={() => setInternshipView("list")}
                />
              )}
            </div>
          )}

          {activeTab === "jobs" && (
            <JobRecommendationsCard
              jobs={filteredJobs}
              onSave={handleSaveToggle}
              onApply={handleApply}
              savedIds={savedIds}
            />
          )}

          {activeTab === "courses" && (
            <CourseRecommendationsCard courses={filteredCourses} />
          )}

          {activeTab === "applications" && (
            <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <MyApplications />
            </div>
          )}

          {activeTab === "saved" && (
            <SavedOpportunitiesCard
              savedItems={savedList}
              onRemove={(id) => {
                setSavedIds((prev) => prev.filter((item) => item !== id));
                setSavedList((prev) => prev.filter((item) => item.id !== id));
              }}
              onApply={handleApply}
            />
          )}

          {activeTab === "notifications" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900">All Notifications</h2>
              <div className="divide-y divide-slate-100">
                {notifications && notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className="py-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                        <span className="text-xs text-slate-400">{n.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No notifications.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
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
    </div>
  );
};

export default StudentDashboard;
