import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useLogout from "../../hooks/useLogout";
import { getProfessionalDashboardData } from "../../services/professionalDashboardService";

// Subcomponents
import ProfessionalSidebar from "../../components/professional-dashboard/ProfessionalSidebar";
import ProfessionalHeader from "../../components/professional-dashboard/ProfessionalHeader";
import WelcomeSection from "../../components/professional-dashboard/WelcomeSection";
import CareerSnapshotCard from "../../components/professional-dashboard/CareerSnapshotCard";
import CareerDirectionCard from "../../components/professional-dashboard/CareerDirectionCard";
import CuratedOpportunitiesCard from "../../components/professional-dashboard/CuratedOpportunitiesCard";
import SkillFocusCard from "../../components/professional-dashboard/SkillFocusCard";
import ExecutiveResumeCard from "../../components/professional-dashboard/ExecutiveResumeCard";
import ConfidentialCareerModeCard from "../../components/professional-dashboard/ConfidentialCareerModeCard";
import ApplicationPipelineCard from "../../components/professional-dashboard/ApplicationPipelineCard";
import CareerCompanyInsights from "../../components/professional-dashboard/CareerCompanyInsights";
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

const INITIAL_APPLICATIONS = [
  {
    id: "app-101",
    title: "Engineering Lead — Developer Productivity & AI",
    company: "Microsoft",
    appliedDate: "Sep 2, 2026",
    status: "Under Review ⏳",
    statusType: "review",
    source: "direct",
    location: "Bangalore",
  },
  {
    id: "app-102",
    title: "Staff Software Engineer — Distributed Systems",
    company: "Stripe",
    appliedDate: "Aug 30, 2026",
    status: "Interview Scheduled 📅",
    statusType: "interview",
    source: "direct",
    location: "Remote",
  },
  {
    id: "app-103",
    title: "Senior Backend Architect",
    company: "Atlassian",
    appliedDate: "Aug 28, 2026",
    status: "Interview Scheduled 📅",
    statusType: "interview",
    source: "direct",
    location: "Remote (India)",
  },
  {
    id: "app-104",
    title: "Engineering Manager (Core Banking Infrastructure)",
    company: "Razorpay",
    appliedDate: "Aug 26, 2026",
    status: "Shortlisted 🎯",
    statusType: "shortlisted",
    source: "direct",
    location: "Bangalore",
  },
];

const ProfessionalDashboard = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Application Pipeline State
  const [applicationsList, setApplicationsList] = useState(INITIAL_APPLICATIONS);

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

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfessionalDashboardData();
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

  const handleLogout = () => {
    logout();
  };

  // Trigger Application Review Flow
  const handleInitiateApply = (opp) => {
    if (!opp) return;
    const preparedOpp = {
      ...opp,
      _id: opp.id || opp._id,
      company: opp.company || opp.companyName || "Technology Enterprise",
      companyName: opp.company || opp.companyName || "Technology Enterprise",
      type: "Job",
      description: opp.description || opp.aboutRole || "Senior engineering leadership role.",
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

  // Direct Apply via CareerConnect
  const handleDirectSubmit = (opp, coverNote) => {
    const compName = opp.company || opp.companyName || "Technology Enterprise";
    const newApp = {
      id: `app-${Date.now()}`,
      title: opp.title,
      company: compName,
      appliedDate: "Today",
      status: "Under Review ⏳",
      statusType: "review",
      source: "direct",
      location: opp.location || "Remote",
    };

    setApplicationsList((prev) => [newApp, ...prev]);
    setShowApplyReviewModal(false);
    setLastSubmittedApplication({
      title: opp.title,
      company: compName,
    });
    setShowSuccessModal(true);
    showToast("✓ Application submitted successfully.", "success");
  };

  // External Application Flow
  const handleContinueExternal = (opp) => {
    setShowApplyReviewModal(false);
    setPendingExternalOpportunity(opp);

    // Open company career URL
    const externalUrl = opp.url || opp.careerPageUrl || "https://careers.google.com";
    if (externalUrl && externalUrl !== "#") {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }

    // Prompt follow-up verification modal
    setTimeout(() => {
      setShowExternalFollowupModal(true);
    }, 400);
  };

  // Confirm External Application was submitted
  const handleConfirmExternalApplied = (opp) => {
    const compName = opp.company || opp.companyName || "Technology Enterprise";
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

  const handleDownloadResume = () => {
    showToast("Downloading Executive Resume PDF...", "success");
  };

  // Dynamic fields
  const profile = dashboardData?.profile || {};
  const professionalName =
    dashboardData?.user?.fullName ||
    user?.fullName ||
    profile?.userId?.fullName ||
    "Imran";

  const currentRole =
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Senior Software Engineer";

  const experienceYears =
    profile?.totalExperienceYears
      ? `${profile.totalExperienceYears}+ Years`
      : "4+ Years";

  const targetRole =
    profile?.careerGoal?.targetRole ||
    "Engineering Lead / Staff Engineer";

  const profileStrength = dashboardData?.profileCompletion ?? 92;
  const careerStrengthScore = dashboardData?.careerStrength?.score ?? 82;

  const focusAreas = ["System Design", "Cloud Architecture", "Leadership"];

  const curatedOpportunities = [
    {
      id: "opp-1",
      title: "Staff Software Engineer — Distributed Systems",
      company: "Stripe",
      location: "Remote",
      experience: "5+ Years",
      salary: "₹35–50 LPA",
      matchPercentage: 92,
      tags: ["System Design", "AWS", "Distributed Systems"],
    },
    {
      id: "opp-2",
      title: "Engineering Lead (Platform & Architecture)",
      company: "Razorpay",
      location: "Bangalore (Hybrid)",
      experience: "5+ Years",
      salary: "₹45–60 LPA",
      matchPercentage: 95,
      tags: ["System Architecture", "Microservices", "Team Leadership"],
    },
    {
      id: "opp-3",
      title: "Senior Backend Architect",
      company: "Atlassian",
      location: "Remote (India)",
      experience: "6+ Years",
      salary: "₹50–70 LPA",
      matchPercentage: 88,
      tags: ["Microservices", "Kubernetes", "AWS"],
    },
  ];

  const skillFocusList = [
    { name: "System Design", level: "Strong" },
    { name: "Cloud Architecture", level: "Advanced" },
    { name: "Engineering Leadership", level: "Developing" },
  ];

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

              {/* 4. Curated Opportunities */}
              <CuratedOpportunitiesCard
                opportunities={curatedOpportunities}
                onExploreRole={(opp) => handleInitiateApply(opp)}
                onViewAllOpportunities={() => setActiveTab("opportunities")}
              />

              {/* 5. Skill Focus */}
              <SkillFocusCard
                skills={skillFocusList}
                onViewSkills={() => setActiveTab("skills")}
              />

              {/* 6. Executive Resume */}
              <ExecutiveResumeCard
                lastUpdated="4 days ago"
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

          {/* Opportunities Dedicated Tab */}
          {activeTab === "opportunities" && (
            <div className="space-y-6">
              <CuratedOpportunitiesCard
                opportunities={[
                  ...curatedOpportunities,
                  {
                    id: "opp-4",
                    title: "Principal Software Engineer - Azure Core",
                    company: "Microsoft",
                    location: "Hyderabad",
                    experience: "6+ Years",
                    salary: "₹55–75 LPA",
                    matchPercentage: 94,
                    tags: ["Distributed Systems", "Cloud", "Leadership"],
                  },
                  {
                    id: "opp-5",
                    title: "Staff Cloud Architect",
                    company: "Amazon",
                    location: "Bangalore",
                    experience: "5+ Years",
                    salary: "₹48–70 LPA",
                    matchPercentage: 91,
                    tags: ["AWS", "Kubernetes", "Architecture"],
                  },
                ]}
                onExploreRole={(opp) => handleInitiateApply(opp)}
                onViewAllOpportunities={() => {}}
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

          {/* ==================== INTERVIEWS ==================== */}
          {activeTab === "interviews" && (
            <div className="animate-fade-in">
              <CandidateInterviewsView />
            </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { name: "System Design", level: 90, color: "bg-purple-500" },
                    { name: "Cloud Architecture (AWS)", level: 85, color: "bg-indigo-500" },
                    { name: "Distributed Systems", level: 82, color: "bg-blue-500" },
                    { name: "Engineering Leadership", level: 75, color: "bg-violet-500" },
                    { name: "Microservices", level: 88, color: "bg-purple-600" },
                    { name: "Kubernetes / Docker", level: 78, color: "bg-indigo-600" },
                  ].map((skill) => (
                    <div key={skill.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700">{skill.name}</span>
                        <span className="text-slate-400 font-semibold">{skill.level}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${skill.color} transition-all duration-700`}
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resume Dedicated Tab */}
          {activeTab === "resume" && (
            <div className="space-y-6">
              <ExecutiveResumeCard
                lastUpdated="4 days ago"
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
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h3 className="text-sm font-bold text-slate-900">Distributed Microservices Latency Optimization</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Redesigned core billing and authentication services, achieving a 35% latency reduction across 10M+ daily transactions.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h3 className="text-sm font-bold text-slate-900">Cloud Infrastructure Cost Optimization</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Architected ECS migration and Kubernetes autoscaling, reducing monthly cloud expenditure by ₹15 Lakhs.
                  </p>
                </div>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                    ☁️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">AWS Certified Solutions Architect - Professional</h3>
                    <p className="text-[11px] text-slate-500">Amazon Web Services · Verified</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
                    ☸️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Certified Kubernetes Administrator (CKA)</h3>
                    <p className="text-[11px] text-slate-500">Cloud Native Computing Foundation · Verified</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Career & Company Insights Dedicated Tab */}
          {activeTab === "insights" && (
            <CareerCompanyInsights
              initialTargetRole={targetRole}
              onApplyOpportunity={(job) => handleInitiateApply(job)}
            />
          )}

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
        onApplicationSubmitted={(res) => {
          const compName = tailoringOpportunity?.company || tailoringOpportunity?.companyName || "Technology Enterprise";
          const newApp = {
            id: `app-${Date.now()}`,
            title: tailoringOpportunity?.title || "Role",
            company: compName,
            appliedDate: "Today",
            status: "Under Review ⏳",
            statusType: "review",
            source: "direct",
            location: tailoringOpportunity?.location || "Remote",
          };
          setApplicationsList((prev) => [newApp, ...prev]);
          setLastSubmittedApplication({
            title: tailoringOpportunity?.title,
            company: compName,
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
