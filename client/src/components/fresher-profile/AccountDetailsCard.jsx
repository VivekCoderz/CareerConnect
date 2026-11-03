import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile } from "../../redux/features/authSlice";
import { saveFresherProfileDraft } from "../../services/fresherProfileService";

// Name and email of the signed-in fresher. The name is the account name that the
// dashboard greeting shows, so saving it also updates the signed-in user in the app.
const AccountDetailsCard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const startEditing = () => {
    setName(user?.fullName || "");
    setError("");
    setSaved(false);
    setEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const fullName = name.trim().replace(/\s+/g, " ");
    if (fullName.length < 2 || fullName.length > 100) {
      setError("Name must be 2 to 100 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveFresherProfileDraft({ fullName });
      dispatch(updateUserProfile({ fullName }));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save your name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6" aria-labelledby="account-details-heading">
      <h2 id="account-details-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700">
        Your details
      </h2>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</span>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                aria-label="Full name"
                autoFocus
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-900 truncate">{user?.fullName || "Not set"}</span>
              <button type="button" onClick={startEditing} className="text-xs font-bold text-[#1e3a8a] hover:underline shrink-0">
                Edit
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          {saved && !editing && <p className="text-xs text-emerald-600 mt-1">Name saved.</p>}
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">Email</span>
          <div className="flex items-center h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-900 truncate">{user?.email || "Not set"}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountDetailsCard;
