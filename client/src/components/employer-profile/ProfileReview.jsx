import React, { useState } from "react";

const ProfileReview = ({
  formData,
  onEditStep = () => {},
  profileCompletion = 0,
  onPublish = () => {},
  isPublishing = false,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Recommendations for missing fields
  const missingItems = [];
  if (!formData.logo) missingItems.push({ text: "Add company logo (+5%)", step: 1 });
  if (!formData.description || formData.description.length < 30)
    missingItems.push({ text: "Complete in-depth company overview (+8%)", step: 2 });
  if (!formData.coreValues || formData.coreValues.length === 0)
    missingItems.push({ text: "Add 2+ core values (+3%)", step: 2 });
  if (!formData.headquarters?.city)
    missingItems.push({ text: "Specify headquarters city (+6%)", step: 3 });
  if (!formData.benefits || formData.benefits.length === 0)
    missingItems.push({ text: "Add employee benefits (+4%)", step: 4 });
  if (!formData.leadership || formData.leadership.length === 0)
    missingItems.push({ text: "Add at least 1 leadership member (+3%)", step: 4 });
  if (!formData.hiringPreferences?.skills || formData.hiringPreferences.skills.length === 0)
    missingItems.push({ text: "Define hiring technical skills (+5%)", step: 5 });

  const hq = formData.headquarters || {};
  const hiring = formData.hiringPreferences || {};
  const recruiter = formData.recruiter || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Review & publish company profile
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Verify all information before making your profile visible to Geeta University candidates
        </p>
      </div>

      {/* Completion Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#d97706] to-[#92400e] text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold text-amber-100 mb-2">
              <span>{profileCompletion >= 80 ? "✨ Profile Ready" : "⚡ In Progress"}</span>
            </div>
            <h3 className="text-xl font-bold">
              Profile Strength: {profileCompletion}%
            </h3>
            <p className="text-amber-100/90 text-xs mt-1 max-w-md">
              {profileCompletion >= 90
                ? "Your company profile is comprehensive and verified for maximum applicant engagement!"
                : "Complete recommended items below to achieve maximum candidate credibility."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white text-[#92400e] text-xs font-bold shadow-sm hover:bg-amber-50 transition flex items-center gap-1.5 flex-shrink-0"
            >
              👁️ Candidate View Preview
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-black/20 rounded-full mt-4 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#fde68a] to-[#fbbf24] rounded-full transition-all duration-700"
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </div>

      {/* Missing items checklist */}
      {missingItems.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/50">
          <h4 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
            <span>💡</span> Recommended Improvements to Reach 100%:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {missingItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onEditStep(item.step)}
                className="p-2.5 rounded-xl bg-white border border-amber-200/60 hover:border-amber-400 flex items-center justify-between text-xs text-slate-700 cursor-pointer group transition shadow-2xs"
              >
                <span className="font-medium group-hover:text-[#b45309]">
                  {item.text}
                </span>
                <span className="text-[11px] font-bold text-amber-600 group-hover:translate-x-0.5 transition">
                  Edit →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Basic Company Information */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-[#92400e] overflow-hidden flex-shrink-0">
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt={formData.companyName}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                formData.companyName?.[0]?.toUpperCase() || "C"
              )}
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {formData.companyName || "Company Name"}
              </h4>
              <p className="text-xs text-slate-500">
                {formData.industry} · {formData.companyType || "Private"}
                {formData.foundedYear && ` · Est. ${formData.foundedYear}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ✏️ Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-400 block">Official Email</span>
            <span className="text-slate-800 font-medium">{formData.officialEmail || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block">Contact Mobile</span>
            <span className="text-slate-800 font-medium">{formData.mobile || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block">Official Website</span>
            {formData.website ? (
              <a
                href={formData.website}
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 font-semibold hover:underline"
              >
                {formData.website}
              </a>
            ) : (
              "—"
            )}
          </div>
        </div>

        {formData.tagline && (
          <p className="text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-xl">
            "{formData.tagline}"
          </p>
        )}
      </div>

      {/* Section 2: About Company */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">About & Mission</h4>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ✏️ Edit
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {formData.description || "No company description provided."}
        </p>

        {(formData.mission || formData.vision) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {formData.mission && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">🎯 Mission</span>
                <p className="text-slate-600">{formData.mission}</p>
              </div>
            )}
            {formData.vision && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">🔭 Vision</span>
                <p className="text-slate-600">{formData.vision}</p>
              </div>
            )}
          </div>
        )}

        {(formData.coreValues || []).length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
              Core Values
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.coreValues.map((v) => (
                <span
                  key={v}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Company Details */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">Locations & Departments</h4>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ✏️ Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-400 block">Company Size</span>
            <span className="text-slate-800 font-bold">{formData.companySize || "11–50"} employees</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block">Headquarters</span>
            <span className="text-slate-800 font-bold">
              {hq.city ? `${hq.city}, ${hq.state || ""} (${hq.country || "India"})` : "—"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block">Additional Offices</span>
            <span className="text-slate-800 font-medium">
              {(formData.offices || []).length > 0 ? formData.offices.join(", ") : "None"}
            </span>
          </div>
        </div>

        {(formData.departments || []).length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
              Active Departments
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.departments.map((dept) => (
                <span
                  key={dept}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Culture & Team */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">Work Culture & Leadership</h4>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ✏️ Edit
          </button>
        </div>

        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-700">Work Mode: </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
            {formData.culture?.workEnvironment || "Hybrid"}
          </span>
        </div>

        {(formData.benefits || []).length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
              Benefits & Well-being
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.benefits.map((b) => (
                <span
                  key={b}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                >
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {(formData.leadership || []).length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wide">
              Key Leadership ({formData.leadership.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {formData.leadership.map((l, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                    {l.profileImage ? (
                      <img src={l.profileImage} alt={l.name} className="w-full h-full object-cover" />
                    ) : (
                      l.name?.[0] || "L"
                    )}
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-slate-900">{l.name}</h6>
                    <p className="text-[11px] text-slate-500">{l.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Hiring Preferences */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900">Hiring Preferences & Criteria</h4>
          <button
            type="button"
            onClick={() => onEditStep(5)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            ✏️ Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-400 block">Candidate Types</span>
            <span className="text-slate-800 font-medium">
              {(hiring.candidateTypes || []).join(", ") || "Students, Freshers"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 block">Target Job Types</span>
            <span className="text-slate-800 font-medium">
              {(hiring.jobTypes || []).join(", ") || "Full-time, Internship"}
            </span>
          </div>
        </div>

        {(hiring.skills || []).length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wide">
              Required Skills
            </span>
            <div className="flex flex-wrap gap-1.5">
              {hiring.skills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {recruiter.name && (
          <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Recruiter Coordinator: </span>
            {recruiter.name} ({recruiter.designation || "HR Lead"}) — {recruiter.email || ""}
          </div>
        )}
      </div>

      {/* Candidate View Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-lg font-bold transition"
            >
              ×
            </button>

            {/* Mock Candidate View Banner */}
            <div className="h-32 rounded-2xl bg-gradient-to-r from-[#92400e] via-[#b45309] to-[#d97706] relative p-6 text-white mb-12 flex items-end">
              <div className="absolute -bottom-8 left-6 w-20 h-20 rounded-2xl bg-white border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-2xl font-bold text-[#92400e]">
                    {formData.companyName?.[0]?.toUpperCase() || "GU"}
                  </span>
                )}
              </div>
            </div>

            <div className="px-2 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {formData.companyName || "Your Company Name"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formData.industry} · {formData.companySize} employees · {hq.city || "Pan-India"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-[#92400e] border border-amber-200 text-xs font-bold">
                    ✓ Verified Employer
                  </span>
                </div>
              </div>

              {formData.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    About the Organization
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              )}

              {(formData.coreValues || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                    Culture & Values
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.coreValues.map((v) => (
                      <span
                        key={v}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileReview;
