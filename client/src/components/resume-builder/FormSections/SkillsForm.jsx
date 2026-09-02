
import React from 'react';

const SkillsForm = ({ data = {}, onChange }) => {
  const handleChange = (e) => {
    onChange({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Skills</h3>
      <p className="text-sm text-gray-500">Enter skills separated by commas</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Programming Languages</label>
        <input
          type="text"
          name="programmingLanguages"
          value={data.programmingLanguages || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="JavaScript, Python, Java, C++"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frameworks / Libraries</label>
        <input
          type="text"
          name="frameworks"
          value={data.frameworks || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="React, Node.js, Express, Django"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tools</label>
        <input
          type="text"
          name="tools"
          value={data.tools || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Git, Docker, VS Code, Postman"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Other Technical Skills</label>
        <input
          type="text"
          name="other"
          value={data.other || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="REST APIs, MongoDB, AWS, System Design"
        />
      </div>
    </div>
  );
};

export default SkillsForm;
