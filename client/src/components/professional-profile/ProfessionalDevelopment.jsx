import { useState } from "react";

const TYPES = ["Course", "Workshop", "Conference", "Bootcamp", "Executive Training", "Learning Goal"];

const ProfessionalDevelopment = ({ professionalDevelopment = [], onChange }) => {
  const [list, setList] = useState(professionalDevelopment || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    title: "",
    type: "Course",
    providerOrHost: "",
    completionDate: "",
    skillsGained: [],
  });

  const [skillInput, setSkillInput] = useState("");

  const handleOpenAdd = () => {
    setCurrentForm({
      title: "",
      type: "Course",
      providerOrHost: "",
      completionDate: "",
      skillsGained: [],
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = list[index];
    setCurrentForm({
      ...item,
      completionDate: item.completionDate ? item.completionDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = list.filter((_, idx) => idx !== index);
    setList(updated);
    onChange({ professionalDevelopment: updated });
  };

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    setCurrentForm({
      ...currentForm,
      skillsGained: [...(currentForm.skillsGained || []), skillInput.trim()],
    });
    setSkillInput("");
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.title) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...list];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [currentForm, ...list];
    }

    setList(updatedList);
    onChange({ professionalDevelopment: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg">
            📚
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Professional Development & Continuous Learning</h2>
            <p className="text-xs text-slate-500">Executive workshops, advanced architecture bootcamps, and technical conferences</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Program
        </button>
      </div>

      {list.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
          <p className="text-xs text-slate-500">
            No continuous learning records added yet. Add courses, system design masterclasses, or tech conferences.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="text-xs font-bold text-cyan-700 hover:underline"
          >
            + Add Learning Goal or Workshop →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    {item.type}
                  </span>
                  {item.completionDate && (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(item.completionDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-2">{item.title}</h3>
                {item.providerOrHost && (
                  <p className="text-xs font-semibold text-cyan-700 mt-0.5">{item.providerOrHost}</p>
                )}

                {item.skillsGained && item.skillsGained.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {item.skillsGained.map((sk, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded border border-slate-200"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(idx)}
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
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
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingIndex !== null ? "Edit Learning Record" : "Add Professional Development"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title / Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems & High Scale Architecture"
                  value={currentForm.title}
                  onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={currentForm.type}
                    onChange={(e) => setCurrentForm({ ...currentForm, type: e.target.value })}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs outline-none bg-white focus:border-cyan-500"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provider / Host</label>
                  <input
                    type="text"
                    placeholder="e.g. O'Reilly, AWS Summit"
                    value={currentForm.providerOrHost}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, providerOrHost: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={currentForm.completionDate}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, completionDate: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDevelopment;
