import { useEffect, useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const PersonalInfo = ({ profile, setProfile }) => {
  const [form, setForm] = useState({
    dateOfBirth: "",
    gender: "",
    city: "",
    state: "",
    country: "India",
    bio: "",
  });

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      dateOfBirth: profile?.dateOfBirth
        ? profile.dateOfBirth.substring(0, 10)
        : "",
      gender: profile?.gender || "",
      city: profile?.location?.city || "",
      state: profile?.location?.state || "",
      country: profile?.location?.country || "India",
      bio: profile?.bio || "",
    });
  }, [profile]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const data = {
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        location: {
          city: form.city,
          state: form.state,
          country: form.country,
        },
        bio: form.bio,
      };

      const response = await updateStudentProfile(data);
      if (response?.profile) {
        setProfile(response.profile);
      }
      setEditing(false);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to update personal information");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
          <p className="text-xs text-slate-500 mt-0.5">Basic personal details and background story</p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="Enter state"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={form.country}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={form.bio}
              onChange={handleChange}
              maxLength={500}
              placeholder="Tell something about yourself..."
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium block mb-0.5">Date of Birth</span>
            <span className="font-semibold text-slate-800">{form.dateOfBirth || "Not added"}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 font-medium block mb-0.5">Gender</span>
            <span className="font-semibold text-slate-800 capitalize">{form.gender || "Not added"}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
            <span className="text-slate-400 font-medium block mb-0.5">Location</span>
            <span className="font-semibold text-slate-800">
              {form.city ? `${form.city}, ${form.state ? form.state + ", " : ""}${form.country}` : "Not added"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
            <span className="text-slate-400 font-medium block mb-0.5">Bio</span>
            <span className="text-slate-700 leading-relaxed">{form.bio || "No bio added yet."}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default PersonalInfo;