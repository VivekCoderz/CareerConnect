import React, { useState, useEffect } from "react";

// Every field starts blank: the employer fills the offer in. Role, location and CTC come
// from the job; the letterhead and signatory organisation are the employer's company.
const EMPTY_OFFER = {
  candidateId: "",
  jobId: "",
  designation: "",
  department: "",
  employmentType: "",
  workLocationType: "",
  location: "",
  reportingManager: "",
  probationPeriod: "",
  noticePeriod: "",
  salary: "",
  baseSalary: "",
  allowances: "",
  variableBonus: "",
  stockOptions: "",
  salaryPeriod: "Per Annum (LPA)",
  currency: "INR (₹)",
  joiningDate: "",
  expiryDate: "",
  benefits: "",
  additionalTerms: "",
  signatoryName: "",
  signatoryTitle: "",
  signatoryOrganization: "",
};

const DEPARTMENTS = [
  "Engineering",
  "Product & Design",
  "Data Science & AI",
  "Marketing & Growth",
  "Sales & Business Dev",
  "Human Resources",
  "Operations & Support",
];

// Fields an offer takes from its job (only what the employer entered on the job).
const fromJob = (job) => {
  if (!job || typeof job !== "object") return {};
  const { min = 0, max = 0 } = job.salaryRange || {};
  return {
    designation: job.title || "",
    department: job.department || "",
    employmentType: job.employmentType || "",
    workLocationType: job.workMode || "",
    location: job.location || [job.city, job.state].filter(Boolean).join(", "),
    salary: max || min || "",
  };
};

const toDateInput = (value) => (value ? new Date(value).toISOString().split("T")[0] : "");
const withExtraOption = (options, value) => (value && !options.includes(value) ? [...options, value] : options);

const OfferModal = ({
  isOpen,
  onClose,
  onCreateOffer,
  onUpdateOffer,
  offerToEdit = null,
  application = null,
  jobs = [],
  companyName = "",
}) => {
  const isEditing = Boolean(offerToEdit);

  const [activeTab, setActiveTab] = useState("role"); // role | compensation | terms | signatory
  const [formData, setFormData] = useState(() => ({ ...EMPTY_OFFER, signatoryOrganization: companyName }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (offerToEdit) {
      setFormData({
        ...EMPTY_OFFER,
        candidateId: offerToEdit.candidateId?._id || offerToEdit.candidateId || "",
        jobId: offerToEdit.jobId?._id || offerToEdit.jobId || "",
        designation: offerToEdit.designation || "",
        department: offerToEdit.department || "",
        employmentType: offerToEdit.employmentType || "",
        workLocationType: offerToEdit.workLocationType || "",
        location: offerToEdit.location || "",
        reportingManager: offerToEdit.reportingManager || "",
        probationPeriod: offerToEdit.probationPeriod || "",
        noticePeriod: offerToEdit.noticePeriod || "",
        salary: offerToEdit.salary || "",
        baseSalary: offerToEdit.baseSalary || "",
        allowances: offerToEdit.allowances || "",
        variableBonus: offerToEdit.variableBonus || "",
        stockOptions: offerToEdit.stockOptions || "",
        salaryPeriod: offerToEdit.salaryPeriod || EMPTY_OFFER.salaryPeriod,
        currency: offerToEdit.currency || EMPTY_OFFER.currency,
        joiningDate: toDateInput(offerToEdit.joiningDate),
        expiryDate: toDateInput(offerToEdit.expiryDate),
        benefits: Array.isArray(offerToEdit.benefits)
          ? offerToEdit.benefits.join(", ")
          : offerToEdit.benefits || "",
        additionalTerms: offerToEdit.additionalTerms || "",
        signatoryName: offerToEdit.signatoryName || "",
        signatoryTitle: offerToEdit.signatoryTitle || "",
        signatoryOrganization: offerToEdit.signatoryOrganization || companyName,
      });
    } else if (application) {
      const candidateId =
        application.candidateId?._id ||
        application.candidateId ||
        application.candidate?._id ||
        application.candidate ||
        (application.fullName ? application._id : "");
      const jobId = application.jobId?._id || application.jobId || "";
      const internshipId = application.internshipId?._id || application.internshipId || "";
      // The application may carry only the job id; the full job is in the employer's job list.
      const job = jobs.find((j) => String(j._id) === String(jobId)) ||
        (typeof application.jobId === "object" ? application.jobId : null) ||
        (typeof application.internshipId === "object" ? application.internshipId : null);
      setFormData((prev) => ({
        ...prev,
        ...fromJob(job),
        candidateId,
        jobId,
        internshipId,
        signatoryOrganization: prev.signatoryOrganization || companyName,
      }));
    } else if (jobs.length > 0) {
      setFormData((prev) => (prev.jobId
        ? { ...prev, signatoryOrganization: prev.signatoryOrganization || companyName }
        : { ...prev, ...fromJob(jobs[0]), jobId: jobs[0]._id, signatoryOrganization: prev.signatoryOrganization || companyName }));
    }
  }, [offerToEdit, application, jobs, companyName]);

  if (!isOpen) return null;

  const candName =
    offerToEdit?.candidateId?.fullName ||
    application?.candidateId?.fullName ||
    application?.candidate?.fullName ||
    application?.fullName ||
    "Selected Candidate";

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "salary") {
      // Suggest a 70/20/10 split as the employer types; they can change each part.
      const num = value === "" ? "" : Number(value);
      setFormData((prev) => ({
        ...prev,
        salary: num,
        baseSalary: num === "" ? "" : Math.round(num * 0.7),
        allowances: num === "" ? "" : Math.round(num * 0.2),
        variableBonus: num === "" ? "" : Math.round(num * 0.1),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomBreakdown = (name, val) => {
    setFormData((prev) => ({ ...prev, [name]: val === "" ? "" : Number(val) }));
  };

  const handleSubmitWithStatus = async (targetStatus) => {
    if (!formData.designation.trim()) {
      setActiveTab("role");
      setError("Please enter the position / designation.");
      return;
    }
    if (!Number(formData.salary) || !formData.joiningDate || !formData.expiryDate) {
      setError("Please provide Compensation, Joining Date, and Expiry Date.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        candidateId: formData.candidateId || application?.candidateId?._id || candName,
        jobId: formData.jobId || application?.jobId?._id || jobs[0]?._id,
        applicationId: application?._id || offerToEdit?.applicationId || undefined,
        designation: formData.designation,
        department: formData.department,
        employmentType: formData.employmentType,
        workLocationType: formData.workLocationType,
        location: formData.location,
        reportingManager: formData.reportingManager,
        probationPeriod: formData.probationPeriod,
        noticePeriod: formData.noticePeriod,
        salary: Number(formData.salary),
        baseSalary: Number(formData.baseSalary),
        allowances: Number(formData.allowances),
        variableBonus: Number(formData.variableBonus),
        stockOptions: formData.stockOptions,
        salaryPeriod: formData.salaryPeriod,
        currency: formData.currency,
        joiningDate: formData.joiningDate,
        expiryDate: formData.expiryDate,
        benefits: formData.benefits.split(",").map((b) => b.trim()).filter(Boolean),
        additionalTerms: formData.additionalTerms,
        signatoryName: formData.signatoryName,
        signatoryTitle: formData.signatoryTitle,
        signatoryOrganization: formData.signatoryOrganization,
        status: targetStatus,
      };

      if (isEditing && onUpdateOffer) {
        await onUpdateOffer(offerToEdit._id, payload);
      } else {
        await onCreateOffer(payload);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-in-top">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? "Edit Job Offer Letter" : "Create & Issue Formal Offer Letter"}
            </h3>
            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{candName}</strong>
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-thin bg-white">
          {[
            { id: "role", label: "1. Role & Candidate" },
            { id: "compensation", label: "2. Compensation & CTC" },
            { id: "terms", label: "3. Dates & Policy" },
            { id: "signatory", label: "4. Signatory & Terms" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#f59e0b] text-[#b45309]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: Role & Candidate */}
          {activeTab === "role" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position / Designation *</label>
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
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
                    <option value="">Select department</option>
                    {withExtraOption(DEPARTMENTS, formData.department).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    <option value="">Select type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-time">Part-time</option>
                    {formData.employmentType && !["Full-time", "Internship", "Contract", "Part-time"].includes(formData.employmentType) && (
                      <option value={formData.employmentType}>{formData.employmentType}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Mode</label>
                  <select
                    name="workLocationType"
                    value={formData.workLocationType}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    <option value="">Select work mode</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Location</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Compensation & Breakdown */}
          {activeTab === "compensation" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
                💡 Changing the Total CTC automatically calculates standard breakdown percentages (70% Base, 20% Allowances, 10% Bonus), which you can fine-tune below.
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Annual CTC (₹) *</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="e.g. 600000"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-[#f59e0b]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salary Period / Metric</label>
                  <select
                    name="salaryPeriod"
                    value={formData.salaryPeriod}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  >
                    <option value="Per Annum (LPA)">Per Annum (CTC)</option>
                    <option value="Per Month">Per Month Fixed</option>
                    <option value="Stipend / Month">Stipend / Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => handleCustomBreakdown("baseSalary", e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Allowances & HRA (₹)</label>
                  <input
                    type="number"
                    value={formData.allowances}
                    onChange={(e) => handleCustomBreakdown("allowances", e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Variable / Performance Bonus (₹)</label>
                  <input
                    type="number"
                    value={formData.variableBonus}
                    onChange={(e) => handleCustomBreakdown("variableBonus", e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Options / ESOPs (Optional)</label>
                  <input
                    name="stockOptions"
                    value={formData.stockOptions}
                    onChange={handleChange}
                    placeholder="e.g. 500 Stock Units vested over 4 years"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Dates & Policy */}
          {activeTab === "terms" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid sm:grid-cols-2 gap-3.5">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Offer Acceptance Deadline *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Probation Period</label>
                  <input
                    name="probationPeriod"
                    value={formData.probationPeriod}
                    onChange={handleChange}
                    placeholder="3 Months"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notice Period</label>
                  <input
                    name="noticePeriod"
                    value={formData.noticePeriod}
                    onChange={handleChange}
                    placeholder="30 Days"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reporting Manager / Team Lead</label>
                  <input
                    name="reportingManager"
                    value={formData.reportingManager}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Perks & Benefits (Comma separated)</label>
                  <textarea
                    name="benefits"
                    rows={2}
                    value={formData.benefits}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Signatory & Terms */}
          {activeTab === "signatory" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized HR Signatory Name</label>
                  <input
                    name="signatoryName"
                    value={formData.signatoryName}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Signatory Title</label>
                  <input
                    name="signatoryTitle"
                    value={formData.signatoryTitle}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Signatory Department / Org</label>
                  <input
                    name="signatoryOrganization"
                    value={formData.signatoryOrganization}
                    onChange={handleChange}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Additional Terms & Conditions Clauses</label>
                  <textarea
                    name="additionalTerms"
                    rows={3}
                    value={formData.additionalTerms}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitWithStatus("Draft")}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSubmitWithStatus("Pending Approval")}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition"
                >
                  Request HR Approval
                </button>
              </>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmitWithStatus(isEditing ? (offerToEdit.status || "Draft") : "Sent")}
              className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
            >
              {saving ? "Saving..." : isEditing ? "Update Offer" : "Issue & Send Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;
