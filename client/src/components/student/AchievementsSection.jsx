import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const emptyAchievement = {
  title: "",
  description: "",
  organization: "",
  date: "",
  proofUrl: "",
};

const AchievementsSection = ({
  achievements = [],
  setProfile,
}) => {
  const [form, setForm] = useState(emptyAchievement);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = editingId
        ? achievements.map((item) =>
            item._id === editingId ? { ...form, _id: editingId } : item
          )
        : [...achievements, form];

      const response = await updateStudentProfile({
        achievements: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      setForm(emptyAchievement);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert("Failed to save achievement");
    } finally {
      setSaving(false);
    }
  };

  const editAchievement = (item) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      organization: item.organization || "",
      date: item.date ? item.date.substring(0, 10) : "",
      proofUrl: item.proofUrl || "",
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  const deleteAchievement = async (id) => {
    if (!window.confirm("Delete this achievement?")) return;

    try {
      const updated = achievements.filter((item) => item._id !== id);
      const response = await updateStudentProfile({
        achievements: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert("Failed to delete achievement");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Honors & Achievements</h2>
          <p className="text-xs text-slate-500 mt-0.5">Hackathons, awards, coding competitions, and academic milestones</p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyAchievement);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            + Add Achievement
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? "Edit Achievement" : "Add Achievement"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement Title *</label>
              <input
                name="title"
                placeholder="e.g. 1st Place at National Hackathon"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Event</label>
              <input
                name="organization"
                placeholder="e.g. Geeta University, Smart India Hackathon"
                value={form.organization}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proof URL (Optional)</label>
              <input
                name="proofUrl"
                placeholder="https://..."
                value={form.proofUrl}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                name="description"
                placeholder="Describe what you built or achieved..."
                rows={3}
                value={form.description}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {saving ? "Saving..." : "Save Achievement"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {achievements && achievements.length > 0 ? (
          achievements.map((item) => (
            <div
              key={item._id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                {item.organization && (
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">{item.organization}</p>
                )}
                {item.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  {item.date && <span>Date: {new Date(item.date).toLocaleDateString()}</span>}
                  {item.proofUrl && (
                    <a
                      href={item.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      View Proof ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => editAchievement(item)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteAchievement(item._id)}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 text-xs font-semibold rounded-xl transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          !showForm && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500">No achievements recorded yet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default AchievementsSection;