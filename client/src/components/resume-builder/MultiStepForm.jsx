import React, { useState } from 'react';
import PersonalInfoForm from './FormSections/PersonalInfoForm';
import EducationForm from './FormSections/EducationForm';
import SkillsForm from './FormSections/SkillsForm';
import ProjectsForm from './FormSections/ProjectsForm';
import ExperienceForm from './FormSections/ExperienceForm';
import CertificationsForm from './FormSections/CertificationsForm';
import AchievementsForm from './FormSections/AchievementsForm';

const STEPS = [
  { id: 'personal', label: 'Personal' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'achievements', label: 'Achievements' },
];

const MultiStepForm = ({ rawData, onUpdateSection, onSubmit, onBack }) => {
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
      case 'personal':
        return (
          <PersonalInfoForm
            data={rawData.personal}
            onChange={(data) => onUpdateSection('personal', data)}
          />
        );
      case 'education':
        return (
          <EducationForm
            data={rawData.education}
            onChange={(data) => onUpdateSection('education', data)}
          />
        );
      case 'skills':
        return (
          <SkillsForm
            data={rawData.skills}
            onChange={(data) => onUpdateSection('skills', data)}
          />
        );
      case 'projects':
        return (
          <ProjectsForm
            data={rawData.projects}
            onChange={(data) => onUpdateSection('projects', data)}
          />
        );
      case 'experience':
        return (
          <ExperienceForm
            data={rawData.experience}
            onChange={(data) => onUpdateSection('experience', data)}
          />
        );
      case 'certifications':
        return (
          <CertificationsForm
            data={rawData.certifications}
            onChange={(data) => onUpdateSection('certifications', data)}
          />
        );
      case 'achievements':
        return (
          <AchievementsForm
            data={rawData.achievements}
            onChange={(data) => onUpdateSection('achievements', data)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1.5 mx-0.5 rounded-full ${
                i <= formStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center">
          Step {formStep + 1} of {STEPS.length}: <span className="font-medium text-gray-800">{current.label}</span>
        </p>
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
          {formStep === 0 ? 'Back to Templates' : 'Previous'}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {formStep === STEPS.length - 1 ? 'Generate Resume with AI' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default MultiStepForm;
