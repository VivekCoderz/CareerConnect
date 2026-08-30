import React, { useState, useEffect } from "react";

const JobModal = ({ isOpen, onClose, onSave, jobToEdit = null }) => {
  const [formData, setFormData] = useState({
    title: "",
    department: "Engineering",
    employmentType: "Full-time",
    workMode: "Hybrid",
    location: "Gurugram / Delhi NCR",
    salaryMin: "",
    salaryMax: "",
    currency: "INR",
    experienceLevel: "Fresher / Entry-Level",
    minYears: 0,
    maxYears: 2,
    education: "B.Tech / BCA / MCA / Any Graduate",
    description: "",
    responsibilities: "",
    requiredSkills: "",
    preferredSkills: "",
    bonusSkills: "",
    openings: 1,
    deadline: "",
    status: "Published",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title || "",
        department: jobToEdit.department || "Engineering",
        employmentType: jobToEdit.employmentType || "Full-time",
        workMode: jobToEdit.workMode || "Hybrid",
        location: jobToEdit.location || "Gurugram / Delhi NCR",
        salaryMin: jobToEdit.salaryRange?.min || "",
        salaryMax: jobToEdit.salaryRange?.max || "",
        currency: jobToEdit.salaryRange?.currency || "INR",
        experienceLevel: jobToEdit.experience?.level || "Fresher / Entry-Level",
        minYears: jobToEdit.experience?.minYears || 0,
        maxYears: jobToEdit.experience?.maxYears || 2,
        education: jobToEdit.education || "B.Tech / BCA / MCA",
        description: jobToEdit.description || "",
        responsibilities: (jobToEdit.responsibilities || []).join("\n"),
        requiredSkills: (jobToEdit.requiredSkills || []).join(", "),
        preferredSkills: (jobToEdit.preferredSkills || []).join(", "),
        bonusSkills: (jobToEdit.bonusSkills || []).join(", "),
        openings: jobToEdit.openings || 1,
        deadline: jobToEdit.deadline ? jobToEdit.deadline.split("T")[0] : "",
        status: jobToEdit.status || "Published",
      });
    } else {
      setFormData({
        title: "",
        department: "Engineering",
        employmentType: "Full-time",
        workMode: "Hybrid",
        location: "Gurugram / Delhi NCR",
        salaryMin: "",
        salaryMax: "",
        currency: "INR",
        experienceLevel: "Fresher / Entry-Level",
        minYears: 0,
        maxYears: 2,
        education: "B.Tech / BCA / MCA / Any Graduate",
        description: "",
        responsibilities: "",
        requiredSkills: "React.js, JavaScript, TailwindCSS",
        preferredSkills: "Node.js, MongoDB",
        bonusSkills: "TypeScript, Git",
        openings: 2,
        deadline: "",
        status: "Published",
      });
    }
    setError("");
  }, [jobToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError("Please fill all required fields (Title, Location, Description)");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        title: formData.title.trim(),
        department: formData.department,
        employmentType: formData.employmentType,
        workMode: formData.workMode,
        location: formData.location.trim(),
        salaryRange: {
          min: Number(formData.salaryMin) || 0,
          max: Number(formData.salaryMax) || 0,
          currency: formData.currency,
          isNegotiable: !formData.salaryMin && !formData.salaryMax,
        },
        experience: {
          level: formData.experienceLevel,
          minYears: Number(formData.minYears) || 0,
          maxYears: Number(formData.maxYears) || 2,
        },
        education: formData.education,
        description: formData.description.trim(),
        responsibilities: formData.responsibilities
          ? formData.responsibilities.split("\n").filter((r) => r.trim())
          : [],
        requiredSkills: formData.requiredSkills
          ? formData.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        preferredSkills: formData.preferredSkills
          ? formData.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        bonusSkills: formData.bonusSkills
          ? formData.bonusSkills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        openings: Number(formData.openings) || 1,
        deadline: formData.deadline || null,
        status: formData.status,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {jobToEdit ? "Edit Job Opportunity" : "Post New Job / Internship"}
            </h3>
            <p className="text-xs text-slate-500">
              Visible to verified Geeta University students & alumni
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Job Title *
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Frontend Engineer Intern / Associate Developer"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              >
                <option value="Engineering">Engineering / IT</option>
                <option value="Product & Design">Product & UI/UX Design</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Human Resources">Human Resources (HR)</option>
                <option value="Finance & Operations">Finance & Operations</option>
                <option value="Sales & Business Dev">Sales & BD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employment Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              >
                <option value="Full-time">Full-time Job</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Work Mode
              </label>
              <select
                name="workMode"
                value={formData.workMode}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location *
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Gurugram / Panipat"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Salary Min (LPA / Stipend)
              </label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="e.g. 400000"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Salary Max (LPA / Stipend)
              </label>
              <input
                type="number"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleChange}
                placeholder="e.g. 800000"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Required Skills (Comma separated - Used for smart matching) *
              </label>
              <input
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                placeholder="React.js, Node.js, SQL, TailwindCSS"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Skills
              </label>
              <input
                name="preferredSkills"
                value={formData.preferredSkills}
                onChange={handleChange}
                placeholder="Next.js, Docker, AWS"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Openings & Expiry
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  name="openings"
                  value={formData.openings}
                  onChange={handleChange}
                  min={1}
                  placeholder="Openings"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Job Description *
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the opportunity, role summary and what the candidate will work on..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15 resize-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsibilities (One per line)
              </label>
              <textarea
                name="responsibilities"
                rows={2}
                value={formData.responsibilities}
                onChange={handleChange}
                placeholder="Develop user-facing features&#10;Collaborate with cross-functional teams&#10;Write clean and tested code"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
              className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-amber-300 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                jobToEdit ? "Update Job" : "Publish Job"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;
