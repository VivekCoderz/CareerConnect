import { useState } from "react";

const QUALIFICATION_TYPES = [
  "B.Tech",
  "B.E.",
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
  "Diploma",
  "12th",
  "10th",
  "Other",
];

const EducationSection = ({ education = [], onChange }) => {
  const [eduList, setEduList] = useState(education || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    qualificationType: "B.Tech",
    degree: "",
    specialization: "",
    institution: "",
    university: "",
    graduationYear: new Date().getFullYear(),
    percentageOrCgpa: "",
    academicGrade: "",
    backlogs: 0,
    academicAchievements: "",
    isHighest: false,
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      qualificationType: "B.Tech",
      degree: "",
      specialization: "",
      institution: "",
      university: "",
      graduationYear: new Date().getFullYear(),
      percentageOrCgpa: "",
      academicGrade: "",
      backlogs: 0,
      academicAchievements: "",
      isHighest: eduList.length === 0,
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    setCurrentForm({ ...eduList[index] });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = eduList.filter((_, idx) => idx !== index);
    setEduList(updated);
    onChange({ education: updated });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.degree || !currentForm.institution) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...eduList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...eduList, currentForm];
    }

    // If marked as highest, ensure only one has isHighest=true
    if (currentForm.isHighest) {
      const activeIdx = editingIndex !== null ? editingIndex : updatedList.length - 1;
      updatedList = updatedList.map((item, idx) => ({
        ...item,
        isHighest: idx === activeIdx,
      }));
    }

    setEduList(updatedList);
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
            <h2 className="text-lg font-bold text-slate-900">Educational Qualification</h2>
            <p className="text-xs text-slate-500">Completed degrees, college, and academic achievements</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Qualification
        </button>
      </div>

      {/* Education List Cards */}
      {eduList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
            🎓
          </div>
          <h3 className="text-sm font-bold text-slate-800">No educational details added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add your undergraduate, graduate, or school qualifications so recruiters can verify your eligibility.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
          >
            Add Highest Qualification
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {eduList.map((edu, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all ${
                edu.isHighest
                  ? "bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white border-indigo-200 shadow-xs"
                  : "bg-slate-50/70 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                      {edu.qualificationType}
                    </span>
                    {edu.isHighest && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ⭐ Highest Qualification
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{edu.degree}</h3>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{edu.institution}</p>
                  {edu.university && (
                    <p className="text-[11px] text-slate-500">{edu.university}</p>
                  )}
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-100">
                    Class of {edu.graduationYear || "2024"}
                  </span>
                  {edu.percentageOrCgpa && (
                    <span className="text-[11px] font-semibold text-slate-600">
                      Score: {edu.percentageOrCgpa}
                    </span>
                  )}
                </div>
              </div>

              {edu.academicAchievements && (
                <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/60 leading-relaxed">
                  <span className="font-semibold text-slate-700">Highlights:</span> {edu.academicAchievements}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-200/40">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(idx)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition px-2 py-1"
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

      {/* Add / Edit Qualification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Qualification" : "Add Qualification"}
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
                    Qualification Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={currentForm.qualificationType}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, qualificationType: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-indigo-500"
                  >
                    {QUALIFICATION_TYPES.map((qt) => (
                      <option key={qt} value={qt}>
                        {qt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Passing / Graduation Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1970}
                    max={2035}
                    required
                    value={currentForm.graduationYear}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, graduationYear: Number(e.target.value) })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Certificate Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech Computer Science & Engineering"
                  value={currentForm.degree}
                  onChange={(e) => setCurrentForm({ ...currentForm, degree: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College / Institution <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology"
                  value={currentForm.institution}
                  onChange={(e) => setCurrentForm({ ...currentForm, institution: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    University / Board Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Technical University / CBSE"
                    value={currentForm.university}
                    onChange={(e) => setCurrentForm({ ...currentForm, university: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Percentage / CGPA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8.4 CGPA or 82%"
                    value={currentForm.percentageOrCgpa}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, percentageOrCgpa: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Achievements / Specializations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dean's List, Department Rank 3, Specialized in Cloud Architecture"
                  value={currentForm.academicAchievements}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, academicAchievements: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={currentForm.isHighest}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, isHighest: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Mark as My Highest Educational Qualification</span>
              </label>

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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Save Qualification
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
