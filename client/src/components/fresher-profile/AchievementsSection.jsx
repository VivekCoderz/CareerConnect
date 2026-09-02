import { useState } from "react";

const CATEGORIES = [
  "Hackathon",
  "Coding Competition",
  "Academic Award",
  "Scholarship",
  "Open Source Contribution",
  "Competition",
  "Leadership",
  "Publication",
  "Other",
];

const AchievementsSection = ({ achievements = [], onChange }) => {
  const [achieveList, setAchieveList] = useState(achievements || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    title: "",
    organization: "",
    category: "Hackathon",
    date: "",
    description: "",
    achievementUrl: "",
  });

  const handleOpenAdd = () => {
    setCurrentForm({
      title: "",
      organization: "",
      category: "Hackathon",
      date: "",
      description: "",
      achievementUrl: "",
    });
    setEditingIndex(null);
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = achieveList[index];
    setCurrentForm({
      ...item,
      date: item.date ? item.date.split("T")[0] : "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = achieveList.filter((_, idx) => idx !== index);
    setAchieveList(updated);
    onChange({ achievements: updated });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.title) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...achieveList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...achieveList, currentForm];
    }

    setAchieveList(updatedList);
    onChange({ achievements: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            🏆
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Honors & Achievements</h2>
            <p className="text-xs text-slate-500">Hackathon wins, coding contest ranks, and competitive milestones</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Achievement
        </button>
      </div>

      {achieveList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
            🥇
          </div>
          <h3 className="text-sm font-bold text-slate-800">No achievements added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Highlight hackathon rankings, competitive programming badges, scholarships, or college leadership awards.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
          >
            + Add First Achievement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achieveList.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-amber-200 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    {item.category || "Hackathon"}
                  </span>
                  {item.date && (
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{item.title}</h3>
                {item.organization && (
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">{item.organization}</p>
                )}

                {item.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                {item.achievementUrl ? (
                  <a
                    href={item.achievementUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <span>🔗</span> Proof Link ↗
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Verified</span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition"
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
                {editingIndex !== null ? "Edit Achievement" : "Add Achievement"}
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
                  Achievement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winner — Smart India Hackathon 2024"
                  value={currentForm.title}
                  onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={currentForm.category}
                    onChange={(e) => setCurrentForm({ ...currentForm, category: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-amber-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={currentForm.date}
                    onChange={(e) => setCurrentForm({ ...currentForm, date: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issuing Organization / Event Host
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ministry of Education / IIT Bombay"
                  value={currentForm.organization}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, organization: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Impact
                </label>
                <textarea
                  rows={3}
                  placeholder="Built an automated flood rescue coordination system competing against 500+ national teams..."
                  value={currentForm.description}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, description: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof URL / Certificate / Article Link
                </label>
                <input
                  type="url"
                  placeholder="https://devpost.com/... or linkedin post"
                  value={currentForm.achievementUrl}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, achievementUrl: e.target.value })
                  }
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-500"
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  Save Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsSection;
