import { useState } from "react";
import PersonalInfoForm from "./FormSections/PersonalInfoForm";
import EducationForm from "./FormSections/EducationForm";
import SkillsForm from "./FormSections/SkillsForm";
import ProjectsForm from "./FormSections/ProjectsForm";
import ExperienceForm from "./FormSections/ExperienceForm";
import CertificationsForm from "./FormSections/CertificationsForm";
import AchievementsForm from "./FormSections/AchievementsForm";

const STEPS = [
  { id: "personal", label: "Personal" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "certifications", label: "Certifications" },
  { id: "achievements", label: "Achievements" },
];

const MultiStepForm = ({
  rawData,
  onUpdateSection,
  onSubmit,
  onBack,
  profileFound,
  syncProfile,
  onSyncProfileChange,
}) => {
  const [formStep, setFormStep] = useState(0);

  const current = STEPS[formStep];

  const handleNext = () => {
    if (formStep < STEPS.length - 1) {
      setFormStep(formStep + 1);
    } else {
      onSubmit();
    }
  };

  const handlePrev = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    } else {
      onBack();
    }
  };

  const renderSection = () => {
    switch (current.id) {
      case "personal":
        return (
          <PersonalInfoForm
            data={rawData.personal}
            onChange={(data) => onUpdateSection("personal", data)}
          />
        );
      case "education":
        return (
          <EducationForm
            data={rawData.education}
            onChange={(data) => onUpdateSection("education", data)}
          />
        );
      case "skills":
        return (
          <SkillsForm
            data={rawData.skills}
            onChange={(data) => onUpdateSection("skills", data)}
          />
        );
      case "projects":
        return (
          <ProjectsForm
            data={rawData.projects}
            onChange={(data) => onUpdateSection("projects", data)}
          />
        );
      case "experience":
        return (
          <ExperienceForm
            data={rawData.experience}
            onChange={(data) => onUpdateSection("experience", data)}
          />
        );
      case "certifications":
        return (
          <CertificationsForm
            data={rawData.certifications}
            onChange={(data) => onUpdateSection("certifications", data)}
          />
        );
      case "achievements":
        return (
          <AchievementsForm
            data={rawData.achievements}
            onChange={(data) => onUpdateSection("achievements", data)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Section progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1.5 mx-0.5 rounded-full transition-colors ${
                i <= formStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <p className="text-sm text-gray-500 text-center">
            Section {formStep + 1} of {STEPS.length}:{" "}
            <span className="font-medium text-gray-800">{current.label}</span>
          </p>
          {profileFound && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              From your profile
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        {renderSection()}
      </div>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={handlePrev}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {formStep === 0 ? "← Cancel" : "Previous"}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {formStep === STEPS.length - 1 ? "Confirm & Choose Template →" : "Next →"}
        </button>
      </div>

      {/* Sync to profile — shown only on last section */}
      {formStep === STEPS.length - 1 && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={syncProfile}
              onChange={(event) => onSyncProfileChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-sm">
              <span className="block font-semibold text-gray-900">
                {profileFound
                  ? "Save any edits back to my Profile"
                  : "Save this information to my Profile"}
              </span>
              <span className="block mt-0.5 text-gray-600">
                {profileFound
                  ? "Keeps your Profile and Resume in sync — changes made here will also update your Profile."
                  : "Your resume details will be saved to your Profile so you don't have to fill them in again."}
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default MultiStepForm;
