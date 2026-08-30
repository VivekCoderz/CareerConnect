import React from 'react';

const EducationForm = ({ data = [], onChange }) => {
  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addEducation = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        college: '',
        degree: '',
        branch: '',
        cgpa: '',
        startYear: '',
        endYear: '',
      },
    ]);
  };

  const removeEducation = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Education</h3>
        <button
          type="button"
          onClick={addEducation}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          + Add Education
        </button>
      </div>

      {data.map((edu, index) => (
        <div key={edu.id || index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
          {data.length > 1 && (
            <button
              type="button"
              onClick={() => removeEducation(index)}
              className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
            >
              Remove
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">College / University</label>
              <input
                type="text"
                value={edu.college || ''}
                onChange={(e) => handleItemChange(index, 'college', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Indian Institute of Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                value={edu.degree || ''}
                onChange={(e) => handleItemChange(index, 'degree', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="B.Tech"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <input
                type="text"
                value={edu.branch || ''}
                onChange={(e) => handleItemChange(index, 'branch', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
              <input
                type="text"
                value={edu.cgpa || ''}
                onChange={(e) => handleItemChange(index, 'cgpa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="8.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
              <input
                type="text"
                value={edu.startYear || ''}
                onChange={(e) => handleItemChange(index, 'startYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2020"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
              <input
                type="text"
                value={edu.endYear || ''}
                onChange={(e) => handleItemChange(index, 'endYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2024"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EducationForm;
