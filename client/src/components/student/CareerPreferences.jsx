import { useEffect, useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const CareerPreferences = ({ profile, setProfile }) => {
  const [form, setForm] = useState({
    careerGoal: "",
    interests: [],
    preferredRoles: [],
    preferredLocations: [],
    jobTypes: [],
    remote: false,
  });

  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      careerGoal: profile?.careerGoal || "",
      interests: profile?.interests || [],
      preferredRoles: profile?.jobPreferences?.preferredRoles || [],
      preferredLocations: profile?.jobPreferences?.preferredLocations || [],
      jobTypes: profile?.jobPreferences?.jobTypes || [],
      remote: profile?.jobPreferences?.remote || false,
    });
  }, [profile]);

  const addItem = (field, value, clear) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (form[field].includes(trimmed)) return;

    setForm({
      ...form,
      [field]: [...form[field], trimmed],
    });
    clear("");
  };

  const removeItem = (field, item) => {
    setForm({
      ...form,
      [field]: form[field].filter((value) => value !== item),
    });
  };

  const toggleJobType = (type) => {
    const exists = form.jobTypes.includes(type);
    setForm({
      ...form,
      jobTypes: exists
        ? form.jobTypes.filter((item) => item !== type)
        : [...form.jobTypes, type],
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await updateStudentProfile({
        careerGoal: form.careerGoal,
        interests: form.interests,
        jobPreferences: {
          preferredRoles: form.preferredRoles,
          preferredLocations: form.preferredLocations,
          jobTypes: form.jobTypes,
          remote: form.remote,
        },
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
      alert("Career preferences saved successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save career preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Career Preferences & Aspirations</h2>
        <p className="text-xs text-slate-500 mt-0.5">Customize how opportunities are recommended for you</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Primary Career Goal */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Primary Career Goal *</label>
          <input
            value={form.careerGoal}
            onChange={(e) => setForm({ ...form, careerGoal: e.target.value })}
            placeholder="e.g. Full Stack Developer, Data Scientist"
            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
          />
        </div>

        {/* Preferred Roles */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Preferred Roles</label>
          <div className="flex gap-2 max-w-md">
            <input
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="e.g. Frontend Developer"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("preferredRoles", roleInput, setRoleInput);
                }
              }}
              className="flex-1 h-10 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => addItem("preferredRoles", roleInput, setRoleInput)}
              className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-6">
            {form.preferredRoles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeItem("preferredRoles", role)}
                  className="text-slate-400 hover:text-slate-800 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Locations */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Preferred Locations</label>
          <div className="flex gap-2 max-w-md">
            <input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. Bangalore, Delhi NCR, Remote"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("preferredLocations", locationInput, setLocationInput);
                }
              }}
              className="flex-1 h-10 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => addItem("preferredLocations", locationInput, setLocationInput)}
              className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-6">
            {form.preferredLocations.map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200"
              >
                {loc}
                <button
                  type="button"
                  onClick={() => removeItem("preferredLocations", loc)}
                  className="text-slate-400 hover:text-slate-800 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Job Types */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Opportunity Types</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["full-time", "part-time", "internship", "freelance"].map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold capitalize cursor-pointer transition ${
                  form.jobTypes.includes(type)
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.jobTypes.includes(type)}
                  onChange={() => toggleJobType(type)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Remote */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(e) => setForm({ ...form, remote: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            Open to Remote & Hybrid Roles
          </label>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">Areas of Interest</label>
          <div className="flex gap-2 max-w-md">
            <input
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder="e.g. Artificial Intelligence, Web3"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem("interests", interestInput, setInterestInput);
                }
              }}
              className="flex-1 h-10 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => addItem("interests", interestInput, setInterestInput)}
              className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-6">
            {form.interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => removeItem("interests", interest)}
                  className="text-emerald-500 hover:text-emerald-800 text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CareerPreferences;