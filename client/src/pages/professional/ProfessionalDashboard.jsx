import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/features/authSlice";
import { logoutUser } from "../../services/authService";
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
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  const [toast, setToast] = useState(null);

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

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
    dispatch(logout());
    navigate("/login");
  };

  // Trigger Application Review Flow
  const handleInitiateApply = (opp) => {
    if (!opp) return;
    const preparedOpp = {
      ...opp,
      company: opp.company || opp.companyName || "Technology Enterprise",
      companyName: opp.company || opp.companyName || "Technology Enterprise",
    };
    setReviewingOpportunity(preparedOpp);
    setShowApplyReviewModal(true);
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
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <ProfessionalHeader
        professionalName={professionalName}
        professionalRole={currentRole}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Side Navigation Sidebar */}
        <ProfessionalSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
        />

        {/* Main Center Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Main Dashboard Overview Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              {/* 1. Welcome Section */}
              <WelcomeSection
                name={professionalName}
                role={currentRole}
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
