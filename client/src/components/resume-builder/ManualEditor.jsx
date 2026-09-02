import React, { useState } from 'react';

const ManualEditor = ({ resume, onSave, onCancel }) => {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(resume)));

  const updatePersonal = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const updateSummary = (value) => {
    setDraft((prev) => ({ ...prev, summary: value }));
  };

  const updateArrayItem = (section, index, field, value) => {
    setDraft((prev) => {
      const arr = [...(prev[section] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [section]: arr };
    });
  };

  const updateBullet = (section, itemIndex, bulletIndex, value) => {
    setDraft((prev) => {
      const arr = [...(prev[section] || [])];
      const bullets = [...(arr[itemIndex].description || [])];
      bullets[bulletIndex] = value;
      arr[itemIndex] = { ...arr[itemIndex], description: bullets };
      return { ...prev, [section]: arr };
    });
  };

  const removeBullet = (section, itemIndex, bulletIndex) => {
    setDraft((prev) => {
      const arr = [...(prev[section] || [])];
      const bullets = (arr[itemIndex].description || []).filter((_, i) => i !== bulletIndex);
      arr[itemIndex] = { ...arr[itemIndex], description: bullets };
      return { ...prev, [section]: arr };
    });
  };

  const addBullet = (section, itemIndex) => {
    setDraft((prev) => {
      const arr = [...(prev[section] || [])];
      const bullets = [...(arr[itemIndex].description || []), ''];
      arr[itemIndex] = { ...arr[itemIndex], description: bullets };
      return { ...prev, [section]: arr };
    });
  };

  const removeItem = (section, index) => {
    setDraft((prev) => ({
      ...prev,
      [section]: (prev[section] || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
        You are editing the AI-generated resume. Original form data remains unchanged.
      </div>

      {/* Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Summary</h3>
        <textarea
          value={draft.summary || ''}
          onChange={(e) => updateSummary(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      {/* Personal */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'].map((f) => (
            <input
              key={f}
              type="text"
              value={draft.personal?.[f] || ''}
              onChange={(e) => updatePersonal(f, e.target.value)}
              placeholder={f}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          ))}
        </div>
      </div>

      {/* Experience */}
      {(draft.experience || []).map((exp, i) => (
        <div key={i} className="bg-white border rounded-lg p-4 relative">
          <button
            type="button"
            onClick={() => removeItem('experience', i)}
            className="absolute top-2 right-2 text-red-500 text-xs"
          >
            Remove
          </button>
          <h3 className="font-semibold mb-2">Experience #{i + 1}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input
              value={exp.role || ''}
              onChange={(e) => updateArrayItem('experience', i, 'role', e.target.value)}
              placeholder="Role"
              className="px-3 py-2 border rounded-md text-sm"
            />
            <input
              value={exp.company || ''}
              onChange={(e) => updateArrayItem('experience', i, 'company', e.target.value)}
              placeholder="Company"
              className="px-3 py-2 border rounded-md text-sm"
            />
            <input
              value={exp.duration || ''}
              onChange={(e) => updateArrayItem('experience', i, 'duration', e.target.value)}
              placeholder="Duration"
              className="px-3 py-2 border rounded-md text-sm md:col-span-2"
            />
          </div>
          <div className="space-y-1">
            {(exp.description || []).map((b, bi) => (
              <div key={bi} className="flex gap-2">
                <input
                  value={b}
                  onChange={(e) => updateBullet('experience', i, bi, e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button type="button" onClick={() => removeBullet('experience', i, bi)} className="text-red-400 text-xs">
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addBullet('experience', i)} className="text-xs text-blue-600">
              + Add bullet
            </button>
          </div>
        </div>
      ))}

      {/* Projects */}
      {(draft.projects || []).map((proj, i) => (
        <div key={i} className="bg-white border rounded-lg p-4 relative">
          <button
            type="button"
            onClick={() => removeItem('projects', i)}
            className="absolute top-2 right-2 text-red-500 text-xs"
          >
            Remove
          </button>
          <h3 className="font-semibold mb-2">Project #{i + 1}</h3>
          <input
            value={proj.name || ''}
            onChange={(e) => updateArrayItem('projects', i, 'name', e.target.value)}
            placeholder="Project name"
            className="w-full px-3 py-2 border rounded-md text-sm mb-2"
          />
          <input
            value={proj.technologies || ''}
            onChange={(e) => updateArrayItem('projects', i, 'technologies', e.target.value)}
            placeholder="Technologies"
            className="w-full px-3 py-2 border rounded-md text-sm mb-2"
          />
          <div className="space-y-1">
            {(proj.description || []).map((b, bi) => (
              <div key={bi} className="flex gap-2">
                <input
                  value={b}
                  onChange={(e) => updateBullet('projects', i, bi, e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button type="button" onClick={() => removeBullet('projects', i, bi)} className="text-red-400 text-xs">
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addBullet('projects', i)} className="text-xs text-blue-600">
              + Add bullet
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-3 justify-end sticky bottom-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default ManualEditor;
