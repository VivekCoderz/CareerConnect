import React, { useState, useRef } from "react";

const workEnvironments = [
  {
    id: "Hybrid",
    label: "Hybrid",
    desc: "Mix of flexible remote days & collaborative office time",
    icon: "🏢 💻",
  },
  {
    id: "Remote",
    label: "Remote First",
    desc: "Distributed team with work-from-anywhere freedom",
    icon: "🌍 🏡",
  },
  {
    id: "On-site",
    label: "On-site",
    desc: "Vibrant in-person campus collaboration daily",
    icon: "🏢 🤝",
  },
];

const defaultBenefits = [
  "Comprehensive Health Insurance",
  "Paid Vacation & Sick Leaves",
  "Flexible Working Hours",
  "Work From Home Option",
  "Annual Learning & Upskilling Budget",
  "Performance & Annual Bonus",
  "Regular Team Offsites & Hackathons",
  "Maternity & Paternity Leave",
  "ESOPs / Company Equity",
  "Mental Wellness & Counseling",
];

const defaultPerks = [
  "Free Gourmet Meals & Snacks",
  "Dedicated Cab & Shuttle Service",
  "In-house Gym & Fitness Area",
  "Recreation & Gaming Zone",
  "Tech Gear Setup (MacBook / Dell XPS)",
  "Paid Global Certification Vouchers",
  "Fast-track Mentorship Programs",
  "Annual Company Retreat",
];

const TeamCulture = ({
  formData,
  handleChange,
  setFormData,
  fieldErrors = {},
}) => {
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [editingLeaderIndex, setEditingLeaderIndex] = useState(null);
  const [leaderForm, setLeaderForm] = useState({
    name: "",
    designation: "",
    profileImage: "",
    linkedinUrl: "",
    bio: "",
  });

  const galleryInputRef = useRef(null);
  const leaderPhotoInputRef = useRef(null);

  const [customBenefit, setCustomBenefit] = useState("");
  const [customPerk, setCustomPerk] = useState("");

  const handleToggleBenefit = (b) => {
    const current = formData.benefits || [];
    if (current.includes(b)) {
      setFormData((prev) => ({
        ...prev,
        benefits: current.filter((x) => x !== b),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        benefits: [...current, b],
      }));
    }
  };

  const handleAddCustomBenefit = () => {
    const val = customBenefit.trim();
    if (!val) return;
    const current = formData.benefits || [];
    if (!current.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...current, val],
      }));
    }
    setCustomBenefit("");
  };

  const handleTogglePerk = (p) => {
    const current = formData.perks || [];
    if (current.includes(p)) {
      setFormData((prev) => ({
        ...prev,
        perks: current.filter((x) => x !== p),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        perks: [...current, p],
      }));
    }
  };

  const handleAddCustomPerk = () => {
    const val = customPerk.trim();
    if (!val) return;
    const current = formData.perks || [];
    if (!current.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        perks: [...current, val],
      }));
    }
    setCustomPerk("");
  };

  // Gallery Upload
  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          gallery: [...(prev.gallery || []), reader.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryImage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      gallery: (prev.gallery || []).filter((_, i) => i !== idx),
    }));
  };

  // Leadership Management
  const openLeaderModal = (index = null) => {
    if (index !== null) {
      setEditingLeaderIndex(index);
      setLeaderForm({ ...formData.leadership[index] });
    } else {
      setEditingLeaderIndex(null);
      setLeaderForm({
        name: "",
        designation: "",
        profileImage: "",
        linkedinUrl: "",
        bio: "",
      });
    }
    setShowLeaderModal(true);
  };

  const handleSaveLeader = () => {
    if (!leaderForm.name.trim() || !leaderForm.designation.trim()) {
      alert("Name and Designation are required");
      return;
    }

    const current = [...(formData.leadership || [])];
    if (editingLeaderIndex !== null) {
      current[editingLeaderIndex] = leaderForm;
    } else {
      current.push(leaderForm);
    }

    setFormData((prev) => ({ ...prev, leadership: current }));
    setShowLeaderModal(false);
  };

  const handleDeleteLeader = (index) => {
    setFormData((prev) => ({
      ...prev,
      leadership: (prev.leadership || []).filter((_, i) => i !== index),
    }));
  };

  const handleLeaderPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setLeaderForm((prev) => ({ ...prev, profileImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Show candidates what it's like to work here
        </h2>
        <p className="text-sm text-slate-500 mt-1.5">
          Work environment, employee happiness benefits, team gallery, and key leadership
        </p>
      </div>

      {/* Work Environment */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-700 mb-2">
          Workplace Environment <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workEnvironments.map((env) => {
            const isSelected =
              (formData.culture?.workEnvironment || "Hybrid") === env.id;
            return (
              <button
                key={env.id}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    culture: {
                      ...(prev.culture || {}),
                      workEnvironment: env.id,
                    },
                  }))
                }
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "border-[#f59e0b] bg-amber-50/60 ring-2 ring-[#f59e0b]/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{env.icon}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-[#f59e0b] bg-[#f59e0b] text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                    {env.label}
                  </h4>
                  <p className="text-xs text-slate-500 leading-snug">
                    {env.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Culture Description */}
      <div>
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
          Workplace Culture & Day-to-day Life
        </label>
        <textarea
          name="cultureDescription"
          rows={3}
          value={formData.culture?.description || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              culture: {
                ...(prev.culture || {}),
                description: e.target.value,
              },
            }))
          }
          placeholder="Describe team rituals, hackathons, open communication channels, feedback loops, and learning initiatives..."
          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />
      </div>

      {/* Employee Benefits */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Employee Benefits & Well-being
        </label>
        <div className="flex flex-wrap gap-2">
          {defaultBenefits.map((benefit) => {
            const isSelected = (formData.benefits || []).includes(benefit);
            return (
              <button
                key={benefit}
                type="button"
                onClick={() => handleToggleBenefit(benefit)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {benefit}
              </button>
            );
          })}
          {(formData.benefits || [])
            .filter((b) => !defaultBenefits.includes(b))
            .map((cb) => (
              <span
                key={cb}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold border border-amber-500"
              >
                ✓ {cb}
                <button
                  type="button"
                  onClick={() => handleToggleBenefit(cb)}
                  className="w-4 h-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </span>
            ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customBenefit}
            onChange={(e) => setCustomBenefit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomBenefit();
              }
            }}
            placeholder="Add other employee benefit..."
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={handleAddCustomBenefit}
            className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold transition"
          >
            Add Benefit
          </button>
        </div>
      </div>

      {/* Perks & Facilities */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <label className="block text-[13px] font-semibold text-slate-700">
          Campus Perks & Facilities
        </label>
        <div className="flex flex-wrap gap-2">
          {defaultPerks.map((perk) => {
            const isSelected = (formData.perks || []).includes(perk);
            return (
              <button
                key={perk}
                type="button"
                onClick={() => handleTogglePerk(perk)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? "bg-[#92400e] text-white border-[#92400e] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {perk}
              </button>
            );
          })}
          {(formData.perks || [])
            .filter((p) => !defaultPerks.includes(p))
            .map((cp) => (
              <span
                key={cp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#92400e] text-white text-xs font-semibold border border-[#92400e]"
              >
                ✓ {cp}
                <button
                  type="button"
                  onClick={() => handleTogglePerk(cp)}
                  className="w-4 h-4 rounded-full bg-[#78350f] text-white flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </span>
            ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customPerk}
            onChange={(e) => setCustomPerk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomPerk();
              }
            }}
            placeholder="Add other perk or facility..."
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
          />
          <button
            type="button"
            onClick={handleAddCustomPerk}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
          >
            Add Perk
          </button>
        </div>
      </div>

      {/* Leadership / Key People */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700">
              Leadership & Key People
            </label>
            <p className="text-[11px] text-slate-400">
              Introduce founders, CTOs, HR heads, and hiring mentors
            </p>
          </div>
          <button
            type="button"
            onClick={() => openLeaderModal()}
            className="px-3.5 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <span>+</span> Add Leader
          </button>
        </div>

        {(formData.leadership || []).length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-xs">
            No leaders added yet. Click "+ Add Leader" to showcase executive profiles.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formData.leadership.map((person, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-[#92400e] flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                    {person.profileImage ? (
                      <img
                        src={person.profileImage}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      person.name?.[0]?.toUpperCase() || "L"
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">
                      {person.name}
                    </h5>
                    <p className="text-[11px] font-medium text-amber-700">
                      {person.designation}
                    </p>
                    {person.bio && (
                      <p className="text-[10.5px] text-slate-500 mt-1 line-clamp-2">
                        {person.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openLeaderModal(idx)}
                    className="text-xs text-slate-400 hover:text-slate-700 p-1"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLeader(idx)}
                    className="text-xs text-red-400 hover:text-red-600 p-1"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Photos / Gallery */}
      <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700">
              Workplace & Team Gallery
            </label>
            <p className="text-[11px] text-slate-400">
              Upload photos of your campus, team celebrations, and workspace
            </p>
          </div>
          <input
            type="file"
            ref={galleryInputRef}
            onChange={handleGalleryUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-[#b45309] text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            📸 Upload Photos
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(formData.gallery || []).map((img, idx) => (
            <div
              key={idx}
              className="h-24 rounded-xl border border-slate-200 overflow-hidden relative group bg-black/5"
            >
              <img
                src={img}
                alt={`Gallery ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
              <button
                type="button"
                onClick={() => handleRemoveGalleryImage(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Leader Modal */}
      {showLeaderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingLeaderIndex !== null
                ? "Edit Leader Profile"
                : "Add Key Leadership Member"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={leaderForm.name}
                  onChange={(e) =>
                    setLeaderForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={leaderForm.designation}
                  onChange={(e) =>
                    setLeaderForm((p) => ({
                      ...p,
                      designation: e.target.value,
                    }))
                  }
                  placeholder="e.g. Chief Technology Officer (CTO)"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={leaderForm.linkedinUrl}
                  onChange={(e) =>
                    setLeaderForm((p) => ({
                      ...p,
                      linkedinUrl: e.target.value,
                    }))
                  }
                  placeholder="https://linkedin.com/in/username"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Bio / Background
                </label>
                <textarea
                  rows={2}
                  value={leaderForm.bio}
                  onChange={(e) =>
                    setLeaderForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  placeholder="e.g. 15+ years experience building cloud scalable architectures at Google & Microsoft."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  ref={leaderPhotoInputRef}
                  onChange={handleLeaderPhoto}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => leaderPhotoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-700 hover:border-amber-400"
                >
                  {leaderForm.profileImage ? "Change Photo" : "Upload Photo"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLeader}
                className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-semibold shadow-sm"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCulture;
