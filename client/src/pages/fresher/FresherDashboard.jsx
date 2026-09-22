import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useLogout from "../../hooks/useLogout";
import { getFresherDashboardData } from "../../services/fresherDashboardService";
import TailoredResumeApplicationModal from "../../components/resume-builder/TailoredResumeApplicationModal";

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

// Embedded pages (same pattern as StudentDashboard)
import Internships from "../student/Internships";
import InternshipDetail from "../student/InternshipDetail";
import MyApplications from "../student/MyApplications";
import Jobs from "../student/Jobs";
import StudentCoursesPage from "../courses/StudentCoursesPage";
import StudentMyCoursesPage from "../courses/StudentMyCoursesPage";
import CourseDetailsPage from "../courses/CourseDetailsPage";
import CandidateInterviewsView from "../../components/student-dashboard/CandidateInterviewsView";

const FresherDashboard = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpportunityForTailoring, setSelectedOpportunityForTailoring] = useState(null);
  const [isTailoredModalOpen, setIsTailoredModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  // Internship sub-views inside dashboard
  const [internshipView, setInternshipView] = useState("list");
  const [selectedInternshipId, setSelectedInternshipId] = useState(null);

  // Courses sub-views inside dashboard
  const [coursesView, setCoursesView] = useState("catalog");
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

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

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (term) => {
    if (term.trim()) {
      navigate(`/jobs?search=${encodeURIComponent(term.trim())}`);
    }
  };

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === "internships") {
      setInternshipView("list");
      setSelectedInternshipId(null);
    }
    if (tab === "courses") {
      setCoursesView("catalog");
      setSelectedCourseId(null);
    }
    setMobileSidebarOpen(false);
  };

  const handleApply = (item) => {
    setSelectedOpportunityForTailoring({
      _id: item._id || item.id,
      id: item._id || item.id,
      title: item.title,
      company: item.company || item.companyName,
      companyName: item.company || item.companyName,
      type: item.type || "Job",
      opportunityType:
        item.type?.toLowerCase().includes("intern") ? "Internship" : "Job",
      description: item.description || item.aboutRole || "",
      requirements: item.requirements || [],
      skillsRequired: item.skillsRequired || item.skills || [],
    });
    setIsTailoredModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">
          Loading Fresher Workspace...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Fetching your customized job matches and skill benchmarks
        </p>
      </div>
    );
  }

  // ─── Derived data ──────────────────────────────────────────────────────
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
    userSkills: profile?.skills || [],
    recommendedSkills: [],
  };
  const recommendedCourses = dashboardData?.recommendedCourses || [];
  const resumeData = profile?.resume || {};
  const experienceSummary = dashboardData?.experienceSummary || {};
  const applications = dashboardData?.applications || { stats: {}, recent: [] };
  const appliedJobIds = new Set(
    applications.recent
      .filter((application) => application.opportunityType !== "Internship")
      .map((application) => application.jobId?._id || application.jobId)
      .filter(Boolean)
      .map(String)
  );
  const appliedInternshipIds = new Set(
    applications.recent
      .filter((application) => application.opportunityType === "Internship")
      .map((application) => application.internshipId?._id || application.internshipId || application.jobId?._id || application.jobId)
      .filter(Boolean)
      .map(String)
  );
  const careerRecommendations = dashboardData?.careerRecommendations || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const projects = profile?.projects || [];
  const certifications = profile?.certifications || [];

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      {/* Sidebar */}
      <FresherSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Top Navbar */}
        <FresherNavbar
          user={currentUser}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onLogout={handleLogout}
          onSearch={handleSearch}
        />

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">

          {/* ==================== DASHBOARD HOME ==================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Banner */}
              <FresherHeader
                user={currentUser}
                careerTarget={careerTarget}
                profileCompletion={completion}
              />

              {/* Quick Actions */}
              <FresherQuickActions onSelectTab={handleSelectTab} />

              {/* Recommended Jobs */}
              <FresherRecommendedJobs
                jobs={recommendedJobs}
                appliedJobIds={appliedJobIds}
                targetRole={careerTarget.targetRole}
                onApplyJob={handleApply}
              />

              {/* 2-Column: Skills & Career Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FresherSkillDevelopment
                  userSkills={skillDev.userSkills}
                  recommendedSkills={skillDev.recommendedSkills}
                  targetRole={careerTarget.targetRole}
                />
                <FresherCareerRecommendations
                  recommendations={careerRecommendations}
                />
              </div>

              {/* Recommended Courses */}
              <FresherRecommendedCourses
                courses={recommendedCourses}
                targetRole={careerTarget.targetRole}
              />

              {/* 2-Column: Resume & Experience */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FresherResumeCard resumeData={resumeData} />
                <FresherExperienceSection
                  experienceSummary={experienceSummary}
                  profile={profile}
                />
              </div>

              {/* 3-Column: Application Tracker & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FresherApplicationTracker applications={applications} />
                </div>
                <div className="lg:col-span-1">
                  <FresherRecentActivity activities={recentActivity} />
                </div>
              </div>
            </div>
          )}

          {/* ==================== FIND JOBS ==================== */}
          {activeTab === "jobs" && (
            <div className="animate-fade-in">
              <Jobs
                embedded
                studentProfile={profile}
                onApply={handleApply}
              />
            </div>
          )}

          {/* ==================== INTERNSHIPS ==================== */}
          {activeTab === "internships" && (
            <div className="animate-fade-in">
              {internshipView === "list" && (
                <Internships
                  embedded
                  appliedInternshipIds={appliedInternshipIds}
                  studentProfile={profile}
                  onSelectInternship={(id) => {
                    setSelectedInternshipId(id);
                    setInternshipView("detail");
                  }}
                />
              )}
              {internshipView === "detail" && (
                <InternshipDetail
                  embedded
                  id={selectedInternshipId}
                  isApplied={appliedInternshipIds.has(String(selectedInternshipId))}
                  onAppliedSuccess={fetchDashboard}
                  onBack={() => {
                    setInternshipView("list");
                    setSelectedInternshipId(null);
                  }}
                />
              )}
            </div>
          )}

          {/* ==================== APPLICATIONS ==================== */}
          {activeTab === "applications" && (
            <div className="animate-fade-in">
              <MyApplications embedded />
            </div>
          )}

          {/* ==================== INTERVIEWS ==================== */}
          {activeTab === "interviews" && (
            <div className="animate-fade-in">
              <CandidateInterviewsView />
            </div>
          )}

          {/* ==================== COURSES ==================== */}
          {activeTab === "courses" && (
            <div className="animate-fade-in">
              {coursesView === "catalog" && (
                <StudentCoursesPage
                  embedded
                  onViewDetails={(id) => {
                    setSelectedCourseId(id);
                    setCoursesView("detail");
                  }}
                  onNavigateToMyCourses={() => setCoursesView("my-courses")}
                />
              )}
              {coursesView === "my-courses" && (
                <StudentMyCoursesPage
                  embedded
                  onBackToCatalog={() => setCoursesView("catalog")}
                />
              )}
              {coursesView === "detail" && (
                <CourseDetailsPage
                  embedded
                  id={selectedCourseId}
                  onBack={() => {
                    setCoursesView("catalog");
                    setSelectedCourseId(null);
                  }}
                />
              )}
            </div>
          )}

          {/* ==================== SKILLS ==================== */}
          {activeTab === "skills" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Skill Development</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your skill profile and gap analysis for {careerTarget.targetRole}
                </p>
              </div>
              <FresherSkillDevelopment
                userSkills={skillDev.userSkills}
                recommendedSkills={skillDev.recommendedSkills}
                targetRole={careerTarget.targetRole}
              />
            </div>
          )}

          {/* ==================== RESUME ==================== */}
          {activeTab === "resume" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your Resume</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage and optimize your ATS-ready resume
                </p>
              </div>
              <FresherResumeCard resumeData={resumeData} />
            </div>
          )}

          {/* ==================== PROJECTS ==================== */}
          {activeTab === "projects" && (
            <div className="space-y-6 animate-fade-in">
              <FresherExperienceSection
                experienceSummary={experienceSummary}
                profile={profile}
              />

              {/* Projects Grid */}
              {projects.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        All Projects ({projects.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your portfolio of completed and ongoing projects
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition bg-white"
                      >
                        <h3 className="text-sm font-bold text-slate-900">{proj.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {proj.technologies.slice(0, 4).map((t, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#1e3a8a] hover:underline"
                          >
                            View Project →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== CAREER ADVICE ==================== */}
          {activeTab === "recommendations" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Career Recommendations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI-powered career advice tailored for {careerTarget.targetRole}
                </p>
              </div>
              <FresherCareerRecommendations
                recommendations={careerRecommendations}
              />
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-3">
                <div className="text-3xl">🎯</div>
                <h3 className="text-base font-bold text-slate-900">
                  Get Personalized Career Insights
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  View detailed career path analysis, job match explanations, and skill roadmaps.
                </p>
                <a
                  href="/fresher/career-recommendations"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition shadow-sm"
                >
                  View Full Career Report →
                </a>
              </div>
            </div>
          )}

          {/* ==================== CERTIFICATIONS ==================== */}
          {activeTab === "certifications" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Certifications</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your verified certifications and credentials
                    </p>
                  </div>
                  <a
                    href="/fresher/profile?step=5"
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#1e3a8a] text-xs font-bold hover:bg-blue-100 border border-blue-200 transition"
                  >
                    + Add Certification
                  </a>
                </div>
                {certifications.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-3xl flex items-center justify-center mx-auto">
                      🎓
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      No certifications added yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Certifications from Coursera, Google, or AWS can increase your profile views by 3×.
                    </p>
                    <a
                      href="/courses"
                      className="inline-block mt-2 px-5 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition shadow-sm"
                    >
                      Browse Certification Courses
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certifications.map((cert, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold text-lg shrink-0">
                          🏅
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{cert.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cert.issuer}</p>
                          {cert.issueDate && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{cert.issueDate}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Tailored Resume Application Modal */}
      <TailoredResumeApplicationModal
        isOpen={isTailoredModalOpen}
        onClose={() => {
          setIsTailoredModalOpen(false);
          setSelectedOpportunityForTailoring(null);
        }}
        opportunity={selectedOpportunityForTailoring}
        opportunityType={
          selectedOpportunityForTailoring?.type?.toLowerCase().includes("intern")
            ? "Internship"
            : "Job"
        }
        onApplicationSubmitted={() => {
          fetchDashboard();
          showToast("Application submitted successfully!");
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 ${
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

export default FresherDashboard;
