import React from 'react';
import { RESUME_TEMPLATES } from '../../data/templates';

const TemplateSelector = ({ selected, onSelect }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Choose a Resume Template</h2>
        <p className="text-gray-600 mt-2">
          Select a visual design. Content will be the same — only layout changes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {RESUME_TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelect(tpl.id)}
              className={`relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Mini preview bar */}
              <div
                className="h-3 w-full rounded mb-4"
                style={{ backgroundColor: tpl.previewColor }}
              />
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-full" />
                <div className="h-2 bg-gray-100 rounded w-5/6" />
                <div className="h-2 bg-gray-100 rounded w-2/3" />
              </div>

              <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>

              {isSelected && (
                <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateSelector;
