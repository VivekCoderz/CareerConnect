import React from 'react';

const ProjectsForm = ({ data = [], onChange }) => {
  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addProject = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        name: '',
        technologies: '',
        description: '',
        github: '',
        live: '',
      },
    ]);
  };

  const removeProject = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Projects</h3>
        <button
          type="button"
          onClick={addProject}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          + Add Project
        </button>
      </div>

      {data.map((proj, index) => (
        <div key={proj.id || index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
          {data.length > 1 && (
            <button
              type="button"
              onClick={() => removeProject(index)}
              className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
            >
              Remove
            </button>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={proj.name || ''}
              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="E-Commerce Platform"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technologies Used</label>
            <input
              type="text"
              value={proj.technologies || ''}
              onChange={(e) => handleItemChange(index, 'technologies', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="React, Node.js, MongoDB"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (simple / raw – AI will improve it)
            </label>
            <textarea
              value={proj.description || ''}
              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Built a full-stack app where users can buy products. Used React for frontend and Node for backend."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Link</label>
              <input
                type="url"
                value={proj.github || ''}
                onChange={(e) => handleItemChange(index, 'github', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Live Link</label>
              <input
                type="url"
                value={proj.live || ''}
                onChange={(e) => handleItemChange(index, 'live', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://myproject.com"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsForm;
