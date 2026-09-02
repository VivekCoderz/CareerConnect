import React, { useState } from "react";

const companySizes = ["1–10", "11–50", "51–200", "201–500", "500+"];

const defaultDepartments = [
  "Engineering & Technology",
  "Human Resources",
  "Product Management",
  "UI/UX & Graphic Design",
  "Marketing & Communications",
  "Sales & Business Development",
  "Finance & Accounting",
  "Operations & Logistics",
  "Quality Assurance",
  "Research & Development",
  "Customer Success & Support",
  "Legal & Compliance",
];

const CompanyDetails = ({
  formData,
  handleChange,
  setFormData,
  fieldErrors = {},
}) => {
  const [newOffice, setNewOffice] = useState("");
  const [customDept, setCustomDept] = useState("");

  const handleHeadquartersChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      headquarters: {
        ...(prev.headquarters || {}),
        [name]: value,
      },
    }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        [name]: value,
      },
    }));
  };

  const handleToggleDepartment = (dept) => {
    const current = formData.departments || [];
    if (current.includes(dept)) {
      setFormData((prev) => ({
        ...prev,
        departments: current.filter((d) => d !== dept),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        departments: [...current, dept],
      }));
    }
  };

  const handleAddCustomDept = () => {
    const val = customDept.trim();
    if (!val) return;
    const current = formData.departments || [];
    if (!current.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        departments: [...current, val],
      }));
    }
    setCustomDept("");
  };

  const handleAddOffice = () => {
    const val = newOffice.trim();
    if (!val) return;
    const current = formData.offices || [];
    if (!current.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        offices: [...current, val],
      }));
    }
    setNewOffice("");
  };

  const handleRemoveOffice = (officeToRemove) => {
    setFormData((prev) => ({
      ...prev,
      offices: (prev.offices || []).filter((o) => o !== officeToRemove),
    }));
  };

  const inputClass = (field) =>
    `w-full h-11 rounded-xl border bg-white px-4 text-sm outline-none transition focus:ring-4 ${
      fieldErrors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
        : "border-slate-200 focus:border-[#f59e0b] focus:ring-[#f59e0b]/15"
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Company details
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Headquarters, employee scale, departments, and online presence
        </p>
      </div>

      {/* Company Size */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-700 mb-2">
          Company Size (Total Employees) <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {companySizes.map((size) => {
            const isSelected = (formData.companySize || "11–50") === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, companySize: size }))
                }
                className={`py-3 px-3 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? "border-[#f59e0b] bg-amber-50 text-[#b45309] shadow-sm ring-2 ring-[#f59e0b]/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{size}</span>
                <span className="text-[10px] font-medium text-slate-400">
                  employees
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Headquarters Location */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Headquarters Location <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.headquarters?.city || ""}
              onChange={handleHeadquartersChange}
              placeholder="e.g. Gurugram"
              className={inputClass("headquartersCity")}
            />
            {fieldErrors.headquartersCity && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.headquartersCity}</p>
            )}
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.headquarters?.state || ""}
              onChange={handleHeadquartersChange}
              placeholder="e.g. Haryana"
              className={inputClass("headquartersState")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.headquarters?.country || "India"}
              onChange={handleHeadquartersChange}
              placeholder="e.g. India"
              className={inputClass("headquartersCountry")}
            />
          </div>
        </div>
      </div>

      {/* Additional Offices */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Additional Branch Offices / Centers
        </label>
        <div className="flex flex-wrap gap-2">
          {(formData.offices || []).map((off) => (
            <span
              key={off}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs"
            >
              📍 {off}
              <button
                type="button"
                onClick={() => handleRemoveOffice(off)}
                className="w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newOffice}
            onChange={(e) => setNewOffice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddOffice();
              }
            }}
            placeholder="e.g. Bangalore (Whitefield), Hyderabad (Hitec City)"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={handleAddOffice}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition"
          >
            Add Office
          </button>
        </div>
      </div>

      {/* Departments */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Departments / Divisions
        </label>
        <div className="flex flex-wrap gap-2">
          {defaultDepartments.map((dept) => {
            const isSelected = (formData.departments || []).includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => handleToggleDepartment(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {dept}
              </button>
            );
          })}
          {(formData.departments || [])
            .filter((d) => !defaultDepartments.includes(d))
            .map((customD) => (
              <span
                key={customD}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold border border-amber-500"
              >
                ✓ {customD}
                <button
                  type="button"
                  onClick={() => handleToggleDepartment(customD)}
                  className="w-4 h-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </span>
            ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={customDept}
            onChange={(e) => setCustomDept(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomDept();
              }
            }}
            placeholder="Add other custom department and press Enter"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={handleAddCustomDept}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
          >
            Add Dept
          </button>
        </div>
      </div>

      {/* Social Links */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
        <label className="block text-[13px] font-semibold text-slate-700">
          Official Social & Public Links
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              LinkedIn Company Page
            </label>
            <input
              type="url"
              name="linkedin"
              value={formData.socialLinks?.linkedin || ""}
              onChange={handleSocialChange}
              placeholder="https://linkedin.com/company/yourbrand"
              className={inputClass("linkedin")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Twitter / X Profile
            </label>
            <input
              type="url"
              name="twitter"
              value={formData.socialLinks?.twitter || ""}
              onChange={handleSocialChange}
              placeholder="https://x.com/yourbrand"
              className={inputClass("twitter")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Facebook Page
            </label>
            <input
              type="url"
              name="facebook"
              value={formData.socialLinks?.facebook || ""}
              onChange={handleSocialChange}
              placeholder="https://facebook.com/yourbrand"
              className={inputClass("facebook")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Instagram Handle / URL
            </label>
            <input
              type="url"
              name="instagram"
              value={formData.socialLinks?.instagram || ""}
              onChange={handleSocialChange}
              placeholder="https://instagram.com/yourbrand"
              className={inputClass("instagram")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              YouTube Channel
            </label>
            <input
              type="url"
              name="youtube"
              value={formData.socialLinks?.youtube || ""}
              onChange={handleSocialChange}
              placeholder="https://youtube.com/@yourbrand"
              className={inputClass("youtube")}
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
              Other Link / Blog / Tech Portal
            </label>
            <input
              type="url"
              name="other"
              value={formData.socialLinks?.other || ""}
              onChange={handleSocialChange}
              placeholder="https://blog.yourbrand.com"
              className={inputClass("other")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;
