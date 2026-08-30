import React, { useState } from "react";

const OfferModal = ({ isOpen, onClose, onCreateOffer, application = null, jobs = [] }) => {
  const [formData, setFormData] = useState({
    designation: "Associate Software Engineer",
    department: "Engineering",
    employmentType: "Full-time",
    salary: "600000",
    salaryPeriod: "Per Annum (LPA)",
    currency: "INR (₹)",
    joiningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    location: "Gurugram / Hybrid",
    benefits: "Health Insurance, Annual Performance Bonus, Learning Allowance, Paid Time Off",
    additionalTerms: "Standard 3-month probation period applies.",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const candName = application?.candidateId?.fullName || "Candidate";
  const candId = application?.candidateId?._id || "";
  const jobId = application?.jobId?._id || jobs[0]?._id || "";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.salary || !formData.joiningDate || !formData.expiryDate) {
      setError("Please fill all required compensation and date fields");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        candidateId: candId,
        jobId,
        applicationId: application?._id || undefined,
        designation: formData.designation,
        department: formData.department,
        employmentType: formData.employmentType,
        salary: Number(formData.salary),
        salaryPeriod: formData.salaryPeriod,
        currency: formData.currency,
        joiningDate: formData.joiningDate,
        expiryDate: formData.expiryDate,
        location: formData.location,
        benefits: formData.benefits.split(",").map((b) => b.trim()).filter(Boolean),
        additionalTerms: formData.additionalTerms,
      };

      await onCreateOffer(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to generate offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in-top">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Generate Job Offer Letter</h3>
            <p className="text-xs text-slate-500">For {candName}</p>
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

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
              <input
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Offered Compensation *</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="600000"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Salary Period</label>
              <select
                name="salaryPeriod"
                value={formData.salaryPeriod}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              >
                <option value="Per Annum (LPA)">Per Annum (CTC)</option>
                <option value="Per Month">Per Month</option>
                <option value="Stipend / Month">Stipend / Month</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expected Joining Date *</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Offer Expiration Date *</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Benefits & Perks</label>
              <input
                name="benefits"
                value={formData.benefits}
                onChange={handleChange}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>
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
              {saving ? "Generating..." : "Send Formal Offer Letter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferModal;
