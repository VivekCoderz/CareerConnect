import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setTemplate,
  nextStep,
  prevStep,
  setStep,
  updateRawSection,
  generateResume,
  updateResumeWithAI,
  setGeneratedResume,
  setLastChangeRequest,
  clearError,
  fetchSavedResume,
  saveManualEdit,
} from '../../redux/features/resumeSlice';
import { validateRawData } from '../../utils/resumeHelpers';

import TemplateSelector from '../../components/resume-builder/TemplateSelector';
import MultiStepForm from '../../components/resume-builder/MultiStepForm';
import ResumePreview from '../../components/resume-builder/ResumePreview';
import ReviewActions from '../../components/resume-builder/ReviewActions';
import AIChangeRequest from '../../components/resume-builder/AIChangeRequest';
import ManualEditor from '../../components/resume-builder/ManualEditor';

const ResumeBuilder = () => {
  const dispatch = useDispatch();
  const {
    currentStep,
    selectedTemplate,
    rawData,
    generatedResume,
    isGenerating,
    isUpdating,
    error,
  } = useSelector((state) => state.resume);

  const [reviewMode, setReviewMode] = useState('preview');

  // Load saved resume on mount
  useEffect(() => {
    dispatch(fetchSavedResume());
  }, [dispatch]);

  const handleSelectTemplate = (id) => {
    dispatch(setTemplate(id));
  };

  const handleTemplateNext = () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    dispatch(nextStep());
  };

  const handleUpdateSection = (section, data) => {
    dispatch(updateRawSection({ section, data }));
  };

  const handleFormSubmit = () => {
    const errors = validateRawData(rawData);
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }
    dispatch(generateResume({ rawData, template: selectedTemplate }));
  };

  const handleAskAI = () => setReviewMode('askAI');
  const handleEditManually = () => setReviewMode('manual');

  const handleAIChangeSubmit = (instruction) => {
    dispatch(setLastChangeRequest(instruction));
    dispatch(updateResumeWithAI({ currentResume: generatedResume, instruction }))
      .unwrap()
      .then(() => setReviewMode('preview'))
      .catch(() => {});
  };

  const handleManualSave = (updated) => {
    dispatch(saveManualEdit(updated))
      .unwrap()
      .then(() => setReviewMode('preview'))
      .catch(() => {});
  };

  const handleFinalize = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Resume Builder</h1>
          <p className="text-gray-500 mt-1">
            Create an ATS-friendly professional resume in minutes
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        {currentStep === 0 && (
          <>
            <TemplateSelector selected={selectedTemplate} onSelect={handleSelectTemplate} />
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={handleTemplateNext}
                disabled={!selectedTemplate}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {currentStep === 1 && (
          <MultiStepForm
            rawData={rawData}
            onUpdateSection={handleUpdateSection}
            onSubmit={handleFormSubmit}
            onBack={() => dispatch(prevStep())}
          />
        )}

        {isGenerating && (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">AI is generating your professional resume...</p>
            <p className="text-sm text-gray-400 mt-1">Improving wording · ATS optimization · Structuring content</p>
          </div>
        )}

        {currentStep === 2 && !isGenerating && generatedResume && (
          <>
            {reviewMode === 'preview' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Resume Preview</h2>
                  <button
                    type="button"
                    onClick={() => dispatch(setStep(1))}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Edit original details
                  </button>
                </div>

                <div id="resume-print-area">
                  <ResumePreview data={generatedResume} templateId={selectedTemplate} />
                </div>

                <ReviewActions
                  onFinalize={handleFinalize}
                  onAskAI={handleAskAI}
                  onEditManually={handleEditManually}
                  isUpdating={isUpdating}
                />
              </>
            )}

            {reviewMode === 'askAI' && (
              <AIChangeRequest
                onSubmit={handleAIChangeSubmit}
                onCancel={() => setReviewMode('preview')}
                isUpdating={isUpdating}
              />
            )}

            {reviewMode === 'manual' && (
              <ManualEditor
                resume={generatedResume}
                onSave={handleManualSave}
                onCancel={() => setReviewMode('preview')}
              />
            )}
          </>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ResumeBuilder;