import { useState } from "react";

const LeadershipSection = ({ leadership = [], onChange }) => {
  const [list, setList] = useState(leadership || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    role: "",
    teamSize: 5,
    responsibilities: "",
    startDate: "",
    endDate: "",
    currentlyLeading: true,
    achievements: "",
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      role: "Engineering Team Lead",
      teamSize: 6,
      responsibilities: "",
      startDate: "",
      endDate: "",
      currentlyLeading: true,
      achievements: "",
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = list[index];
    setCurrentForm({
      ...item,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = list.filter((_, idx) => idx !== index);
    setList(updated);
    onChange({ leadership: updated });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.role) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...list];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [currentForm, ...list];
    }

    setList(updatedList);
    onChange({ leadership: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            👥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Leadership & Team Scope</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Optional for ICs
              </span>
            </div>
            <p className="text-xs text-slate-500">Mentorship, team leadership, scrum coordination, and engineering management</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Leadership Role
        </button>
      </div>

      {list.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
          <p className="text-xs text-slate-500">
            No formal leadership roles added. (Optional if you are focused strictly on individual contributor roles).
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="text-xs font-bold text-purple-600 hover:underline"
          >
            + Add Leadership or Mentorship Scope →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{item.role}</h3>
                    <span className="text-xs font-semibold text-purple-700">
                      Team Size: {item.teamSize} Engineers
                    </span>
                  </div>
                  {item.currentlyLeading && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Active Lead
                    </span>
                  )}
                </div>

                {item.responsibilities && (
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{item.responsibilities}</p>
                )}

                {item.achievements && (
                  <div className="mt-2.5 p-3 rounded-xl bg-white border border-purple-100 text-xs text-purple-950 font-medium">
                    <span className="font-bold text-purple-800 block mb-0.5">Team Milestones:</span>
                    {item.achievements}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(idx)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 transition"
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
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Leadership Role" : "Add Leadership Scope"}
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
                    Leadership Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering Lead / Tech Architect"
                    value={currentForm.role}
                    onChange={(e) => setCurrentForm({ ...currentForm, role: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Team Size</label>
                  <input
                    type="number"
                    min="1"
                    value={currentForm.teamSize}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, teamSize: Number(e.target.value) })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsibilities & Mentorship Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Running agile sprints, 1-on-1 career coaching, technical architecture reviews..."
                  value={currentForm.responsibilities}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, responsibilities: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Team Achievements
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Promoted 3 engineers to Senior rank, increased sprint velocity by 25%..."
                  value={currentForm.achievements}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, achievements: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500"
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Save Leadership Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadershipSection;
