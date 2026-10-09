import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import SupportTickets from "../../components/support/SupportTickets";
import useTabInUrl from "../../hooks/useTabInUrl";
import { useSelector } from "react-redux";
import useLogout from "../../hooks/useLogout";
import useLiveNotifications from "../../hooks/useLiveNotifications";
import { getProfessionalDashboardData } from "../../services/professionalDashboardService";
import { getMyApplications } from "../../services/applicationService";
import { openResume } from "../../utils/resumeAccess";
import { FEATURES } from "../../config/features";

// Subcomponents
import ProfessionalSidebar from "../../components/professional-dashboard/ProfessionalSidebar";
import ProfessionalHeader from "../../components/professional-dashboard/ProfessionalHeader";
import WelcomeSection from "../../components/professional-dashboard/WelcomeSection";
import CareerSnapshotCard from "../../components/professional-dashboard/CareerSnapshotCard";
import CareerDirectionCard from "../../components/professional-dashboard/CareerDirectionCard";
import SkillFocusCard from "../../components/professional-dashboard/SkillFocusCard";
import ExecutiveResumeCard from "../../components/professional-dashboard/ExecutiveResumeCard";
import ConfidentialCareerModeCard from "../../components/professional-dashboard/ConfidentialCareerModeCard";
import ApplicationPipelineCard from "../../components/professional-dashboard/ApplicationPipelineCard";
import ProfessionalApplicationsView from "../../components/professional-dashboard/ProfessionalApplicationsView";

// Modals & Interactive Overlays
import CareerPathModal from "../../components/professional-dashboard/CareerPathModal";
import OpportunityDetailModal from "../../components/professional-dashboard/OpportunityDetailModal";
import PrivacyModal from "../../components/professional-dashboard/PrivacyModal";
import ApplyReviewModal from "../../components/professional-dashboard/ApplyReviewModal";
import ApplicationSuccessModal from "../../components/professional-dashboard/ApplicationSuccessModal";
import ExternalApplicationFollowupModal from "../../components/professional-dashboard/ExternalApplicationFollowupModal";
import TailoredResumeApplicationModal from "../../components/resume-builder/TailoredResumeApplicationModal";

// Embedded full pages
import Jobs from "../student/Jobs";
import Internships from "../student/Internships";
import InternshipDetail from "../student/InternshipDetail";
import StudentCoursesPage from "../courses/StudentCoursesPage";
import StudentMyCoursesPage from "../courses/StudentMyCoursesPage";
import CourseDetailsPage from "../courses/CourseDetailsPage";
import CandidateInterviewsView from "../../components/student-dashboard/CandidateInterviewsView";
import NotificationInbox from "../../components/notifications/NotificationInbox";

// The professional's real applications from GET /applications/me, shaped for the pipeline cards.
const toPipelineItem = (app) => {
  const listing = app.jobId || app.internshipId || {};
  const status = app.status || "Applied";
  const lower = status.toLowerCase();
  const statusType = lower.includes("interview")
    ? "interview"
    : lower.includes("shortlist")
      ? "shortlisted"
      : lower.includes("review") || lower === "applied" || lower.includes("pending")
        ? "review"
        : lower;
  return {
    id: app._id,
    title: listing.title || app.opportunityTitle || "Application",
    company: listing.companyName || app.employerId?.companyName || "",
    appliedDate: app.createdAt
      ? new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "",
    status,
    statusType,
    source: "direct",
    location: listing.location || "",
  };
};

// Skills the professional entered, strongest first (no invented skills or percentages).
const PROFICIENCY_ORDER = { Expert: 0, Advanced: 1, Intermediate: 2, Beginner: 3 };
const profileSkills = (profile) => {
  const groups = profile?.skills || {};
  const seen = new Set();
  return Object.values(groups)
    .flat()
    .filter((s) => s?.name && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()))
    .map((s) => ({ name: s.name, level: s.proficiency || "", years: s.yearsOfExperience }))
    .sort((a, b) => (PROFICIENCY_ORDER[a.level] ?? 4) - (PROFICIENCY_ORDER[b.level] ?? 4));
};
const ProfessionalDashboard = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);

  // Start on the tab named in ?tab= (email links open e.g. ?tab=applications).
  const [searchParams] = useSearchParams();
  // "opportunities" (made-up curated roles) and "insights" (seeded sample data) are not shown;
  // links to them open real job listings instead.
  const resolveTab = (tab) => (tab === "opportunities" || tab === "insights" ? "jobs" : tab);
  const [activeTab, setActiveTabRaw] = useState(() => resolveTab(searchParams.get("tab") || "dashboard"));
  const setActiveTab = (tab) => setActiveTabRaw(resolveTab(tab));
  useTabInUrl(activeTab, "dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Application Pipeline State
  const [applicationsList, setApplicationsList] = useState([]);

  // Modals state
  const [showCareerPathModal, setShowCareerPathModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Application Workflow Modals
  const [showApplyReviewModal, setShowApplyReviewModal] = useState(false);
  const [reviewingOpportunity, setReviewingOpportunity] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSubmittedApplication, setLastSubmittedApplication] = useState(null);
  const [showExternalFollowupModal, setShowExternalFollowupModal] = useState(false);
  const [pendingExternalOpportunity, setPendingExternalOpportunity] = useState(null);

  // Tailored Resume Modal State
  const [isTailoredModalOpen, setIsTailoredModalOpen] = useState(false);
  const [tailoringOpportunity, setTailoringOpportunity] = useState(null);

  const [toast, setToast] = useState(null);

  // Sub-view state for embedded tabs
  const [internshipView, setInternshipView] = useState("list");
  const [selectedInternshipId, setSelectedInternshipId] = useState(null);
  const [coursesView, setCoursesView] = useState("catalog");
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadApplications = async () => {
    try {
      const res = await getMyApplications();
      setApplicationsList((res?.applications || []).map(toPipelineItem));
    } catch (err) {
      console.error("Applications fetch error:", err);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res] = await Promise.all([getProfessionalDashboardData(), loadApplications()]);
      if (res?.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const inbox = useLiveNotifications(handleSelectTab);

  const handleLogout = () => {
    logout();
  };

  // Trigger Application Review Flow
  const handleInitiateApply = (opp) => {
    if (!opp) return;
    const preparedOpp = {
      ...opp,
      _id: opp.id || opp._id,
      company: opp.company || opp.companyName || "",
      companyName: opp.company || opp.companyName || "",
      type: "Job",
      description: opp.description || opp.aboutRole || "",
      requiredSkills: opp.tags || opp.skills || [],
    };
    if (opp.isExternal || opp.applyType === "external" || opp.url?.startsWith("http")) {
      setReviewingOpportunity(preparedOpp);
      setShowApplyReviewModal(true);
    } else {
      setTailoringOpportunity(preparedOpp);
      setIsTailoredModalOpen(true);
    }
  };

  // Direct Apply via E2Job: goes through the real application flow (it used to
  // only add a local "submitted" card without sending anything).
  const handleDirectSubmit = (opp) => {
    setShowApplyReviewModal(false);
    setTailoringOpportunity(opp);
    setIsTailoredModalOpen(true);
  };

  // External Application Flow
  const handleContinueExternal = (opp) => {
    setShowApplyReviewModal(false);
    setPendingExternalOpportunity(opp);

    // Open company career URL
    const externalUrl = opp.url || opp.careerPageUrl || opp.applyUrl || opp.applyLink || "";
    if (/^https?:\/\//i.test(externalUrl)) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }

    // Prompt follow-up verification modal
    setTimeout(() => {
      setShowExternalFollowupModal(true);
    }, 400);
  };

  // Confirm External Application was submitted
  const handleConfirmExternalApplied = (opp) => {
    const compName = opp.company || opp.companyName || "";
    const newApp = {
      id: `app-${Date.now()}`,
      title: opp.title,
      company: compName,
      appliedDate: "Today",
      status: "Application Started 🌐",
      statusType: "external",
      source: "external",
      location: opp.location || "External Portal",
    };

    setApplicationsList((prev) => [newApp, ...prev]);
    showToast(`✓ External application added to your pipeline!`, "success");
  };

  // Dynamic fields
  const profile = dashboardData?.profile || {};
  const professionalName =
    dashboardData?.user?.fullName ||
    user?.fullName ||
    profile?.userId?.fullName ||
    "there";

  const resumeUrl = profile?.resume?.resumeUrl || user?.resumeUrl || "";
  const resumeUpdated = profile?.resume?.uploadedAt
    ? new Date(profile.resume.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : resumeUrl ? "Uploaded" : "Not uploaded yet";
  const handleDownloadResume = () => {
    if (resumeUrl) openResume(resumeUrl);
    else {
      showToast("Upload your resume in your profile first.", "error");
      navigate("/professional/profile");
    }
  };

  // Only what the professional entered; empty fields read "Not set yet".
  const currentRole =
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Not set yet";

  const experienceYears =
    profile?.totalExperienceYears
      ? `${profile.totalExperienceYears}+ Years`
      : profile?.experience?.length
        ? "Under 1 Year"
        : "Not set yet";

  const chosenTargetRole = profile?.careerGoal?.targetRole || "";
  const targetRole = chosenTargetRole || "Not set yet";

  const profileStrength = dashboardData?.profileCompletion ?? 0;
  const careerStrengthScore = dashboardData?.careerStrength?.score ?? 0;

  const allSkills = profileSkills(profile);
  const focusAreas = allSkills.slice(0, 3).map((s) => s.name);

  const skillFocusList = allSkills.slice(0, 3);
  const achievements = Array.isArray(profile?.achievements) ? profile.achievements : [];
  const certifications = Array.isArray(profile?.certifications) ? profile.certifications : [];

  // Dynamic application pipeline statistics
  const applicationStats = {
    applied: applicationsList.length,
    underReview: applicationsList.filter(
      (a) => a.statusType === "review" || a.status?.toLowerCase().includes("review")
    ).length,
    shortlisted: applicationsList.filter(
      (a) => a.statusType === "shortlisted" || a.status?.toLowerCase().includes("shortlist")
    ).length,
    interview: applicationsList.filter(
      (a) => a.statusType === "interview" || a.status?.toLowerCase().includes("interview")
    ).length,
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex font-sans">
      {/* Left Side Navigation Sidebar */}
      <ProfessionalSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        unreadNotifications={inbox.unreadCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Top Header */}
        <ProfessionalHeader
          user={user}
          profile={profile}
          professionalName={professionalName}
          professionalRole={currentRole}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main Center Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Main Dashboard Overview Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* 1. Welcome Section */}
              <WelcomeSection
                name={professionalName}
                currentRole={currentRole}
                profileStrength={profileStrength}
                careerStrength={careerStrengthScore}
              />

              {/* 2. Career Snapshot */}
              <CareerSnapshotCard
                currentRole={currentRole}
                experience={experienceYears}
                targetRole={targetRole}
                onUpdateProfile={() => navigate("/professional/profile")}
              />

              {/* 3. Career Direction */}
              <CareerDirectionCard
                currentRole={currentRole}
                targetRole={targetRole}
                focusAreas={focusAreas}
                onViewCareerPath={() => setShowCareerPathModal(true)}
              />

              {/* 5. Skill Focus */}
              <SkillFocusCard
                skills={skillFocusList}
                onViewSkills={() => setActiveTab("skills")}
              />

              {/* 6. Executive Resume */}
              <ExecutiveResumeCard
                lastUpdated={resumeUpdated}
                onViewResume={() => navigate("/professional/profile")}
                onDownload={handleDownloadResume}
              />

              {/* 7. Confidential Career Mode */}
              <ConfidentialCareerModeCard
                isActive={true}
                onManagePrivacy={() => setShowPrivacyModal(true)}
              />

              {/* 8. Application Pipeline */}
              <ApplicationPipelineCard
                stats={applicationStats}
                recent={applicationsList.slice(0, 2)}
                onViewAllApplications={() => setActiveTab("applications")}
              />
            </div>
          )}

          {/* ==================== JOBS (Full Browse) ==================== */}
          {activeTab === "jobs" && (
            <div className="animate-fade-in">
              <Jobs
                embedded
                onApply={(job) => {
                  setTailoringOpportunity({
                    _id: job._id || job.id,
                    id: job._id || job.id,
                    title: job.title,
                    company: job.company || job.companyName,
                    companyName: job.company || job.companyName,
                    type: "Job",
                    opportunityType: "Job",
                    description: job.description || "",
                    skillsRequired: job.skillsRequired || job.skills || [],
                  });
                  setIsTailoredModalOpen(true);
                }}
              />
            </div>
          )}

          {/* ==================== INTERNSHIPS ==================== */}
          {activeTab === "internships" && (
            <div className="animate-fade-in">
              {internshipView === "list" && (
                <Internships
                  embedded
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
                  onBack={() => {
                    setInternshipView("list");
                    setSelectedInternshipId(null);
                  }}
                />
              )}
            </div>
          )}

          {/* ==================== COURSES ==================== */}
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

          {/* ==================== INTERVIEWS ==================== */}
          {activeTab === "interviews" && (
            <div className="animate-fade-in">
              <CandidateInterviewsView />
            </div>
          )}

          {/* ==================== NOTIFICATIONS ==================== */}
          {activeTab === "notifications" && (
            <NotificationInbox
              notifications={inbox.notifications}
              unreadCount={inbox.unreadCount}
              onNotificationClick={inbox.open}
              onMarkAllRead={inbox.markAllRead}
              onDeleteNotification={inbox.remove}
            />
          )}

          {/* Career Growth Dedicated Tab */}
          {activeTab === "growth" && (
            <div className="space-y-6">
              <CareerDirectionCard
                currentRole={currentRole}
                targetRole={targetRole}
                focusAreas={focusAreas}
                onViewCareerPath={() => setShowCareerPathModal(true)}
              />
              <CareerSnapshotCard
                currentRole={currentRole}
                experience={experienceYears}
                targetRole={targetRole}
                onUpdateProfile={() => navigate("/professional/profile")}
              />
            </div>
          )}

          {/* Applications Dedicated Tab */}
          {activeTab === "applications" && (
            <ProfessionalApplicationsView
              applications={applicationsList}
              stats={applicationStats}
              onExploreOpportunities={() => setActiveTab("opportunities")}
            />
          )}

          {/* Skills Dedicated Tab */}
          {activeTab === "skills" && (
            <div className="space-y-6">
              <SkillFocusCard
                skills={skillFocusList}
                onViewSkills={() => navigate("/professional/profile")}
              />

              {/* Core Technical Skills */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Technical Expertise</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Core skills from your professional experience
                    </p>
                  </div>
                  <Link
                    to="/professional/profile"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 border border-purple-200 transition"
                  >
                    Edit Skills
                  </Link>
                </div>

                {allSkills.length === 0 ? (
                  <p className="text-xs text-slate-500">You haven't added any skills yet. Add them in your profile.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map((skill) => (
                      <span key={skill.name} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                        {skill.name}
                        {skill.level && <span className="text-slate-400 font-medium"> · {skill.level}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resume Dedicated Tab */}
          {activeTab === "resume" && (
            <div className="space-y-6">
              <ExecutiveResumeCard
                lastUpdated={resumeUpdated}
                onViewResume={() => navigate("/professional/profile")}
                onDownload={handleDownloadResume}
              />

              {/* Resume Tips */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Executive Resume Tips</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Optimize your resume for senior-level opportunities
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: "📊", title: "Quantify Impact", desc: "Add metrics: '35% latency reduction', '₹15L cost savings', '10M+ daily transactions handled'." },
                    { icon: "🎯", title: "Tailor for Each Role", desc: "Use our AI tailoring tool to customize your resume keywords for each specific job description." },
                    { icon: "🏆", title: "Lead with Achievements", desc: "Put your biggest wins in the first two bullet points of each role. Recruiters skim." },
                    { icon: "🔑", title: "Include Leadership Signals", desc: "Mention team sizes managed, hiring done, and architecture decisions made." },
                  ].map((tip) => (
                    <div key={tip.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex gap-3">
                      <span className="text-xl shrink-0">{tip.icon}</span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{tip.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Achievements Dedicated Tab */}
          {activeTab === "achievements" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Key Executive Achievements</h2>
                <Link
                  to="/professional/profile"
                  className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 border border-purple-200 transition"
                >
                  Manage in Profile
                </Link>
              </div>
              {achievements.length === 0 ? (
                <p className="text-xs text-slate-500">You haven't added any achievements yet. Add them in your profile.</p>
              ) : (
                <div className="space-y-3">
                  {achievements.map((a, idx) => (
                    <div key={a._id || `${a.title}-${idx}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                      {(a.organization || a.date) && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {[a.organization, a.date ? new Date(a.date).getFullYear() : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {(a.description || a.impact) && (
                        <p className="text-xs text-slate-600 mt-1">{a.description || a.impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Certifications Dedicated Tab */}
          {activeTab === "certifications" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Professional Certifications</h2>
                <Link
                  to="/professional/profile"
                  className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 border border-purple-200 transition"
                >
                  Add Certification
                </Link>
              </div>
              {certifications.length === 0 ? (
                <p className="text-xs text-slate-500">You haven't added any certifications yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {certifications.map((c, idx) => (
                    <div key={c._id || `${c.name}-${idx}`} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                        🏅
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900">{c.name}</h3>
                        {c.issuingOrganization && <p className="text-[11px] text-slate-500">{c.issuingOrganization}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= HELP & SUPPORT ================= */}
          {activeTab === "support" && <SupportTickets />}

          {/* Settings Dedicated Tab */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Professional Preferences & Settings</h2>
              <div className="space-y-4 max-w-xl">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Confidential Recruiter Mode</h3>
                    <p className="text-[11px] text-slate-500">Visible only to verified tech recruiters</p>
                  </div>
                  <button
                    onClick={() => setShowPrivacyModal(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition"
                  >
                    Configure
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Profile Details & Experience</h3>
                    <p className="text-[11px] text-slate-500">Update company, skills, compensation, and target role</p>
                  </div>
                  <Link
                    to="/professional/profile"
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition shadow-xs"
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Career Trajectory Modal */}
      <CareerPathModal
        isOpen={showCareerPathModal}
        onClose={() => setShowCareerPathModal(false)}
        currentRole={currentRole}
        targetRole={targetRole}
        focusAreas={focusAreas}
      />

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        isOpen={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        opportunity={selectedOpportunity}
        onApply={(opp) => {
          setSelectedOpportunity(null);
          handleInitiateApply(opp);
        }}
      />

      {/* Step 1: Apply Review Modal (Direct vs External) */}
      <ApplyReviewModal
        isOpen={showApplyReviewModal}
        onClose={() => setShowApplyReviewModal(false)}
        opportunity={reviewingOpportunity}
        user={user}
        profile={profile}
        onSubmitDirect={handleDirectSubmit}
        onContinueExternal={handleContinueExternal}
      />

      {/* Step 1B: Tailored Resume Application Modal for Direct Opportunities */}
      <TailoredResumeApplicationModal
        isOpen={isTailoredModalOpen}
        onClose={() => {
          setIsTailoredModalOpen(false);
          setTailoringOpportunity(null);
        }}
        opportunity={tailoringOpportunity}
        opportunityType="Job"
        onApplicationSubmitted={() => {
          // Reload from the server so the pipeline shows the real saved application.
          loadApplications();
          setLastSubmittedApplication({
            title: tailoringOpportunity?.title,
            company: tailoringOpportunity?.company || tailoringOpportunity?.companyName || "",
          });
          setIsTailoredModalOpen(false);
          setShowSuccessModal(true);
          showToast("✓ Application submitted with your tailored resume!", "success");
        }}
      />

      {/* Step 2A: Direct Application Success Modal */}
      <ApplicationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        application={lastSubmittedApplication}
        onViewApplications={() => {
          setShowSuccessModal(false);
          setActiveTab("applications");
        }}
      />

      {/* Step 2B: External Application Follow-up Modal ("Did you apply?") */}
      <ExternalApplicationFollowupModal
        isOpen={showExternalFollowupModal}
        onClose={() => setShowExternalFollowupModal(false)}
        opportunity={pendingExternalOpportunity}
        onConfirmApplied={handleConfirmExternalApplied}
      />

      {/* Confidential Privacy Settings Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onSave={() => showToast("Privacy preferences saved successfully!", "success")}
      />

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

export default ProfessionalDashboard;
