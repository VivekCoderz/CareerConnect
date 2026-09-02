import { useState } from "react";

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const INTERNSHIP_TYPES = ["Technical", "Non-Technical", "Research", "Graduate Trainee"];

const InternshipsSection = ({ internships = [], onChange }) => {
  const [internshipList, setInternshipList] = useState(internships || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    companyName: "",
    role: "",
    internshipType: "Technical",
    startDate: "",
    endDate: "",
    currentlyWorking: false,
    location: "Bangalore",
    workMode: "Remote",
    description: "",
    technologiesUsed: [],
    responsibilities: "",
    achievements: "",
    certificateUrl: "",
  });

  const [techInput, setTechInput] = useState("");

  const handleOpenAdd = () => {
    setCurrentForm({
      companyName: "",
      role: "",
      internshipType: "Technical",
      startDate: "",
      endDate: "",
      currentlyWorking: false,
      location: "",
      workMode: "Remote",
      description: "",
      technologiesUsed: [],
      responsibilities: "",
      achievements: "",
      certificateUrl: "",
    });
    setEditingIndex(null);
    setTechInput("");
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = internshipList[index];
    setCurrentForm({
      ...item,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setTechInput("");
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = internshipList.filter((_, idx) => idx !== index);
    setInternshipList(updated);
    onChange({ internships: updated });
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;
    if (currentForm.technologiesUsed?.includes(techInput.trim())) return;
    setCurrentForm({
      ...currentForm,
      technologiesUsed: [...(currentForm.technologiesUsed || []), techInput.trim()],
    });
    setTechInput("");
  };

  const handleRemoveTech = (tToRemove) => {
    setCurrentForm({
      ...currentForm,
      technologiesUsed: (currentForm.technologiesUsed || []).filter((t) => t !== tToRemove),
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.companyName || !currentForm.role) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...internshipList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...internshipList, currentForm];
    }

    setInternshipList(updatedList);
    onChange({ internships: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Internship & Practical Experience</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                Optional
              </span>
            </div>
            <p className="text-xs text-slate-500">Prior internships, apprenticeships, or industrial training</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Internship
        </button>
      </div>

      {/* Internships List */}
      {internshipList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto text-xl font-bold">
            💼
          </div>
          <h3 className="text-sm font-bold text-slate-800">No internship experience added yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            As a fresher, internships are great but not mandatory. Your projects, skills, and certifications still qualify you for 100% profile completion.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition shadow-xs"
          >
            + Add Internship Experience
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {internshipList.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-cyan-200 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                      {item.internshipType || "Technical"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold">
                      {item.workMode || "Remote"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{item.role}</h3>
                  <p className="text-xs font-bold text-cyan-700 mt-0.5">{item.companyName}</p>
                  {item.location && (
                    <p className="text-[11px] text-slate-500 mt-0.5">📍 {item.location}</p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-semibold text-slate-600">
                    {item.startDate ? item.startDate.split("T")[0] : "Start"} —{" "}
                    {item.currentlyWorking
                      ? "Present"
                      : item.endDate
                      ? item.endDate.split("T")[0]
                      : "End"}
                  </span>
                </div>
              </div>

              {item.description && (
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{item.description}</p>
              )}

              {/* Technologies */}
              {item.technologiesUsed && item.technologiesUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.technologiesUsed.map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Certificate URL */}
              {item.certificateUrl && (
                <a
                  href={item.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-800 mt-3"
                >
                  <span>📜</span> View Completion Certificate ↗
                </a>
              )}

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(idx)}
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 transition px-2 py-1"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Internship Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Internship" : "Add Internship"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infosys, TCS, or Startup Name"
                    value={currentForm.companyName}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, companyName: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internship Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Developer Intern"
                    value={currentForm.role}
                    onChange={(e) => setCurrentForm({ ...currentForm, role: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internship Type
                  </label>
                  <select
                    value={currentForm.internshipType}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, internshipType: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-cyan-500"
                  >
                    {INTERNSHIP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={currentForm.workMode}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, workMode: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-cyan-500"
                  >
                    {WORK_MODES.map((wm) => (
                      <option key={wm} value={wm}>
                        {wm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={currentForm.startDate}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, startDate: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={currentForm.currentlyWorking}
                    value={currentForm.endDate}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, endDate: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentForm.currentlyWorking}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, currentlyWorking: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>Currently doing this internship</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Responsibilities & Highlights
                </label>
                <textarea
                  rows={3}
                  placeholder="Built customer-facing React components, optimized bundle size by 25%, collaborated in Agile sprints..."
                  value={currentForm.description}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, description: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-cyan-500"
                />
              </div>

              {/* Technologies Tag Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technologies Used
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. React, Node.js, Git"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(currentForm.technologiesUsed || []).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-xs font-semibold border border-cyan-100 flex items-center gap-1"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(t)}
                        className="text-cyan-600 hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Certificate Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or credential link"
                  value={currentForm.certificateUrl}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, certificateUrl: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-cyan-500"
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
                >
                  Save Internship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipsSection;
