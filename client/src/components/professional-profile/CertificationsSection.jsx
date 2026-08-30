import { useState } from "react";

const PRESET_CERTS = [
  { name: "AWS Certified Solutions Architect - Associate / Professional", org: "Amazon Web Services" },
  { name: "Certified Kubernetes Administrator (CKA)", org: "Linux Foundation & CNCF" },
  { name: "Google Cloud Professional Cloud Architect", org: "Google Cloud" },
  { name: "Microsoft Certified: Azure Solutions Architect Expert", org: "Microsoft" },
  { name: "Project Management Professional (PMP)", org: "PMI" },
  { name: "Certified ScrumMaster (CSM)", org: "Scrum Alliance" },
];

const CertificationsSection = ({ certifications = [], onChange }) => {
  const [list, setList] = useState(certifications || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    name: "",
    issuingOrganization: "",
    credentialId: "",
    issueDate: "",
    expiryDate: "",
    credentialUrl: "",
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      name: "",
      issuingOrganization: "",
      credentialId: "",
      issueDate: "",
      expiryDate: "",
      credentialUrl: "",
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = list[index];
    setCurrentForm({
      ...item,
      issueDate: item.issueDate ? item.issueDate.split("T")[0] : "",
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = list.filter((_, idx) => idx !== index);
    setList(updated);
    onChange({ certifications: updated });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.name || !currentForm.issuingOrganization) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...list];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [currentForm, ...list];
    }

    setList(updatedList);
    onChange({ certifications: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            📜
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Professional & Cloud Certifications</h2>
            <p className="text-xs text-slate-500">Verified credentials from AWS, Google Cloud, Microsoft, CNCF, and PMI</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Certification
        </button>
      </div>

      {list.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <p className="text-xs text-slate-500">No certifications recorded yet.</p>
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {PRESET_CERTS.slice(0, 3).map((pc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentForm({
                    name: pc.name,
                    issuingOrganization: pc.org,
                    credentialId: "",
                    issueDate: "",
                    expiryDate: "",
                    credentialUrl: "",
                  });
                  setShowModal(true);
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition"
              >
                + {pc.name.split("-")[0]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-200 transition flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-emerald-700">{item.issuingOrganization}</span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{item.name}</h3>

                {item.credentialId && (
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    ID: {item.credentialId}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  {item.issueDate && (
                    <span>
                      Issued: {new Date(item.issueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                  {item.expiryDate && (
                    <span>
                      Expires: {new Date(item.expiryDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50">
                {item.credentialUrl ? (
                  <a
                    href={item.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Verify Credential ↗
                  </a>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
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

            <form onSubmit={handleSaveModal} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Certification Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Certified Solutions Architect - Associate"
                  value={currentForm.name}
                  onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Organization <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amazon Web Services (AWS)"
                  value={currentForm.issuingOrganization}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, issuingOrganization: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credential ID / License Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS-PSA-104928"
                  value={currentForm.credentialId}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, credentialId: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500 font-mono text-xs"
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
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={currentForm.expiryDate}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, expiryDate: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credential Verification URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.credly.com/badges/..."
                  value={currentForm.credentialUrl}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, credentialUrl: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500"
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Save Credential
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
