import React, { useState, useEffect } from "react";

const JobModal = ({ isOpen, onClose, onSave, jobToEdit = null }) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "Web Development",
    subCategory: "Frontend Development",
    department: "Engineering",
    employmentType: "Internship",
    workMode: "Remote",
    location: "Bangalore",
    city: "Bangalore",
    country: "India",
    isPaid: true,
    hasJobOffer: true,
    isInternational: false,
    salaryMin: "25000",
    salaryMax: "25000",
    currency: "INR",
    experienceLevel: "Fresher / Entry-Level",
    minYears: 0,
    maxYears: 1,
    education: "B.Tech / BCA / MCA / Any Graduate",
    description: "",
    responsibilities: "",
    requiredSkills: "React, JavaScript, Tailwind CSS",
    preferredSkills: "Redux, TypeScript",
    bonusSkills: "Next.js, Git",
    openings: 2,
    deadline: "",
    status: "Published",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title || "",
        category: jobToEdit.category || "Web Development",
        subCategory: jobToEdit.subCategory || "Frontend Development",
        department: jobToEdit.department || "Engineering",
        employmentType: jobToEdit.employmentType || "Internship",
        workMode: jobToEdit.workMode || "Remote",
        location: jobToEdit.location || "Bangalore",
        city: jobToEdit.city || "Bangalore",
        country: jobToEdit.country || "India",
        isPaid: jobToEdit.isPaid !== false,
        hasJobOffer: !!jobToEdit.hasJobOffer,
        isInternational: !!jobToEdit.isInternational,
        salaryMin: jobToEdit.salaryRange?.min || "",
        salaryMax: jobToEdit.salaryRange?.max || "",
        currency: jobToEdit.salaryRange?.currency || "INR",
        experienceLevel: jobToEdit.experience?.level || "Fresher / Entry-Level",
        minYears: jobToEdit.experience?.minYears || 0,
        maxYears: jobToEdit.experience?.maxYears || 1,
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
        category: "Web Development",
        subCategory: "Frontend Development",
        department: "Engineering",
        employmentType: "Internship",
        workMode: "Remote",
        location: "Bangalore",
        city: "Bangalore",
        country: "India",
        isPaid: true,
        hasJobOffer: true,
        isInternational: false,
        salaryMin: "25000",
        salaryMax: "25000",
        currency: "INR",
        experienceLevel: "Fresher / Entry-Level",
        minYears: 0,
        maxYears: 1,
        education: "B.Tech / BCA / MCA / Any Graduate",
        description: "",
        responsibilities: "",
        requiredSkills: "React, JavaScript, Tailwind CSS",
        preferredSkills: "Redux, TypeScript",
        bonusSkills: "Next.js, Git",
        openings: 2,
        deadline: "",
        status: "Published",
      });
    }
    setError("");
  }, [jobToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
        category: formData.category,
        subCategory: formData.subCategory,
        department: formData.department,
        employmentType: formData.employmentType,
        workMode: formData.workMode,
        location: formData.location.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        isPaid: formData.isPaid,
        hasJobOffer: formData.hasJobOffer,
        isInternational: formData.isInternational,
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
              {jobToEdit ? "Edit Opportunity" : "Post Job / Internship Opportunity"}
            </h3>
            <p className="text-xs text-slate-500">
              Auto-discoverable in Category & City Discovery Hubs
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
                Opportunity Title *
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. React Developer Intern / Associate Software Engineer"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b] focus:ring-3 focus:ring-[#f59e0b]/15"
                required
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Web Development">Web Development</option>
                <option value="App Development">App Development (Mobile)</option>
                <option value="Software Development">Software Development</option>
                <option value="Data Science">Data Science & AI</option>
                <option value="Machine Learning">Machine Learning / Deep Learning</option>
                <option value="UI/UX Design">UI/UX Design & Product</option>
                <option value="Digital Marketing">Digital Marketing & SEO</option>
                <option value="Content Writing">Content Writing & Copy</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="HR">Human Resources (HR)</option>
                <option value="Finance">Finance & Accounting</option>
                <option value="Sales">Sales & Business Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opportunity Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Internship">Internship</option>
                <option value="Full-time">Full-time Job</option>
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
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Remote">Work From Home (Remote)</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary City *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi / NCR</option>
                <option value="Gurugram">Gurugram</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Panipat">Panipat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Location String *
              </label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Bangalore / Remote"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stipend / Salary Min (₹)
              </label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="25000"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>

            {/* Special Badges (Paid, Job Offer) */}
            <div className="sm:col-span-2 flex items-center gap-6 pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={formData.isPaid}
                  onChange={handleChange}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>💰 Paid Stipend</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="hasJobOffer"
                  checked={formData.hasJobOffer}
                  onChange={handleChange}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span>🎯 Pre-Placement Job Offer (PPO)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isInternational"
                  checked={formData.isInternational}
                  onChange={handleChange}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>🌍 International</span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Required Skills (Comma separated - tags categories automatically) *
              </label>
              <input
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                placeholder="React, JavaScript, Tailwind CSS, Node.js"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
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
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b] resize-none"
                required
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
                jobToEdit ? "Update Opportunity" : "Publish Opportunity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;
