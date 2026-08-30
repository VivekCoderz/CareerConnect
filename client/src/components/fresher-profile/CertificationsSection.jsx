import { useState } from "react";

const POPULAR_CERTS = [
  { name: "AWS Certified Cloud Practitioner", org: "Amazon Web Services" },
  { name: "Meta Front-End Developer Certificate", org: "Meta / Coursera" },
  { name: "Google Data Analytics Professional", org: "Google" },
  { name: "Postman API Fundamentals Student Expert", org: "Postman" },
  { name: "Programming in Java / NPTEL", org: "IIT Kharagpur (NPTEL)" },
];

const CertificationsSection = ({ certifications = [], onChange }) => {
  const [certList, setCertList] = useState(certifications || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    name: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
    credentialUrl: "",
    certificateUrl: "",
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      name: "",
      issuingOrganization: "",
      issueDate: "",
      expiryDate: "",
      credentialId: "",
      credentialUrl: "",
      certificateUrl: "",
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = certList[index];
    setCurrentForm({
      ...item,
      issueDate: item.issueDate ? item.issueDate.split("T")[0] : "",
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = certList.filter((_, idx) => idx !== index);
    setCertList(updated);
    onChange({ certifications: updated });
  };

  const handleQuickAdd = (cert) => {
    setCurrentForm({
      ...currentForm,
      name: cert.name,
      issuingOrganization: cert.org,
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.name || !currentForm.issuingOrganization) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...certList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...certList, currentForm];
    }

    setCertList(updatedList);
    onChange({ certifications: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
            📜
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Certifications & Courses</h2>
            <p className="text-xs text-slate-500">Verified credentials from industry programs and bootcamps</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Certificate
        </button>
      </div>

      {certList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center mx-auto text-xl font-bold">
            🏅
          </div>
          <h3 className="text-sm font-bold text-slate-800">No certifications added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Certifications in AWS, React, Python, or SQL demonstrate continuous self-learning and technical focus.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition shadow-xs"
          >
            + Add Certification
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certList.map((cert, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-violet-200 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-violet-700">{cert.issuingOrganization}</span>
                  {cert.issueDate && (
                    <span className="text-[11px] text-slate-400">
                      {new Date(cert.issueDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-1.5">{cert.name}</h3>

                {cert.credentialId && (
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    ID: {cert.credentialId}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                {cert.credentialUrl ? (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1"
                  >
                    <span>🔗</span> Verify Credential ↗
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Verified</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Certification" : "Add Certification"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            {editingIndex === null && (
              <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Popular Credentials:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CERTS.map((pc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAdd(pc)}
                      className="text-[10px] px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-violet-50 hover:text-violet-700 font-medium transition"
                    >
                      + {pc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Certificate Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certified Cloud Practitioner"
                  value={currentForm.name}
                  onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Organization <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amazon Web Services / Coursera"
                  value={currentForm.issuingOrganization}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, issuingOrganization: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={currentForm.issueDate}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, issueDate: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={currentForm.expiryDate}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, expiryDate: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credential ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS-10294839"
                  value={currentForm.credentialId}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, credentialId: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credential Verification URL
                </label>
                <input
                  type="url"
                  placeholder="https://credly.com/badges/..."
                  value={currentForm.credentialUrl}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, credentialUrl: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                >
                  Save Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificationsSection;
