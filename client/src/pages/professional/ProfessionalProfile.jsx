import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
  saveProfessionalProfileDraft,
} from "../../services/professionalProfileService";

import ProfessionalProfileHeader from "../../components/professional-profile/ProfessionalProfileHeader";
import BasicInformation from "../../components/professional-profile/BasicInformation";
import ProfessionalIdentity from "../../components/professional-profile/ProfessionalIdentity";
import CurrentEmployment from "../../components/professional-profile/CurrentEmployment";
import ExperienceSection from "../../components/professional-profile/ExperienceSection";
import SkillsSection from "../../components/professional-profile/SkillsSection";
import ProjectsSection from "../../components/professional-profile/ProjectsSection";
import AchievementsSection from "../../components/professional-profile/AchievementsSection";
import LeadershipSection from "../../components/professional-profile/LeadershipSection";
import CertificationsSection from "../../components/professional-profile/CertificationsSection";
import ProfessionalDevelopment from "../../components/professional-profile/ProfessionalDevelopment";
import EducationSection from "../../components/professional-profile/EducationSection";
import CareerGoalsSection from "../../components/professional-profile/CareerGoalsSection";
import JobPreferencesSection from "../../components/professional-profile/JobPreferencesSection";
import AvailabilityCompensationSection from "../../components/professional-profile/AvailabilityCompensationSection";
import RecruiterPreferencesSection from "../../components/professional-profile/RecruiterPreferencesSection";
import ResumeSection from "../../components/professional-profile/ResumeSection";
import ProfileReviewModal from "../../components/professional-profile/ProfileReviewModal";
import PublicProfileModal from "../../components/professional-profile/PublicProfileModal";

const TABS = [
  { id: "basic", label: "Basic Info", icon: "👤" },
  { id: "identity", label: "Identity & Headline", icon: "💼" },
  { id: "employment", label: "Current Employment", icon: "🏢" },
  { id: "experience", label: "Work Experience", icon: "⏳" },
  { id: "skills", label: "Skills & Stack", icon: "⚡" },
  { id: "projects", label: "Projects", icon: "🚀" },
  { id: "achievements", label: "Achievements", icon: "🏆" },
  { id: "leadership", label: "Leadership Scope", icon: "👥" },
  { id: "certifications", label: "Certifications", icon: "📜" },
  { id: "development", label: "Continuous Learning", icon: "📚" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "goals", label: "Career Transition", icon: "🎯" },
  { id: "preferences", label: "Job Preferences", icon: "🔍" },
  { id: "availability", label: "Notice & Compensation", icon: "💰" },
  { id: "recruiter", label: "Privacy & Recruiter", icon: "🛡️" },
  { id: "resume", label: "ATS Resume", icon: "📄" },
];

const ProfessionalProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState("basic");
  const [profileData, setProfileData] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [careerStrength, setCareerStrength] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPublicModal, setShowPublicModal] = useState(false);

  // Fetch initial profile
  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await getProfessionalProfile();
      if (res?.profile) {
        setProfileData(res.profile);
        setCompletion(res.profileCompletion || 0);
        setCareerStrength(res.careerStrength?.score || 0);
      }
    } catch (err) {
      console.error("Failed to load professional profile:", err);
      setErrorMessage("Could not load profile. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Section patch handler
  const handleSectionChange = (updatedFields) => {
    setProfileData((prev) => ({
      ...prev,
      ...updatedFields,
    }));
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!profileData) return;
    setSavingDraft(true);
    try {
      const res = await saveProfessionalProfileDraft(profileData);
      if (res?.profile) {
        setProfileData(res.profile);
        setCompletion(res.profileCompletion || 0);
        setCareerStrength(res.careerStrength?.score || 0);
        showToast("Progress saved to cloud draft! 💾");
      }
    } catch (err) {
      console.error("Draft save failed:", err);
      showToast("Draft save failed. Please retry.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Complete profile
  const handleCompleteProfile = async () => {
    setCompleting(true);
    try {
      const payload = {
        ...profileData,
        isProfileComplete: true,
      };
      const res = await updateProfessionalProfile(payload);

      if (res?.profile) {
        dispatch(
          updateUserProfile({
            profileCompletion: res.profileCompletion || 100,
            isProfileComplete: true,
          })
        );

        setShowReviewModal(false);
        showToast("Profile finalized! Redirecting to Professional Dashboard...");

        setTimeout(() => {
          navigate("/professional/dashboard", { replace: true });
        }, 800);
      }
    } catch (err) {
      console.error("Profile submission failed:", err);
      showToast("Submission failed. Ensure all required fields are filled.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Professional Profile...</h2>
        <p className="text-xs text-slate-500 mt-1">Fetching your career milestones and competencies</p>
      </div>
    );
  }

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);

  const handleNextTab = () => {
    if (currentTabIndex < TABS.length - 1) {
      setActiveTab(TABS[currentTabIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setShowReviewModal(true);
    }
  };

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(TABS[currentTabIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 animate-fade-in flex items-center gap-2">
          <span>🔔</span> {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link to="/professional/dashboard" className="hover:text-violet-600">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Profile Builder</span>
          </div>

          <Link
            to="/professional/dashboard"
            className="text-xs font-bold text-violet-600 hover:underline"
          >
            ← Back to Workspace
          </Link>
        </div>

        {/* Header Component */}
        <ProfessionalProfileHeader
          profile={profileData}
          completion={completion}
          careerStrength={careerStrength}
          isSaving={savingDraft}
          onSaveDraft={handleSaveDraft}
          onOpenReview={() => setShowReviewModal(true)}
          onOpenPublicPreview={() => setShowPublicModal(true)}
          onVisibilityChange={(vis) => handleSectionChange({ profileVisibility: vis })}
        />

        {/* Tabbed / Multi-Step Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Step Navigation */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-1 sticky top-6">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Profile Sections
            </div>
            <div className="space-y-1 max-h-[75vh] overflow-y-auto">
              {TABS.map((tab, idx) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left ${
                      isActive
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-sm">{tab.icon}</span>
                      <span className="truncate">{tab.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold ${
                        isActive ? "text-violet-200" : "text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Section Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeTab === "basic" && (
              <BasicInformation
                profile={profileData}
                user={user}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "identity" && (
              <ProfessionalIdentity
                profile={profileData}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "employment" && (
              <CurrentEmployment
                currentEmployment={profileData?.currentEmployment}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "experience" && (
              <ExperienceSection
                experience={profileData?.experience}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "skills" && (
              <SkillsSection
                skills={profileData?.skills}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "projects" && (
              <ProjectsSection
                projects={profileData?.projects}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "achievements" && (
              <AchievementsSection
                achievements={profileData?.achievements}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "leadership" && (
              <LeadershipSection
                leadership={profileData?.leadership}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "certifications" && (
              <CertificationsSection
                certifications={profileData?.certifications}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "development" && (
              <ProfessionalDevelopment
                professionalDevelopment={profileData?.professionalDevelopment}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "education" && (
              <EducationSection
                education={profileData?.education}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "goals" && (
              <CareerGoalsSection
                careerGoal={profileData?.careerGoal}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "preferences" && (
              <JobPreferencesSection
                jobPreferences={profileData?.jobPreferences}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "availability" && (
              <AvailabilityCompensationSection
                availability={profileData?.availability}
                compensation={profileData?.compensation}
                relocation={profileData?.relocation}
                jobSearchStatus={profileData?.jobSearchStatus}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "recruiter" && (
              <RecruiterPreferencesSection
                recruiterPreferences={profileData?.recruiterPreferences}
                profileVisibility={profileData?.profileVisibility}
                onChange={handleSectionChange}
              />
            )}

            {activeTab === "resume" && (
              <ResumeSection
                profile={profileData}
                user={user}
                onChange={handleSectionChange}
              />
            )}

            {/* Step Navigation Actions */}
            <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={handlePrevTab}
                disabled={currentTabIndex === 0}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous Section
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="px-4 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-xs font-bold text-violet-700 hover:bg-violet-100 transition shadow-2xs"
                >
                  {savingDraft ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={handleNextTab}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white transition shadow-sm"
                >
                  {currentTabIndex === TABS.length - 1
                    ? "Review Profile →"
                    : "Save & Continue →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ProfileReviewModal
          profile={profileData}
          user={user}
          completion={completion}
          careerStrength={careerStrength}
          isCompleting={completing}
          onClose={() => setShowReviewModal(false)}
          onComplete={handleCompleteProfile}
          onNavigateTab={(tabKey) => {
            setActiveTab(tabKey);
            setShowReviewModal(false);
          }}
        />
      )}

      {/* Public Recruiter Modal */}
      {showPublicModal && (
        <PublicProfileModal
          profile={profileData}
          user={user}
          onClose={() => setShowPublicModal(false)}
        />
      )}
    </div>
  );
};

export default ProfessionalProfile;
