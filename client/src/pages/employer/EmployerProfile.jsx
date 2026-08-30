import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getEmployerProfile,
  updateEmployerProfile,
  saveEmployerDraft,
  publishEmployerProfile,
} from "../../services/employerService";

import ProfileBrandPanel from "../../components/employer-profile/ProfileBrandPanel";
import ProfileProgress from "../../components/employer-profile/ProfileProgress";
import BasicCompanyInfo from "../../components/employer-profile/BasicCompanyInfo";
import AboutCompany from "../../components/employer-profile/AboutCompany";
import CompanyDetails from "../../components/employer-profile/CompanyDetails";
import TeamCulture from "../../components/employer-profile/TeamCulture";
import HiringPreferences from "../../components/employer-profile/HiringPreferences";
import ProfileReview from "../../components/employer-profile/ProfileReview";
import StepNavigation from "../../components/employer-profile/StepNavigation";

const EmployerProfile = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    companyName: "",
    officialEmail: "",
    mobile: "",
    logo: "",
    industry: "Information Technology",
    companyType: "Private",
    foundedYear: "",
    website: "",
    tagline: "",
    description: "",
    mission: "",
    vision: "",
    coreValues: [],
    companyStory: "",
    whyWorkWithUs: "",
    companyHighlights: [],
    companySize: "11–50",
    headquarters: {
      city: "",
      state: "",
      country: "India",
    },
    offices: [],
    departments: [],
    socialLinks: {
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: "",
      youtube: "",
      other: "",
    },
    culture: {
      workEnvironment: "Hybrid",
      description: "",
    },
    benefits: [],
    perks: [],
    leadership: [],
    gallery: [],
    companyStructure: "",
    hiringPreferences: {
      candidateTypes: ["Students", "Freshers", "Working Professionals", "Interns"],
      skills: [],
      qualifications: [],
      minimumCGPA: "",
      specializations: [],
      experienceLevels: [],
      locations: [],
      jobTypes: ["Full-time", "Internship"],
      workModes: ["Hybrid", "On-site"],
      salaryRange: { min: 0, max: 0 },
      applicationEmail: "",
    },
    recruiter: {
      name: "",
      designation: "",
      email: "",
      phone: "",
    },
    profileCompletion: 20,
    isPublished: false,
  });

  // Calculate live weighted completion percentage
  const calculateLiveCompletion = (data) => {
    let score = 0;
    // 1. Basic (15%)
    let b = 0;
    if (data.companyName) b += 4;
    if (data.officialEmail) b += 3;
    if (data.mobile) b += 3;
    if (data.industry) b += 3;
    if (data.companyType) b += 2;
    score += Math.min(15, b);

    // 2. About (20%)
    let a = 0;
    if (data.description && data.description.trim().length >= 20) a += 8;
    if (data.mission || data.vision) a += 4;
    if (data.coreValues && data.coreValues.length > 0) a += 3;
    if (data.whyWorkWithUs) a += 3;
    if (data.companyHighlights && data.companyHighlights.length > 0) a += 2;
    score += Math.min(20, a);

    // 3. Details (15%)
    let d = 0;
    if (data.companySize) d += 4;
    if (data.headquarters?.city) d += 6;
    if (data.departments && data.departments.length > 0) d += 3;
    if (data.offices && data.offices.length > 0) d += 2;
    score += Math.min(15, d);

    // 4. Culture (20%)
    let c = 0;
    if (data.culture?.workEnvironment) c += 4;
    if (data.culture?.description) c += 4;
    if (data.benefits && data.benefits.length > 0) c += 4;
    if (data.perks && data.perks.length > 0) c += 3;
    if (data.leadership && data.leadership.length > 0) c += 3;
    if (data.gallery && data.gallery.length > 0) c += 2;
    score += Math.min(20, c);

    // 5. Hiring (20%)
    let h = 0;
    if (data.hiringPreferences?.candidateTypes?.length > 0) h += 4;
    if (data.hiringPreferences?.skills?.length > 0) h += 5;
    if (data.hiringPreferences?.qualifications?.length > 0) h += 4;
    if (data.hiringPreferences?.jobTypes?.length > 0) h += 3;
    if (data.hiringPreferences?.workModes?.length > 0) h += 2;
    if (data.recruiter?.name || data.recruiter?.email) h += 2;
    score += Math.min(20, h);

    // 6. Social (5%)
    let s = 0;
    if (data.website) s += 2;
    if (data.socialLinks?.linkedin) s += 2;
    if (data.socialLinks?.twitter || data.socialLinks?.facebook) s += 1;
    score += Math.min(5, s);

    // 7. Logo (5%)
    if (data.logo) score += 5;

    return Math.min(100, Math.max(0, score));
  };

  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getEmployerProfile();
        if (res?.success && res?.profile) {
          const p = res.profile;
          setFormData((prev) => ({
            ...prev,
            ...p,
            companyName: p.companyName || user?.fullName || "",
            officialEmail: p.officialEmail || user?.email || "",
            mobile: p.mobile || user?.phone || "",
            logo: p.logo || user?.profileImage || "",
            headquarters: {
              city: p.headquarters?.city || "",
              state: p.headquarters?.state || "",
              country: p.headquarters?.country || "India",
            },
            socialLinks: {
              linkedin: p.socialLinks?.linkedin || "",
              twitter: p.socialLinks?.twitter || "",
              facebook: p.socialLinks?.facebook || "",
              instagram: p.socialLinks?.instagram || "",
              youtube: p.socialLinks?.youtube || "",
              other: p.socialLinks?.other || "",
            },
            culture: {
              workEnvironment: p.culture?.workEnvironment || "Hybrid",
              description: p.culture?.description || "",
            },
            hiringPreferences: {
              candidateTypes: p.hiringPreferences?.candidateTypes || ["Students", "Freshers", "Working Professionals", "Interns"],
              skills: p.hiringPreferences?.skills || [],
              qualifications: p.hiringPreferences?.qualifications || [],
              minimumCGPA: p.hiringPreferences?.minimumCGPA || "",
              specializations: p.hiringPreferences?.specializations || [],
              experienceLevels: p.hiringPreferences?.experienceLevels || [],
              locations: p.hiringPreferences?.locations || [],
              jobTypes: p.hiringPreferences?.jobTypes || ["Full-time", "Internship"],
              workModes: p.hiringPreferences?.workModes || ["Hybrid", "On-site"],
              salaryRange: p.hiringPreferences?.salaryRange || { min: 0, max: 0 },
              applicationEmail: p.hiringPreferences?.applicationEmail || "",
            },
            recruiter: {
              name: p.recruiter?.name || "",
              designation: p.recruiter?.designation || "",
              email: p.recruiter?.email || "",
              phone: p.recruiter?.phone || "",
            },
          }));

          if (p.currentStep) {
            setCurrentStep(p.currentStep);
            setMaxVisitedStep(Math.max(p.currentStep, 1));
          }
        }
      } catch (err) {
        console.error("Failed to load employer profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  // Validation per step
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!formData.companyName?.trim()) errors.companyName = "Company name is required";
      if (!formData.officialEmail?.trim()) errors.officialEmail = "Official email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.officialEmail))
        errors.officialEmail = "Please enter a valid email address";
      if (!formData.mobile?.trim()) errors.mobile = "Mobile number is required";
      if (!formData.industry?.trim()) errors.industry = "Please select an industry";
    }

    if (step === 2) {
      if (!formData.description?.trim()) {
        errors.description = "Company overview description is required";
      } else if (formData.description.trim().length < 20) {
        errors.description = "Please provide at least 20 characters for company overview";
      }
    }

    if (step === 3) {
      if (!formData.headquarters?.city?.trim()) {
        errors.headquartersCity = "Headquarters city is required";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setIsSaving(true);
      const nextStepNum = currentStep + 1;
      const payload = {
        ...formData,
        currentStep: nextStepNum,
      };

      await updateEmployerProfile(payload);
      setCurrentStep(nextStepNum);
      setMaxVisitedStep((prev) => Math.max(prev, nextStepNum));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsDraftSaving(true);
      const res = await saveEmployerDraft({
        ...formData,
        currentStep,
      });
      if (res?.success) {
        showToast("Profile draft saved successfully!");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to save draft");
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setErrorMessage(null);
      // Save all latest state first
      await updateEmployerProfile({
        ...formData,
        currentStep: 6,
      });

      const res = await publishEmployerProfile();
      if (res?.success) {
        showToast("Company profile published successfully!");
        setTimeout(() => {
          navigate("/employer/dashboard", { replace: true });
        }, 1000);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          "Could not publish profile. Please complete the required fields."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const liveCompletion = calculateLiveCompletion(formData);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#f59e0b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">
          Loading your company workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in-right">
          <div className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700">
            <span className="text-amber-400">✓</span>
            {toastMessage.text}
          </div>
        </div>
      )}

      {/* LEFT BRAND PANEL (Matching Reference Screenshot) */}
      <ProfileBrandPanel
        currentStep={currentStep}
        profileCompletion={liveCompletion}
      />

      {/* RIGHT WORKSPACE FORM */}
      <div className="flex-1 flex flex-col justify-between p-5 sm:p-8 lg:p-12 overflow-y-auto max-w-4xl mx-auto w-full">
        <div>
          {/* Top Step Progress Bar */}
          <ProfileProgress
            currentStep={currentStep}
            onStepClick={(s) => setCurrentStep(s)}
            maxVisitedStep={maxVisitedStep}
          />

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-start gap-2.5 shadow-xs">
              <span className="text-red-500 font-bold text-sm">⚠️</span>
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Step Form Switcher */}
          {currentStep === 1 && (
            <BasicCompanyInfo
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
            />
          )}

          {currentStep === 2 && (
            <AboutCompany
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
            />
          )}

          {currentStep === 3 && (
            <CompanyDetails
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
            />
          )}

          {currentStep === 4 && (
            <TeamCulture
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
            />
          )}

          {currentStep === 5 && (
            <HiringPreferences
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              fieldErrors={fieldErrors}
            />
          )}

          {currentStep === 6 && (
            <ProfileReview
              formData={formData}
              onEditStep={(s) => setCurrentStep(s)}
              profileCompletion={liveCompletion}
              onPublish={handlePublish}
              isPublishing={isPublishing}
            />
          )}
        </div>

        {/* Bottom Step Navigation Action Bar */}
        <StepNavigation
          currentStep={currentStep}
          totalSteps={6}
          onBack={handleBack}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          isSaving={isSaving}
          isDraftSaving={isDraftSaving}
          isPublishing={isPublishing}
        />
      </div>
    </div>
  );
};

export default EmployerProfile;
