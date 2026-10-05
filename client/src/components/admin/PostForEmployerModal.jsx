import { useEffect, useState } from "react";
import { createOpportunityForEmployer, getAdminEmployers } from "../../services/adminService";

// Super Admin: post a job or internship on behalf of an approved employer
// (assisted posting). The listing belongs to the employer, who manages applicants.
// Nothing pre-selected: work mode and (for jobs) employment type are chosen by the admin.
const EMPTY = {
  type: "job", title: "", location: "", employmentType: "", workMode: "", description: "",
  requiredSkills: "", deadline: "", applyUrl: "",
};
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Trainee"];

const PostForEmployerModal = ({ open, onClose, onPosted }) => {
  const [search, setSearch] = useState("");
  const [employers, setEmployers] = useState([]);
  const [employerId, setEmployerId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getAdminEmployers({ status: "approved", search, limit: 20 });
        if (!cancelled) setEmployers(res?.employers || []);
      } catch {
        if (!cancelled) setEmployers([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  if (!open) return null;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!employerId) return setError("Choose an approved employer.");
    setSaving(true);
    try {
      const { employmentType, ...rest } = form;
      const payload = {
        ...rest,
        // Internships have no employment type.
        ...(form.type === "job" ? { employmentType } : {}),
        employerProfileId: employerId,
        requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        deadline: form.deadline || undefined,
        applyUrl: form.applyUrl || undefined,
      };
      const res = await createOpportunityForEmployer(payload);
      onPosted?.(res?.opportunity);
      setForm(EMPTY);
      setEmployerId("");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not post the listing.");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="post-for-employer-title">
      <form onSubmit={submit} className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="post-for-employer-title" className="text-lg font-bold text-slate-900">Post for an employer</h2>
            <p className="text-xs text-slate-500">Goes live now under the employer's account. They manage the applicants.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <label className="block text-sm font-semibold text-slate-800">
          Employer (approved only)
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company name or email" className={`${input} mt-1`} />
          <select value={employerId} onChange={(e) => setEmployerId(e.target.value)} className={`${input} mt-2`} required>
            <option value="">Select an employer…</option>
            {employers.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.companyName || "Unnamed company"} {emp.userId?.email ? `· ${emp.userId.email}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-slate-800">
            Type
            <select value={form.type} onChange={set("type")} className={`${input} mt-1`}>
              <option value="job">Job</option>
              <option value="internship">Internship</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            Work mode
            <select value={form.workMode} onChange={set("workMode")} required className={`${input} mt-1`}>
              <option value="">Select work mode…</option>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
          </label>
        </div>

        {form.type === "job" && (
          <label className="block text-sm font-semibold text-slate-800">
            Employment type
            <select value={form.employmentType} onChange={set("employmentType")} required className={`${input} mt-1`}>
              <option value="">Select employment type…</option>
              {JOB_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold text-slate-800">
          Title
          <input value={form.title} onChange={set("title")} required maxLength={150} className={`${input} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Location
          <input value={form.location} onChange={set("location")} required placeholder="e.g. Gurugram, Haryana" className={`${input} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Description (paste the employer's JD)
          <textarea value={form.description} onChange={set("description")} required rows={6} className={`${input} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Required skills (comma separated)
          <input value={form.requiredSkills} onChange={set("requiredSkills")} placeholder="React, Node.js, SQL" className={`${input} mt-1`} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-slate-800">
            Application deadline
            <input type="date" value={form.deadline} onChange={set("deadline")} className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            External apply link (optional)
            <input type="url" value={form.applyUrl} onChange={set("applyUrl")} placeholder="https://" className={`${input} mt-1`} />
          </label>
        </div>

        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Posting…" : "Post and publish"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForEmployerModal;
