import React from 'react';

const CertificationsForm = ({ data = [], onChange }) => {
  const handleItemChange = (index, field, value) => {
    const updated = data.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const addCertification = () => {
    onChange([
      ...data,
      {
        id: crypto.randomUUID(),
        name: '',
        issuer: '',
        year: '',
      },
    ]);
  };

  const removeCertification = (index) => {
    if (data.length <= 1) return;
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Certifications</h3>
        <button
          type="button"
          onClick={addCertification}
          className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
        >
          + Add Certification
        </button>
      </div>

      {data.map((cert, index) => (
        <div key={cert.id || index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
          {data.length > 1 && (
            <button
              type="button"
              onClick={() => removeCertification(index)}
              className="absolute top-2 right-2 text-red-500 text-sm hover:text-red-700"
            >
              Remove
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label>
              <input
                type="text"
                value={cert.name || ''}
                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AWS Certified Cloud Practitioner"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
              <input
                type="text"
                value={cert.issuer || ''}
                onChange={(e) => handleItemChange(index, 'issuer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Amazon Web Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="text"
                value={cert.year || ''}
                onChange={(e) => handleItemChange(index, 'year', e.target.value)}
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

export default CertificationsForm;
