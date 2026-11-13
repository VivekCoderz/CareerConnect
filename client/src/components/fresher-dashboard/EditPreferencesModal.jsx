import { useEffect, useRef, useState } from "react";
import { Briefcase, Clock, Layers, Loader2, MapPin, X } from "lucide-react";
import { updateFresherPreferences } from "../../services/fresherDashboardService";

const MAX_TECH_STACK = 8;
const MAX_TARGET_ROLES = 5;

/** `list` with each comma-separated item in `text` added once (case-insensitive), up to `max`. */
const addItems = (list, text, max) => {
  const next = [...list];
  for (const item of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (next.length >= max) break;
    if (!next.some((s) => s.toLowerCase() === item.toLowerCase())) next.push(item);
  }
  return next;
};

/**
 * Edit { targetRoles, techStack, jobType, location }. Mount it only while open (the form
 * starts from `preferences`); `focusField` is the field the fresher clicked.
 */
const EditPreferencesModal = ({ preferences = {}, options = {}, focusField, onClose, onSaved }) => {
  const [targetRoles, setTargetRoles] = useState(
    preferences.targetRoles?.length ? preferences.targetRoles : [preferences.targetRole].filter(Boolean)
  );
  const [roleInput, setRoleInput] = useState("");
  const [techStack, setTechStack] = useState(preferences.techStack || []);
  const [stackInput, setStackInput] = useState("");
  const [jobType, setJobType] = useState(preferences.jobType || "");
  const [location, setLocation] = useState(preferences.location || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const roleRef = useRef(null);
  const stackRef = useRef(null);
  const jobTypeRef = useRef(null);
  const locationRef = useRef(null);

  useEffect(() => {
    const refs = { targetRole: roleRef, techStack: stackRef, jobType: jobTypeRef, location: locationRef };
    (refs[focusField] || roleRef).current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Focus once, when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStackItems = (text) => {
    if (!text.trim()) return;
    setTechStack((prev) => addItems(prev, text, MAX_TECH_STACK));
    setStackInput("");
  };

  const addRoles = (text) => {
    if (!text.trim()) return;
    setTargetRoles((prev) => addItems(prev, text, MAX_TARGET_ROLES));
    setRoleInput("");
  };

  const handleRoleChange = (e) => {
    // Picking a suggestion adds it straight away; typed text waits for Enter or a comma.
    if ((options.roles || []).includes(e.target.value)) addRoles(e.target.value);
    else setRoleInput(e.target.value);
  };

  const handleRoleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRoles(roleInput);
    } else if (e.key === "Backspace" && !roleInput && targetRoles.length) {
      setTargetRoles((prev) => prev.slice(0, -1));
    }
  };

  const handleStackKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addStackItems(stackInput);
    } else if (e.key === "Backspace" && !stackInput && techStack.length) {
      setTechStack((prev) => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    // Text still in the stack box counts, so "MERN" without pressing Enter isn't lost.
    const pending = stackInput.split(",").map((s) => s.trim()).filter(Boolean);
    const stack = [...techStack, ...pending.filter((p) => !techStack.some((s) => s.toLowerCase() === p.toLowerCase()))];
    try {
      const res = await updateFresherPreferences({
        targetRoles: addItems(targetRoles, roleInput, MAX_TARGET_ROLES),
        techStack: stack.slice(0, MAX_TECH_STACK),
        jobType,
        location: location.trim(),
      });
      onSaved(res?.profile?.preferences);
    } catch (err) {
      setError(err?.response?.data?.message || "Preferences save nahi ho payi. Dobara try karo.");
      setSaving(false);
    }
  };

  const labelClass = "flex items-center gap-1.5 text-sm font-medium text-slate-700";
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-preferences-title"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-preferences-title" className="text-lg font-semibold text-slate-900">
              Edit preferences
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Inke basis par hum aapke liye jobs match karte hain.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="pref-role" className={labelClass}>
              <Briefcase className="h-4 w-4 text-slate-400" aria-hidden /> Target roles
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 px-2 py-2 focus-within:border-[#1e3a8a] focus-within:ring-2 focus-within:ring-[#1e3a8a]/20">
              {targetRoles.map((role) => (
                <span key={role} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-[#1e3a8a]">
                  {role}
                  <button
                    type="button"
                    onClick={() => setTargetRoles((prev) => prev.filter((r) => r !== role))}
                    className="text-[#1e3a8a]/60 hover:text-[#1e3a8a]"
                    aria-label={`Remove ${role}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="pref-role"
                ref={roleRef}
                value={roleInput}
                onChange={handleRoleChange}
                onKeyDown={handleRoleKeyDown}
                onBlur={() => addRoles(roleInput)}
                list="pref-role-options"
                disabled={targetRoles.length >= MAX_TARGET_ROLES}
                maxLength={100}
                placeholder={targetRoles.length ? "" : "e.g. Full Stack Developer"}
                className="min-w-[8rem] flex-1 border-0 px-1 py-0.5 text-sm text-slate-900 outline-none"
              />
            </div>
            <datalist id="pref-role-options">
              {(options.roles || [])
                .filter((role) => !targetRoles.includes(role))
                .map((role) => (
                  <option key={role} value={role} />
                ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-400">Ek se zyada role choose kar sakte ho (max {MAX_TARGET_ROLES}).</p>
          </div>

          <div>
            <label htmlFor="pref-stack" className={labelClass}>
              <Layers className="h-4 w-4 text-slate-400" aria-hidden /> Tech stack
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 px-2 py-2 focus-within:border-[#1e3a8a] focus-within:ring-2 focus-within:ring-[#1e3a8a]/20">
              {techStack.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-[#1e3a8a]">
                  {item}
                  <button
                    type="button"
                    onClick={() => setTechStack((prev) => prev.filter((s) => s !== item))}
                    className="text-[#1e3a8a]/60 hover:text-[#1e3a8a]"
                    aria-label={`Remove ${item}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="pref-stack"
                ref={stackRef}
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                onKeyDown={handleStackKeyDown}
                onBlur={() => addStackItems(stackInput)}
                disabled={techStack.length >= MAX_TECH_STACK}
                maxLength={50}
                placeholder={techStack.length ? "" : "e.g. MERN, Python"}
                className="min-w-[8rem] flex-1 border-0 px-1 py-0.5 text-sm text-slate-900 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Enter ya comma se add karo.</p>
          </div>

          <div>
            <span className={labelClass} id="pref-type-label">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden /> Job type
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="pref-type-label">
              {(options.jobTypes || []).map((type, idx) => (
                <button
                  key={type}
                  type="button"
                  ref={idx === 0 ? jobTypeRef : undefined}
                  role="radio"
                  aria-checked={jobType === type}
                  onClick={() => setJobType((prev) => (prev === type ? "" : type))}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    jobType === type
                      ? "border-[#1e3a8a] bg-[#1e3a8a] text-white"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="pref-location" className={labelClass}>
              <MapPin className="h-4 w-4 text-slate-400" aria-hidden /> Location
            </label>
            <input
              id="pref-location"
              ref={locationRef}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              placeholder="e.g. Remote, Bangalore"
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save preferences
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPreferencesModal;
