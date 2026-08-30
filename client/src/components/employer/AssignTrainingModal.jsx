import React, { useState } from "react";

const AssignTrainingModal = ({ isOpen, onClose, onAssign, courses = [], employees = [], preselectedCourse = null }) => {
  const [formData, setFormData] = useState({
    courseId: preselectedCourse?._id || courses[0]?._id || "",
    assignedToType: "Employee",
    employeeId: employees[0]?._id || "",
    departmentName: "Engineering",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
    if (!formData.courseId || !formData.deadline) {
      setError("Please select course and deadline");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onAssign(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to assign course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-slide-in-top">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assign LMS Training Course</h3>
            <p className="text-xs text-slate-500">Upskill team with Geeta University curriculum</p>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Select LMS Course *</label>
            <select
              name="courseId"
              value={formData.courseId}
              onChange={handleChange}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.duration} {c.durationUnit})
                </option>
              ))}
              {courses.length === 0 && (
                <option value="default">Full Stack Modern React & Node.js Masterclass</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assign Target</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, assignedToType: "Employee" })}
                className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                  formData.assignedToType === "Employee"
                    ? "bg-[#92400e] text-white border-[#92400e]"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                Individual Employee
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, assignedToType: "Department" })}
                className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                  formData.assignedToType === "Department"
                    ? "bg-[#92400e] text-white border-[#92400e]"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                Entire Department
              </button>
            </div>

            {formData.assignedToType === "Employee" ? (
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.fullName} ({e.designation} · {e.department})
                  </option>
                ))}
              </select>
            ) : (
              <select
                name="departmentName"
                value={formData.departmentName}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Engineering">Engineering (All staff)</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Completion Deadline *</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              required
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              {saving ? "Assigning..." : "Assign Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignTrainingModal;
