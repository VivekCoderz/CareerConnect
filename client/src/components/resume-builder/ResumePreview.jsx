import React from 'react';
import ProfessionalTemplate from './templates/ProfessionalTemplate';
import ModernTemplate from './templates/ModernTemplate';
import MinimalTemplate from './templates/MinimalTemplate';

const ResumePreview = ({ data, templateId }) => {
  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">
        No resume generated yet.
      </div>
    );
  }

  const renderTemplate = () => {
    switch (templateId) {
      case 'modern':
        return <ModernTemplate data={data} />;
      case 'minimal':
        return <MinimalTemplate data={data} />;
      case 'professional':
      default:
        return <ProfessionalTemplate data={data} />;
    }
  };

  return (
    <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
      <div className="shadow-lg rounded-lg overflow-hidden bg-white">
        {renderTemplate()}
      </div>
    </div>
  );
};

export default ResumePreview;
