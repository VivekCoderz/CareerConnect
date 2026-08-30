import { useState } from "react";

const BasicInformation = ({ profile, user, onChange }) => {
  const [formData, setFormData] = useState({
    fullName: user?.fullName || profile?.userId?.fullName || "",
    email: user?.email || profile?.userId?.email || "",
    phone: user?.phone || profile?.userId?.phone || "",
    username: user?.username || profile?.userId?.username || "",
    profileImage: profile?.profileImage || user?.profileImage || "",
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
    gender: profile?.gender || "",
    city: profile?.location?.city || "",
    state: profile?.location?.state || "",
    country: profile?.location?.country || "India",
    bio: profile?.bio || "",
    linkedin: profile?.socialLinks?.linkedin || user?.socialLinks?.linkedin || "",
    github: profile?.socialLinks?.github || user?.socialLinks?.github || "",
    portfolio: profile?.socialLinks?.portfolio || "",
  });

  const handleInputChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    onChange({
      fullName: updated.fullName,
      phone: updated.phone,
      profileImage: updated.profileImage,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      location: {
        city: updated.city,
        state: updated.state,
        country: updated.country,
      },
      bio: updated.bio,
      socialLinks: {
        linkedin: updated.linkedin,
        github: updated.github,
        portfolio: updated.portfolio,
      },
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
          👤
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
          <p className="text-xs text-slate-500">Essential contact details and public bio</p>
        </div>
      </div>

      {/* Avatar & Profile Image */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="relative">
          {formData.profileImage ? (
            <img
              src={formData.profileImage}
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
              }}
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white shadow-sm">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "F"}
            </div>
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Profile Image URL</label>
          <input
            type="url"
            value={formData.profileImage}
            onChange={(e) => handleInputChange("profileImage", e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs outline-none transition"
          />
          <p className="text-[11px] text-slate-400">
            Paste a public direct image link or leave empty to use your default initials avatar.
          </p>
        </div>
      </div>

      {/* Basic Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => handleInputChange("fullName", e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email Address <span className="text-slate-400 text-[10px]">(Account Synced)</span>
          </label>
          <input
            type="email"
            disabled
            value={formData.email}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 text-sm outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
          <input
            type="text"
            disabled
            value={formData.username}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-500 text-sm outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange("gender", e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition bg-white"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Location Details */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Current Location
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder="e.g. Bangalore"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder="e.g. Karnataka"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
              placeholder="India"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Bio / Summary */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-semibold text-slate-700">About Me / Bio</label>
          <span className="text-[11px] text-slate-400">{formData.bio.length} / 600</span>
        </div>
        <textarea
          rows={3}
          maxLength={600}
          value={formData.bio}
          onChange={(e) => handleInputChange("bio", e.target.value)}
          placeholder="Write a short summary about yourself, your technical background, and what drives you..."
          className="w-full p-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm outline-none transition"
        />
      </div>

      {/* Social & Portfolio Links */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Social & Portfolio Links
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>🔗</span> LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => handleInputChange("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>🐙</span> GitHub
            </label>
            <input
              type="url"
              value={formData.github}
              onChange={(e) => handleInputChange("github", e.target.value)}
              placeholder="https://github.com/username"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>🌐</span> Portfolio Website
            </label>
            <input
              type="url"
              value={formData.portfolio}
              onChange={(e) => handleInputChange("portfolio", e.target.value)}
              placeholder="https://myportfolio.dev"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs outline-none transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;
