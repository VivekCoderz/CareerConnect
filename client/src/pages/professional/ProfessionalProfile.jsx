import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
  saveProfessionalProfileDraft,
} from "../../services/professionalProfileService";

// Subcomponents
import BasicInformation from "../../components/professional-profile/BasicInformation";
import ProfessionalIdentity from "../../components/professional-profile/ProfessionalIdentity";
import CurrentEmployment from "../../components/professional-profile/CurrentEmployment";
import ExperienceSection from "../../components/professional-profile/ExperienceSection";
import LeadershipSection from "../../components/professional-profile/LeadershipSection";
import SkillsSection from "../../components/professional-profile/SkillsSection";
import ProjectsSection from "../../components/professional-profile/ProjectsSection";
import AchievementsSection from "../../components/professional-profile/AchievementsSection";
import CertificationsSection from "../../components/professional-profile/CertificationsSection";
import ProfessionalDevelopment from "../../components/professional-profile/ProfessionalDevelopment";
import EducationSection from "../../components/professional-profile/EducationSection";
import CareerGoalsSection from "../../components/professional-profile/CareerGoalsSection";
import JobPreferencesSection from "../../components/professional-profile/JobPreferencesSection";
import AvailabilityCompensationSection from "../../components/professional-profile/AvailabilityCompensationSection";
import RecruiterPreferencesSection from "../../components/professional-profile/RecruiterPreferencesSection";
import ResumeSection from "../../components/professional-profile/ResumeSection";
import ProfileCompletionSuccessModal from "../../components/professional-profile/ProfileCompletionSuccessModal";
import PublicProfileModal from "../../components/professional-profile/PublicProfileModal";

// 6 Core Profile-Building Categories
const CATEGORIES = [
  {
    id: "personal",
    title: "Personal",
    subtitle: "Basic details & professional identity",
    icon: "👤",
    sections: ["Basic Info", "Identity & Headline"],
  },
  {
    id: "professional",
    title: "Professional",
    subtitle: "Current role, work history & leadership",
    icon: "💼",
    sections: ["Current Employment", "Work Experience", "Leadership Scope"],
  },
  {
    id: "expertise",
    title: "Expertise",
    subtitle: "Skills, projects & key achievements",
    icon: "⚡",
    sections: ["Skills & Stack", "Projects", "Achievements", "Certifications"],
  },
  {
    id: "development",
    title: "Development",
    subtitle: "Continuous learning & education",
    icon: "🎓",
    sections: ["Continuous Learning", "Education"],
  },
  {
    id: "career",
    title: "Career & Opportunities",
    subtitle: "Target roles, preferences & compensation",
    icon: "🎯",
    sections: ["Career Transition", "Job Preferences", "Notice & Compensation"],
  },
  {
    id: "presence",
    title: "Professional Presence",
    subtitle: "Recruiter privacy & ATS resume",
    icon: "🛡️",
    sections: ["Privacy & Recruiter", "ATS Resume"],
  },
];

const ProfessionalProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeCategoryId, setActiveCategoryId] = useState("personal");
  const [profileData, setProfileData] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [careerStrength, setCareerStrength] = useState(0);

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  // Complete & finalize profile
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
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Profile submission failed:", err);
      showToast("Submission failed. Ensure all required fields are filled.");
    } finally {
      setCompleting(false);
    }
  };

  const currentCategoryIndex = CATEGORIES.findIndex((c) => c.id === activeCategoryId);
  const currentCategory = CATEGORIES[currentCategoryIndex] || CATEGORIES[0];

  const handleNextCategory = () => {
    if (currentCategoryIndex < CATEGORIES.length - 1) {
      setActiveCategoryId(CATEGORIES[currentCategoryIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleCompleteProfile();
    }
  };

  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      setActiveCategoryId(CATEGORIES[currentCategoryIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Profile Builder...</h2>
        <p className="text-xs text-slate-500 mt-1">Retrieving your executive profile and credentials</p>
      </div>
    );
  }

  if (errorMessage && !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Profile Load Error</h2>
          <p className="text-xs text-slate-500 mb-6">{errorMessage}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchProfile}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Retry
            </button>
            <Link
              to="/professional/dashboard"
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/professional/dashboard"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-xl transition shadow-xs"
            >
              ← Back to Dashboard
            </Link>
            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Working Professional Profile Builder
              </h1>
              <span className="text-[11px] text-slate-500">
                Step {currentCategoryIndex + 1} of 6: {currentCategory.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPublicModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs hidden md:inline-flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Recruiter Preview
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {savingDraft ? (
                <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              )}
              Save Draft
            </button>

            <button
              type="button"
              onClick={handleCompleteProfile}
              disabled={completing}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-60"
            >
              {completing ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Finalize Profile ✨"
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: 6-Category Step Navigation (4 cols on lg) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Overall Profile Strength & Completion Widget */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Profile Strength
                  </span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                    {completion}%
                  </p>
                </div>

                <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {careerStrength} / 100 Score
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Complete all 6 structured categories to unlock high-intent recruiter matches and executive career recommendations.
              </p>
            </div>

            {/* 6 Category Step Navigation */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-1.5">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Profile Steps (6 Categories)
                </span>
              </div>

              {CATEGORIES.map((cat, idx) => {
                const isActive = activeCategoryId === cat.id;
                const isPast = currentCategoryIndex > idx;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`w-full p-3.5 rounded-2xl text-left transition flex items-center justify-between gap-3 ${
                      isActive
                        ? "bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/20"
                        : "text-slate-700 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Step Status Badge */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isPast
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isPast ? "✓" : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold leading-tight">
                            {cat.title}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] block truncate max-w-[180px] ${
                            isActive ? "text-purple-100" : "text-slate-400"
                          }`}
                        >
                          {cat.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {isActive ? "●" : "→"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Main Area: Active Category Sections (8 cols on lg) */}
          <section className="lg:col-span-8 space-y-6">
            {/* Category Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 uppercase tracking-wider">
                  Category {currentCategoryIndex + 1} of 6
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {currentCategory.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentCategory.subtitle}
                </p>
              </div>

              {/* Sub-section chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {currentCategory.sections.map((sec, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium"
                  >
                    {sec}
                  </span>
                ))}
              </div>
            </div>

            {/* Render Category 1: Personal */}
            {activeCategoryId === "personal" && (
              <div className="space-y-6 animate-fade-in">
                <BasicInformation
                  profile={profileData}
                  user={user}
                  onChange={handleSectionChange}
                />
                <ProfessionalIdentity
                  profile={profileData}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Render Category 2: Professional */}
            {activeCategoryId === "professional" && (
              <div className="space-y-6 animate-fade-in">
                <CurrentEmployment
                  currentEmployment={profileData?.currentEmployment || {}}
                  onChange={handleSectionChange}
                />
                <ExperienceSection
                  experience={profileData?.experience || []}
                  onChange={handleSectionChange}
                />
                <LeadershipSection
                  leadership={profileData?.leadership || []}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Render Category 3: Expertise */}
            {activeCategoryId === "expertise" && (
              <div className="space-y-6 animate-fade-in">
                <SkillsSection
                  skills={profileData?.skills || {}}
                  onChange={handleSectionChange}
                />
                <ProjectsSection
                  projects={profileData?.projects || []}
                  onChange={handleSectionChange}
                />
                <AchievementsSection
                  achievements={profileData?.achievements || []}
                  onChange={handleSectionChange}
                />
                <CertificationsSection
                  certifications={profileData?.certifications || []}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Render Category 4: Development */}
            {activeCategoryId === "development" && (
              <div className="space-y-6 animate-fade-in">
                <ProfessionalDevelopment
                  development={profileData?.professionalDevelopment || {}}
                  onChange={handleSectionChange}
                />
                <EducationSection
                  education={profileData?.education || []}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Render Category 5: Career & Opportunities */}
            {activeCategoryId === "career" && (
              <div className="space-y-6 animate-fade-in">
                <CareerGoalsSection
                  careerGoal={profileData?.careerGoal || {}}
                  onChange={handleSectionChange}
                />
                <JobPreferencesSection
                  preferences={profileData?.jobPreferences || {}}
                  onChange={handleSectionChange}
                />
                <AvailabilityCompensationSection
                  availability={profileData?.availability || {}}
                  compensation={profileData?.compensation || {}}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Render Category 6: Professional Presence */}
            {activeCategoryId === "presence" && (
              <div className="space-y-6 animate-fade-in">
                <RecruiterPreferencesSection
                  recruiterPreferences={profileData?.recruiterPreferences || {}}
                  visibility={profileData?.profileVisibility || "recruiter-only"}
                  jobSearchStatus={profileData?.jobSearchStatus || "Open to Opportunities"}
                  onChange={handleSectionChange}
                />
                <ResumeSection
                  resume={profileData?.resume || {}}
                  profile={profileData}
                  onChange={handleSectionChange}
                />
              </div>
            )}

            {/* Bottom Category Action Bar */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrevCategory}
                disabled={currentCategoryIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Previous Category
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition shadow-xs hidden sm:inline-block"
                >
                  Save Progress
                </button>

                <button
                  type="button"
                  onClick={handleNextCategory}
                  disabled={completing}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition flex items-center gap-2"
                >
                  <span>
                    {currentCategoryIndex === CATEGORIES.length - 1
                      ? "Complete & Finalize ✨"
                      : `Continue to ${CATEGORIES[currentCategoryIndex + 1]?.title} →`}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Profile Completion Success Modal */}
      <ProfileCompletionSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        profile={profileData}
        completion={completion || 92}
        onGoToDashboard={() => {
          setShowSuccessModal(false);
          navigate("/professional/dashboard", { replace: true });
        }}
      />

      {/* Recruiter Preview Modal */}
      <PublicProfileModal
        isOpen={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        profile={profileData}
        user={user}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl bg-slate-900 text-white border border-slate-700 flex items-center gap-2.5 animate-slide-in-right">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ProfessionalProfile;
