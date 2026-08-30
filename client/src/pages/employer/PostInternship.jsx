import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { create } from "../../services/internshipService";

export default function PostInternship() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    workMode: "Hybrid",
    location: "",
    stipend: "",
    duration: "",
    openings: 1,
    eligibility: "",
    description: "",
    responsibilities: "",
    requiredSkills: "",
    deadline: "",
    status: "Published",
  });

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        openings: Number(form.openings) || 1,
        responsibilities: form.responsibilities
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        requiredSkills: form.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        deadline: form.deadline || null,
      };
      const res = await create(payload);
      if (res.success) navigate("/employer/internships");
      else setError(res.message || "Failed");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20";

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/employer/internships" className="text-sm font-bold text-slate-500">
          ← My Internships
        </Link>
        <h1 className="text-2xl font-extrabold text-[#f59e0b] mt-3">Post Internship</h1>
        <p className="text-sm text-slate-500 mb-6">Geeta University · CareerConnect Employer</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <input name="title" value={form.title} onChange={onChange} required placeholder="Title *" className={input} />
          <div className="grid grid-cols-2 gap-3">
            <select name="workMode" value={form.workMode} onChange={onChange} className={input}>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
            <input name="location" value={form.location} onChange={onChange} required placeholder="Location *" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input name="stipend" value={form.stipend} onChange={onChange} placeholder="₹20,000/month" className={input} />
            <input name="duration" value={form.duration} onChange={onChange} placeholder="3 months" className={input} />
          </div>
          <input name="eligibility" value={form.eligibility} onChange={onChange} placeholder="Eligibility" className={input} />
          <textarea name="description" value={form.description} onChange={onChange} required rows={4} placeholder="Description *" className={input + " h-auto py-3"} />
          <textarea name="responsibilities" value={form.responsibilities} onChange={onChange} rows={3} placeholder="Responsibilities (one per line)" className={input + " h-auto py-3"} />
          <input name="requiredSkills" value={form.requiredSkills} onChange={onChange} placeholder="Skills (comma separated)" className={input} />
          <input type="date" name="deadline" value={form.deadline} onChange={onChange} className={input} />
          <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-bold disabled:opacity-50">
            {loading ? "Publishing..." : "Publish Internship"}
          </button>
        </form>
      </div>
    </div>
  );
}