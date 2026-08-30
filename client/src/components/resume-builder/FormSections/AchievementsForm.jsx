import React from 'react';

const AchievementsForm = ({ data = [], onChange }) => {
  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addAchievement = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
      },
    ]);
  };

  const removeAchievement = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Achievements</h3>
        <button
          type="button"
          onClick={addAchievement}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          + Add Achievement
        </button>
      </div>

      {data.map((ach, index) => (
        <div key={ach.id || index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
          {data.length > 1 && (
            <button
              type="button"
              onClick={() => removeAchievement(index)}
              className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
            >
              Remove
            </button>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={ach.title || ''}
              onChange={(e) => handleItemChange(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Winner – Smart India Hackathon 2023"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={ach.description || ''}
              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Led a team of 6 to build an AI-based solution..."
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AchievementsForm;
