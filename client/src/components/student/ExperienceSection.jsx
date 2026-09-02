import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const emptyExperience = {
  organization: "",
  role: "",
  experienceType: "internship",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  description: "",
  skillsUsed: [],
};

const ExperienceSection = ({
  experience = [],
  setProfile,
}) => {
  const [form, setForm] = useState(emptyExperience);
  const [skillInput, setSkillInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;
    if (form.skillsUsed.includes(skill)) return;

    setForm({
      ...form,
      skillsUsed: [...form.skillsUsed, skill],
    });
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setForm({
      ...form,
      skillsUsed: form.skillsUsed.filter((item) => item !== skill),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = editingId
        ? experience.map((item) =>
            item._id === editingId ? { ...form, _id: editingId } : item
          )
        : [...experience, form];

      const response = await updateStudentProfile({
        experience: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      setForm(emptyExperience);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert("Failed to save experience");
    } finally {
      setSaving(false);
    }
  };

  const editExperience = (item) => {
    setForm({
      organization: item.organization || "",
      role: item.role || "",
      experienceType: item.experienceType || "internship",
      startDate: item.startDate ? item.startDate.substring(0, 10) : "",
      endDate: item.endDate ? item.endDate.substring(0, 10) : "",
      currentlyWorking: item.currentlyWorking || false,
      description: item.description || "",
      skillsUsed: item.skillsUsed || [],
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  const deleteExperience = async (id) => {
    if (!window.confirm("Delete this experience?")) return;

    try {
      const updated = experience.filter((item) => item._id !== id);
      const response = await updateStudentProfile({
        experience: updated,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert("Failed to delete experience");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Work Experience & Internships</h2>
          <p className="text-xs text-slate-500 mt-0.5">Past internships, student roles, freelance, and research</p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyExperience);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            + Add Experience
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? "Edit Experience" : "Add Experience"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization *</label>
              <input
                name="organization"
                placeholder="e.g. Google, TechCorp"
                value={form.organization}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation *</label>
              <input
                name="role"
                placeholder="e.g. Frontend Intern"
                value={form.role}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Type</label>
              <select
                name="experienceType"
                value={form.experienceType}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              >
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
                <option value="volunteer">Volunteer</option>
                <option value="research">Research</option>
                <option value="part-time">Part Time</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                disabled={form.currentlyWorking}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none disabled:bg-slate-100"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="currentlyWorking"
                  checked={form.currentlyWorking}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                Currently Working Here
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                name="description"
                placeholder="What responsibilities and impact did you drive?"
                rows={3}
                value={form.description}
                onChange={handleChange}
                className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Skills Used</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g. React, MongoDB"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 h-10 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-6">
                {form.skillsUsed.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 shadow-2xs"
                  >
                    {sk}
                    <button
                      type="button"
                      onClick={() => removeSkill(sk)}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
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
              {saving ? "Saving..." : "Save Experience"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {experience && experience.length > 0 ? (
          experience.map((item) => (
            <div
              key={item._id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{item.role}</h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {item.experienceType}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">{item.organization}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {item.startDate ? new Date(item.startDate).toLocaleDateString() : ""} -{" "}
                  {item.currentlyWorking ? "Present" : item.endDate ? new Date(item.endDate).toLocaleDateString() : ""}
                </p>
                {item.description && (
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.description}</p>
                )}

                {item.skillsUsed && item.skillsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {item.skillsUsed.map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => editExperience(item)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteExperience(item._id)}
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
              <p className="text-xs text-slate-500">No work experience added yet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default ExperienceSection;