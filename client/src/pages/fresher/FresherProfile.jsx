import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import {
  getFresherProfile,
  updateFresherProfile,
  saveFresherProfileDraft,
} from "../../services/fresherProfileService";

// Component Sections
import FresherProfileHeader from "../../components/fresher-profile/FresherProfileHeader";
import BasicInformation from "../../components/fresher-profile/BasicInformation";
import ProfessionalInformation from "../../components/fresher-profile/ProfessionalInformation";
import EducationSection from "../../components/fresher-profile/EducationSection";
import SkillsSection from "../../components/fresher-profile/SkillsSection";
import ProjectsSection from "../../components/fresher-profile/ProjectsSection";
import InternshipsSection from "../../components/fresher-profile/InternshipsSection";
import CertificationsSection from "../../components/fresher-profile/CertificationsSection";
import AchievementsSection from "../../components/fresher-profile/AchievementsSection";
import CodingProfilesSection from "../../components/fresher-profile/CodingProfilesSection";
import JobPreferencesSection from "../../components/fresher-profile/JobPreferencesSection";
import AvailabilitySection from "../../components/fresher-profile/AvailabilitySection";
import ResumeSection from "../../components/fresher-profile/ResumeSection";
import ProfileReviewModal from "../../components/fresher-profile/ProfileReviewModal";
import PublicProfileModal from "../../components/fresher-profile/PublicProfileModal";

const STEPS = [
  { id: "basic", label: "Basic Info", icon: "👤", isRequired: true },
  { id: "pro", label: "Professional", icon: "💼", isRequired: true },
  { id: "edu", label: "Education", icon: "🎓", isRequired: true },
  { id: "skills", label: "Skills", icon: "⚡", isRequired: true },
  { id: "projects", label: "Projects", icon: "🚀", isRequired: true },
  { id: "internships", label: "Internships", icon: "🏢", isRequired: false },
  { id: "certs", label: "Certifications", icon: "📜", isRequired: false },
  { id: "achieve", label: "Achievements", icon: "🏆", isRequired: false },
  { id: "preferences", label: "Preferences", icon: "🎯", isRequired: true },
  { id: "resume", label: "Resume", icon: "📄", isRequired: true },
];

const FresherProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [readiness, setReadiness] = useState({ score: 0, breakdown: {}, tips: [] });
  const [activeStep, setActiveStep] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPublicModal, setShowPublicModal] = useState(false);

  // Local working copy for state synchronization
  const [workingData, setWorkingData] = useState({});

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFresherProfile();
      if (res?.profile) {
        setProfile(res.profile);
        setWorkingData(res.profile);
        setCompletion(res.profileCompletion || 0);
        setReadiness(res.jobReadiness || { score: 0, breakdown: {}, tips: [] });
      }
    } catch (err) {
      console.error("Failed to load fresher profile:", err);
      setError("Unable to load fresher profile. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleSectionChange = (sectionUpdates) => {
    setWorkingData((prev) => ({
      ...prev,
      ...sectionUpdates,
    }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await saveFresherProfileDraft(workingData);
      if (res?.profile) {
        setProfile(res.profile);
        setWorkingData(res.profile);
        setCompletion(res.profileCompletion || 0);
        setReadiness(res.jobReadiness || { score: 0, breakdown: {}, tips: [] });

        dispatch(
          updateUserProfile({
            fullName: workingData.fullName || user?.fullName,
            profileCompletion: res.profileCompletion,
            isProfileComplete: res.isProfileComplete,
          })
        );
      }
      showToast("Draft saved successfully! Progress preserved.");
    } catch (err) {
      console.error("Failed to save draft:", err);
      showToast("Error saving draft. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteProfile = async () => {
    setSaving(true);
    try {
      const res = await updateFresherProfile({
        ...workingData,
        isProfileComplete: true,
      });

      if (res?.profile) {
        setProfile(res.profile);
        dispatch(
          updateUserProfile({
            fullName: workingData.fullName || user?.fullName,
            profileCompletion: res.profileCompletion,
            isProfileComplete: true,
          })
        );
      }

      showToast("Profile completed successfully! Launching your workspace...");
      setTimeout(() => {
        navigate("/fresher/dashboard", { replace: true });
      }, 700);
    } catch (err) {
      console.error("Failed to complete profile:", err);
      showToast("Unable to complete profile. Please verify required fields.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 200, behavior: "smooth" });
    } else {
      setShowReviewModal(true);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Loading Fresher Profile...</h2>
        <p className="text-xs text-slate-500 mt-1">Preparing your career workspace</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Profile Error</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchProfile}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              Retry
            </button>
            <Link
              to="/fresher/dashboard"
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/fresher/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition"
          >
            ← Back to Dashboard
          </Link>

          {toastMessage && (
            <div className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm animate-pulse">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Top Header Card with Dynamic Gauges */}
        <FresherProfileHeader
          profile={workingData}
          completion={completion}
          readinessScore={readiness.score}
          isSaving={saving}
          onSaveDraft={handleSaveDraft}
          onOpenReview={() => setShowReviewModal(true)}
          onOpenPublicPreview={() => setShowPublicModal(true)}
          onVisibilityChange={(newVis) => {
            handleSectionChange({ profileVisibility: newVis });
            showToast(`Profile visibility set to ${newVis}`);
          }}
        />

        {/* Step Navigation Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPassed = activeStep > idx;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : isPassed
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                  {isPassed && <span className="text-[10px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Form Sections */}
        <main className="space-y-6">
          {activeStep === 0 && (
            <BasicInformation
              profile={workingData}
              user={user}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 1 && (
            <ProfessionalInformation
              profile={workingData}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 2 && (
            <EducationSection
              education={workingData.education || []}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 3 && (
            <SkillsSection
              skills={workingData.skills || {}}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 4 && (
            <ProjectsSection
              projects={workingData.projects || []}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 5 && (
            <InternshipsSection
              internships={workingData.internships || []}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 6 && (
            <CertificationsSection
              certifications={workingData.certifications || []}
              onChange={handleSectionChange}
            />
          )}

          {activeStep === 7 && (
            <div className="space-y-6">
              <AchievementsSection
                achievements={workingData.achievements || []}
                onChange={handleSectionChange}
              />
              <CodingProfilesSection
                codingProfiles={workingData.codingProfiles || []}
                onChange={handleSectionChange}
              />
            </div>
          )}

          {activeStep === 8 && (
            <div className="space-y-6">
              <JobPreferencesSection
                preferences={workingData.jobPreferences || {}}
                onChange={handleSectionChange}
              />
              <AvailabilitySection
                availability={workingData.availability || {}}
                workAuthorization={workingData.workAuthorization || {}}
                onChange={handleSectionChange}
              />
            </div>
          )}

          {activeStep === 9 && (
            <ResumeSection
              profile={workingData}
              user={user}
              onChange={handleSectionChange}
            />
          )}
        </main>

        {/* Bottom Step Controller Footer */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeStep === 0}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous Step
          </button>

          <div className="text-xs font-semibold text-slate-500 hidden sm:block">
            Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep].label}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              {activeStep === STEPS.length - 1 ? "Review Profile →" : "Next Step →"}
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ProfileReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        profile={workingData}
        user={user}
        completion={completion}
        readiness={readiness}
        isSubmitting={saving}
        onCompleteProfile={handleCompleteProfile}
        onJumpToStep={(stepIdx) => setActiveStep(stepIdx)}
      />

      {/* Public Recruiter View Modal */}
      <PublicProfileModal
        isOpen={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        profile={workingData}
        user={user}
      />
    </div>
  );
};

export default FresherProfile;
