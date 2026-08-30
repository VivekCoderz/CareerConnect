import { useState } from "react";

const QUALIFICATION_TYPES = [
  "B.Tech",
  "B.E.",
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
  "M.Tech",
  "MBA",
  "Diploma",
  "Other",
];

const EducationSection = ({ education = [], onChange }) => {
  const [list, setList] = useState(education || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    qualificationType: "B.Tech",
    degree: "Computer Science & Engineering",
    specialization: "Computer Science",
    institution: "",
    graduationYear: 2020,
    percentageOrCgpa: "",
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      qualificationType: "B.Tech",
      degree: "Computer Science & Engineering",
      specialization: "Software Systems",
      institution: "",
      graduationYear: 2020,
      percentageOrCgpa: "",
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    setCurrentForm({ ...list[index] });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = list.filter((_, idx) => idx !== index);
    setList(updated);
    onChange({ education: updated });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.degree || !currentForm.institution) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...list];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...list, currentForm];
    }

    setList(updatedList);
    onChange({ education: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
            🎓
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Academic Background & Degrees</h2>
            <p className="text-xs text-slate-500">Graduation and post-graduation degrees</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Degree
        </button>
      </div>

      {list.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
          <p className="text-xs text-slate-500">No education records added yet.</p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            + Add Degree Details →
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
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {item.qualificationType}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Class of {item.graduationYear}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-2">{item.degree}</h3>
                <p className="text-xs font-medium text-indigo-700 mt-0.5">{item.institution}</p>
                {item.specialization && (
                  <p className="text-[11px] text-slate-500 mt-1">Specialization: {item.specialization}</p>
                )}
                {item.percentageOrCgpa && (
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    Score / CGPA: {item.percentageOrCgpa}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(idx)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
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
                {editingIndex !== null ? "Edit Degree" : "Add Degree"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
                  <select
                    value={currentForm.qualificationType}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, qualificationType: e.target.value })
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 text-xs outline-none bg-white focus:border-indigo-500"
                  >
                    {QUALIFICATION_TYPES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    min="1970"
                    max="2035"
                    value={currentForm.graduationYear}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, graduationYear: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Program <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech in Computer Science & Engineering"
                  value={currentForm.degree}
                  onChange={(e) => setCurrentForm({ ...currentForm, degree: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution / University <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology"
                  value={currentForm.institution}
                  onChange={(e) => setCurrentForm({ ...currentForm, institution: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Systems"
                    value={currentForm.specialization}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, specialization: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CGPA / %</label>
                  <input
                    type="text"
                    placeholder="e.g. 8.8 / 10"
                    value={currentForm.percentageOrCgpa}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, percentageOrCgpa: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
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
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save Degree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationSection;
