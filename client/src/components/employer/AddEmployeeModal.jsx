import React, { useState } from "react";

const AddEmployeeModal = ({ isOpen, onClose, onAdd, departments = [] }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    designation: "Frontend Engineer",
    department: departments[0]?.name || "Engineering",
    team: "Core Team",
    roleInCompany: "Employee",
    skills: "React.js, JavaScript, TailwindCSS",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.designation.trim()) {
      setError("Please fill name, email and designation");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onAdd(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-slide-in-top">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add Team Employee</h3>
            <p className="text-xs text-slate-500">Add staff member to your company roster</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Vikas Bansal"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Work Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="vikas@company.com"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
              <input
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Software Engineer"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Current Competencies / Skills</label>
            <input
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="React.js, Node.js, SQL"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
            >
              {saving ? "Adding..." : "Add to Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
