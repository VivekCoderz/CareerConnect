import React, { useRef } from "react";

const industries = [
  "Information Technology",
  "Software & Services",
  "FinTech",
  "Healthcare & Life Sciences",
  "EdTech",
  "E-commerce & Retail",
  "Manufacturing & Engineering",
  "Banking & Financial Services",
  "Consulting & Business Services",
  "Telecommunications",
  "Artificial Intelligence & ML",
  "Media & Entertainment",
  "Logistics & Supply Chain",
  "Other",
];

const companyTypes = [
  "Private",
  "Public",
  "Startup",
  "NGO",
  "Government",
  "Educational Institution",
  "Other",
];

const BasicCompanyInfo = ({
  formData,
  handleChange,
  setFormData,
  fieldErrors = {},
}) => {
  const fileInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          Build your company profile
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Tell candidates about your organization
        </p>
      </div>

      {/* Company Logo Section */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50">
        <label className="block text-[13px] font-semibold text-slate-700 mb-2">
          Company Logo
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden relative group shadow-sm flex-shrink-0">
            {formData.logo ? (
              <img
                src={formData.logo}
                alt="Company Logo"
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <div className="text-center p-2 text-slate-400">
                <svg
                  className="w-7 h-7 mx-auto stroke-[1.5]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2zM8 10a2 2 0 100-4 2 2 0 000 4zm12 7l-5-5-4 4-2-2-5 5"
                  />
                </svg>
                <span className="text-[10px] font-medium block mt-0.5">Logo</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-[#b45309] text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {formData.logo ? "Replace Logo" : "Upload Logo"}
              </button>

              {formData.logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Recommended: Square PNG, JPG or SVG (Max 5MB). High-resolution logos appear on job postings and public company showcase.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Name */}
        <div className="md:col-span-2">
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName || ""}
            onChange={handleChange}
            placeholder="e.g. Acme Innovations Pvt Ltd"
            className={inputClass("companyName")}
          />
          {fieldErrors.companyName && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.companyName}</p>
          )}
        </div>

        {/* Official Email */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Official Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="officialEmail"
            value={formData.officialEmail || ""}
            onChange={handleChange}
            placeholder="hr@company.com"
            className={inputClass("officialEmail")}
          />
          {fieldErrors.officialEmail && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.officialEmail}</p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile || ""}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            className={inputClass("mobile")}
          />
          {fieldErrors.mobile && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.mobile}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            name="industry"
            value={formData.industry || ""}
            onChange={handleChange}
            className={inputClass("industry")}
          >
            <option value="">Select Industry</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          {fieldErrors.industry && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.industry}</p>
          )}
        </div>

        {/* Company Type */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Company Type
          </label>
          <select
            name="companyType"
            value={formData.companyType || "Private"}
            onChange={handleChange}
            className={inputClass("companyType")}
          >
            {companyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Founded Year */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Founded Year
          </label>
          <input
            type="number"
            name="foundedYear"
            value={formData.foundedYear || ""}
            onChange={handleChange}
            placeholder="e.g. 2018"
            min="1900"
            max={new Date().getFullYear()}
            className={inputClass("foundedYear")}
          />
        </div>

        {/* Company Website */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Company Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website || ""}
            onChange={handleChange}
            placeholder="https://yourcompany.com"
            className={inputClass("website")}
          />
        </div>

        {/* Company Tagline */}
        <div className="md:col-span-2">
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Company Tagline / One-line Pitch
          </label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline || ""}
            onChange={handleChange}
            placeholder="e.g. Building the future of digital intelligence and cloud commerce"
            className={inputClass("tagline")}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            A short punchy line summarizing what makes your company unique.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicCompanyInfo;
