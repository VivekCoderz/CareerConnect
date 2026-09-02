import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const emptyEducation = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  currentlyStudying: false,
  grade: "",
  description: "",
};

const EducationSection = ({ education = [], setProfile }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyEducation);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.institution || !form.degree) {
      alert("Institution and degree are required");
      return;
    }

    try {
      setSaving(true);
      let updatedEducation;

      if (editingId) {
        updatedEducation = education.map((item) =>
          item._id === editingId ? { ...form, _id: editingId } : item
        );
      } else {
        updatedEducation = [...education, form];
      }

      const response = await updateStudentProfile({
        education: updatedEducation,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      setForm(emptyEducation);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save education");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      institution: item.institution || "",
      degree: item.degree || "",
      fieldOfStudy: item.fieldOfStudy || "",
      startYear: item.startYear || "",
      endYear: item.endYear || "",
      currentlyStudying: item.currentlyStudying || false,
      grade: item.grade || "",
      description: item.description || "",
    });

    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this education record?")) return;

    try {
      const updatedEducation = education.filter((item) => item._id !== id);
      const response = await updateStudentProfile({
        education: updatedEducation,
      });
      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete education");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Education Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">Degrees, college programs, and academic records</p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyEducation);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            + Add Education
          </button>
        )}
      </div>

      {/* Form modal/inline */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? "Edit Education Record" : "Add Education Record"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">College / University *</label>
              <input
                name="institution"
                placeholder="e.g. Geeta University"
                value={form.institution}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Degree *</label>
              <input
                name="degree"
                placeholder="e.g. B.Tech"
                value={form.degree}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study / Branch</label>
              <input
                name="fieldOfStudy"
                placeholder="e.g. Computer Science"
                value={form.fieldOfStudy}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / CGPA</label>
              <input
                name="grade"
                placeholder="e.g. 8.5 CGPA or 85%"
                value={form.grade}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Year</label>
              <input
                type="number"
                name="startYear"
                placeholder="2024"
                value={form.startYear}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End / Graduation Year</label>
              <input
                type="number"
                name="endYear"
                placeholder="2028"
                value={form.endYear}
                onChange={handleChange}
                disabled={form.currentlyStudying}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              name="currentlyStudying"
              checked={form.currentlyStudying}
              onChange={handleChange}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            Currently Studying Here
          </label>

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
              {saving ? "Saving..." : "Save Education"}
            </button>
          </div>
        </form>
      )}

      {/* Cards list */}
      <div className="space-y-3">
        {education && education.length > 0 ? (
          education.map((item) => (
            <div
              key={item._id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{item.degree}</h3>
                  {item.fieldOfStudy && (
                    <span className="text-xs text-slate-500 font-medium">• {item.fieldOfStudy}</span>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">{item.institution}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>
                    {item.startYear || "----"} - {item.currentlyStudying ? "Present" : item.endYear || "----"}
                  </span>
                  {item.grade && (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                      Score: {item.grade}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item._id)}
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
              <p className="text-xs text-slate-500">No education details added yet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default EducationSection;