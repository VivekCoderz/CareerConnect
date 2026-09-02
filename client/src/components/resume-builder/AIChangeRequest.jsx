import React, { useState } from 'react';

const AIChangeRequest = ({ onSubmit, onCancel, isUpdating }) => {
  const [instruction, setInstruction] = useState('');

  const examples = [
    'Make my project descriptions more impactful',
    'Make my summary shorter',
    'Focus more on frontend development',
    'Make the resume suitable for a Software Developer role',
    'Remove certifications section',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    onSubmit(instruction.trim());
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask AI to Make Changes</h3>
      <p className="text-sm text-gray-500 mb-4">
        Describe what you want to change. AI will only update the relevant parts and will never invent new information.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Make project descriptions more impactful and shorten the summary"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInstruction(ex)}
              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!instruction.trim() || isUpdating}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {isUpdating ? 'Updating...' : 'Apply Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChangeRequest;
