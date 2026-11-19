import JourneyLoader from "../../components/common/JourneyLoader";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SupportTickets from "../../components/support/SupportTickets";
import useTabInUrl from "../../hooks/useTabInUrl";
import { useSelector } from "react-redux";
import useLogout from "../../hooks/useLogout";
import useLiveNotifications from "../../hooks/useLiveNotifications";
import {
  getStudentDashboardData,
  saveOpportunity,
} from "../../services/studentDashboardService";
import { openExternalApply } from "../../utils/opportunityApply";
import { getPageCache, setPageCache } from "../../utils/pageCache";
import { FEATURES } from "../../config/features";

// Subcomponents
import CandidateDashboardShell from "../../components/candidate-dashboard/CandidateDashboardShell";
import StudentTopBarSearch from "../../components/candidate-dashboard/student/StudentTopBarSearch";
import ProfileCompletionCard from "../../components/candidate-dashboard/student/ProfileCompletionCard";
import CareerReadinessCard from "../../components/candidate-dashboard/student/CareerReadinessCard";
import ProfileSummaryCard from "../../components/candidate-dashboard/student/ProfileSummaryCard";
import EducationSummaryCard from "../../components/candidate-dashboard/student/EducationSummaryCard";
import SkillsSectionCard from "../../components/candidate-dashboard/student/SkillsSectionCard";
import SkillGapCard from "../../components/candidate-dashboard/student/SkillGapCard";
import ResumeStatusCard from "../../components/candidate-dashboard/student/ResumeStatusCard";
import ProjectsPortfolioCard from "../../components/candidate-dashboard/student/ProjectsPortfolioCard";
import CertificationsCard from "../../components/candidate-dashboard/student/CertificationsCard";
import InternshipRecommendationsCard from "../../components/candidate-dashboard/student/InternshipRecommendationsCard";
import JobRecommendationsCard from "../../components/candidate-dashboard/student/JobRecommendationsCard";
import InternshalaDashboardRecommendations from "../../components/candidate-dashboard/student/InternshalaDashboardRecommendations";
// import StudentCoursesPage from "../courses/StudentCoursesPage";
import ApplicationTrackerCard from "../../components/candidate-dashboard/student/ApplicationTrackerCard";
import SavedOpportunitiesCard from "../../components/candidate-dashboard/student/SavedOpportunitiesCard";
import UpcomingDeadlinesCard from "../../components/candidate-dashboard/student/UpcomingDeadlinesCard";
import CareerGoalCard from "../../components/candidate-dashboard/student/CareerGoalCard";
import QuickActionsCard from "../../components/candidate-dashboard/student/QuickActionsCard";
import NotificationInbox from "../../components/notifications/NotificationInbox";

// Internship module (embedded)
import Internships from "./Internships";
import InternshipDetail from "./InternshipDetail";
import MyApplications from "./MyApplications";
import TailoredResumeApplicationModal from "../../components/resume-builder/TailoredResumeApplicationModal";
import Jobs from "./Jobs";

// Courses module (embedded)
import StudentCoursesPage from "../courses/StudentCoursesPage";
import StudentMyCoursesPage from "../courses/StudentMyCoursesPage";
import CourseDetailsPage from "../courses/CourseDetailsPage";

import CandidateInterviewsView from "../../components/candidate-dashboard/CandidateInterviewsView";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);

  // Open the tab named in ?tab= right away (kept in the URL by useTabInUrl).
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "dashboard");
  useTabInUrl(activeTab, "dashboard");
  const [selectedOpportunityForTailoring, setSelectedOpportunityForTailoring] = useState(null);
  const [isTailoredModalOpen, setIsTailoredModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Internship sub-views inside dashboard
  const [internshipView, setInternshipView] = useState("list"); // list | detail
  const [selectedInternshipId, setSelectedInternshipId] = useState(null);

  // Courses sub-views inside dashboard
  const [coursesView, setCoursesView] = useState("catalog"); // catalog | my-courses | detail
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Coming back to the dashboard shows the last data at once and refreshes it (FL-09).
  const userId = user?._id || user?.id;
  const [cachedDashboard] = useState(() => getPageCache("studentDashboard", userId));
  const [dashboardData, setDashboardData] = useState(cachedDashboard);
  const [loading, setLoading] = useState(!cachedDashboard);
  const [error, setError] = useState(null);

  const [savedIds, setSavedIds] = useState(() => (cachedDashboard?.savedOpportunities || []).map((s) => s.id));
  const [savedList, setSavedList] = useState(() => cachedDashboard?.savedOpportunities || []);
  const [applicationsData, setApplicationsData] = useState(() => cachedDashboard?.applications || null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = async () => {
    // Full-screen loader only when there's nothing to show yet.
    if (!getPageCache("studentDashboard", userId)) setLoading(true);
    setError(null);
    try {
      const res = await getStudentDashboardData();
      if (res?.success && res?.data) {
        setPageCache("studentDashboard", userId, res.data);
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

  const handleLogout = () => {
    logout();
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
  };

  const inbox = useLiveNotifications(handleSelectTab);

  // Internship only when the listing says so (or has a stipend and no type info); otherwise a Job.
  const opportunityKind = (item) => {
    const typeText = [item.opportunityType, item.type].filter(Boolean).join(" ").toLowerCase();
    if (typeText) return typeText.includes("intern") ? "Internship" : "Job";
    return item.stipend ? "Internship" : "Job";
  };

  const handleSaveToggle = async (item) => {
    const itemId = item.id || item._id;
    const isAlreadySaved = savedIds.includes(itemId);

    if (isAlreadySaved) {
      setSavedIds((prev) => prev.filter((id) => id !== itemId));
      setSavedList((prev) => prev.filter((s) => s.id !== itemId));
    } else {
      setSavedIds((prev) => [...prev, itemId]);
      setSavedList((prev) => [
        {
          id: itemId,
          title: item.title,
          company: item.company || item.companyName || null,
          type: item.type || opportunityKind(item),
          deadline: item.deadline || null,
        },
        ...prev,
      ]);

      try {
        await saveOpportunity({
          opportunityId: itemId,
          title: item.title,
          type: item.type || opportunityKind(item),
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleApply = (item) => {
    // External listings are applied to on the employer's site, not through E2Job.
    const external = openExternalApply(item);
    if (external) {
      if (!external.opened) showToast("This listing has no apply link.", "error");
      return;
    }
    setSelectedOpportunityForTailoring({
      _id: item._id || item.id,
      id: item._id || item.id,
      title: item.title,
      company: item.company || item.companyName,
      companyName: item.company || item.companyName,
      type: item.type || opportunityKind(item),
      opportunityType: opportunityKind(item),
      description: item.description || item.aboutRole || "",
      requirements: item.requirements || [],
      skillsRequired: [item.skillsRequired, item.skills, item.requiredSkills].find((l) => Array.isArray(l) && l.length) || [],
    });
    setIsTailoredModalOpen(true);
  };

  const handleApplicationSuccess = (application) => {
    setApplicationsData((prev) => {
      const submittedApplication = application?.application || application;
      const recentApplication = {
        ...submittedApplication,
        opportunityType: selectedOpportunityForTailoring?.opportunityType || submittedApplication?.opportunityType,
        jobId: selectedOpportunityForTailoring?.opportunityType === "Job"
          ? selectedOpportunityForTailoring._id
          : submittedApplication?.jobId,
        internshipId: selectedOpportunityForTailoring?.opportunityType === "Internship"
          ? selectedOpportunityForTailoring._id
          : submittedApplication?.internshipId,
      };
      if (!prev) return { stats: { applied: 1 }, recent: [recentApplication] };
      return {
        stats: {
          ...prev.stats,
          applied: (prev.stats?.applied || 0) + 1,
        },
        recent: [recentApplication, ...(prev.recent || [])],
      };
    });
    showToast(`Applied for "${selectedOpportunityForTailoring?.title || "opportunity"}"!`, "success");
  };

  const filteredInternships = useMemo(() => {
    if (!dashboardData?.recommendedInternships) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedInternships;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedInternships.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.company?.toLowerCase().includes(q) ||
        i.skillsRequired?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  const filteredJobs = useMemo(() => {
    if (!dashboardData?.recommendedJobs) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedJobs;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedJobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.skillsRequired?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  const appliedJobIds = useMemo(() => new Set(
    (applicationsData?.recent || [])
      .filter((application) => application.opportunityType !== "Internship")
      .map((application) => application.jobId?._id || application.jobId)
      .filter(Boolean)
      .map(String)
  ), [applicationsData]);

  const appliedInternshipIds = useMemo(() => new Set(
    (applicationsData?.recent || [])
      .filter((application) => application.opportunityType === "Internship")
      .map((application) => application.internshipId?._id || application.internshipId || application.jobId?._id || application.jobId)
      .filter(Boolean)
      .map(String)
  ), [applicationsData]);

  const filteredCourses = useMemo(() => {
    if (!dashboardData?.recommendedCourses) return [];
    if (!searchQuery.trim()) return dashboardData.recommendedCourses;
    const q = searchQuery.toLowerCase();
    return dashboardData.recommendedCourses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.provider?.toLowerCase().includes(q) ||
        c.skillsCovered?.some((s) => s.toLowerCase().includes(q))
    );
  }, [dashboardData, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <JourneyLoader size="hero" className="mb-4" />
        <p className="text-lg font-semibold text-slate-700">
          Preparing your opportunity dashboard...
        </p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-semibold rounded-xl transition shadow-xs"
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
  } = dashboardData || {};

  return (
    <CandidateDashboardShell
      type="student"
      user={user}
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onLogout={handleLogout}
      unreadNotifications={inbox.unreadCount}
      mainClassName="max-w-7xl space-y-7"
      topBarContent={
        <StudentTopBarSearch
          user={user}
          profile={profile}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={activeTab === "interviews" ? "Search interviews by company, role or round..." : undefined}
        />
      }
      overlays={
        <>
          <TailoredResumeApplicationModal
            isOpen={isTailoredModalOpen}
            onClose={() => {
              setIsTailoredModalOpen(false);
              setSelectedOpportunityForTailoring(null);
            }}
            opportunity={selectedOpportunityForTailoring}
            onAppliedSuccess={handleApplicationSuccess}
          />
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
        </>
      }
    >
      {/* ================= DASHBOARD HOME ================= */}
      {activeTab === "dashboard" && (
        <InternshalaDashboardRecommendations
          jobs={filteredJobs}
          appliedJobIds={appliedJobIds}
          appliedInternshipIds={appliedInternshipIds}
          internships={filteredInternships}
          courses={FEATURES.courses ? filteredCourses : []}
          savedIds={savedIds}
          onSave={handleSaveToggle}
          onApply={handleApply}
          onNavigateTab={handleSelectTab}
        />
      )}

      {/* ================= RESUME ================= */}
      {activeTab === "resume" && (
        <div className="space-y-6">
          <ResumeStatusCard resume={resume} profile={profile} />
          <CareerReadinessCard readiness={careerReadiness} />
        </div>
      )}

      {/* ================= PROJECTS ================= */}
      {activeTab === "projects" && (
        <ProjectsPortfolioCard projects={projects} />
      )}

      {/* ================= SKILLS ================= */}
      {activeTab === "skills" && (
        <div className="space-y-6">
          <SkillsSectionCard
            technicalSkills={technicalSkills}
            softSkills={softSkills}
          />
          <SkillGapCard skillGap={skillGap} />
        </div>
      )}

      {/* ================= CERTIFICATIONS ================= */}
      {activeTab === "certifications" && (
        <CertificationsCard certifications={certifications} />
      )}

      {/* ================= EDUCATION ================= */}
      {activeTab === "education" && (
        <EducationSummaryCard education={education} />
      )}

      {/* ================= INTERNSHIPS (full module) ================= */}
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
              onAppliedSuccess={handleApplicationSuccess}
              onBack={() => {
                setInternshipView("list");
                setSelectedInternshipId(null);
              }}
            />
          )}
        </div>
      )}

      {/* ================= JOBS (full module) ================= */}
      {activeTab === "jobs" && (
        <JobRecommendationsCard
          jobs={filteredJobs}
          appliedJobIds={appliedJobIds}
          onSave={handleSaveToggle}
          onApply={handleApply}
          savedIds={savedIds}
          limit={0}
        />
      )}

      {/* ================= COURSES (full module) ================= */}
      {activeTab === "courses" && FEATURES.courses && (
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

      {/* ================= APPLICATIONS ================= */}
      {activeTab === "applications" && (
        <div className="animate-fade-in">
          <MyApplications embedded />
        </div>
      )}

      {/* ================= INTERVIEWS ================= */}
      {activeTab === "interviews" && (
        <div className="animate-fade-in">
          <CandidateInterviewsView searchQuery={searchQuery} />
        </div>
      )}

      {/* ================= SAVED ================= */}
      {FEATURES.savedJobs && activeTab === "saved" && (
        <SavedOpportunitiesCard
          savedItems={savedList}
          onRemove={(id) => {
            setSavedIds((prev) => prev.filter((item) => item !== id));
            setSavedList((prev) => prev.filter((item) => item.id !== id));
          }}
          onApply={handleApply}
        />
      )}

      {/* ================= HELP & SUPPORT ================= */}
      {activeTab === "support" && <SupportTickets />}

      {/* ================= NOTIFICATIONS ================= */}
      {activeTab === "notifications" && (
        <NotificationInbox
          notifications={inbox.notifications}
          unreadCount={inbox.unreadCount}
          onNotificationClick={inbox.open}
          onMarkAllRead={inbox.markAllRead}
          onDeleteNotification={inbox.remove}
        />
      )}

      {/* ================= PROFILE ================= */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileSummaryCard user={user} profile={profile} />
          <ProfileCompletionCard
            profile={profile}
            user={user}
            completion={profileCompletion}
          />
          <EducationSummaryCard education={education} />
          <CareerGoalCard
            careerGoal={careerGoal}
            preferences={jobPreferences}
          />
        </div>
      )}
    </CandidateDashboardShell>
  );
};

export default StudentDashboard;
