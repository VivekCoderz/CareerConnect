import React from 'react';

const ExperienceForm = ({ data = [], onChange }) => {
  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addExperience = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        company: '',
        role: '',
        duration: '',
        description: '',
      },
    ]);
  };

  const removeExperience = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Experience / Internship</h3>
        <button
          type="button"
          onClick={addExperience}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          + Add Experience
        </button>
      </div>

      {data.map((exp, index) => (
        <div key={exp.id || index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
          {data.length > 1 && (
            <button
              type="button"
              onClick={() => removeExperience(index)}
              className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
            >
              Remove
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={exp.company || ''}
                onChange={(e) => handleItemChange(index, 'company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Google"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={exp.role || ''}
                onChange={(e) => handleItemChange(index, 'role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Software Engineering Intern"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input
                type="text"
                value={exp.duration || ''}
                onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jun 2023 – Aug 2023"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (simple / raw – AI will improve it)
              </label>
              <textarea
                value={exp.description || ''}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Worked on backend APIs. Fixed bugs. Helped the team with testing."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExperienceForm;
