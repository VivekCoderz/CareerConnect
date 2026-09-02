// pages/student/Internships.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInternships } from "../../services/internshipService";

export default function Internships() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [workMode, setWorkMode] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = {};
        if (q) params.q = q;
        if (source) params.source = source;
        if (workMode) params.workMode = workMode;
        const res = await getInternships(params);
        setList(res.internships || []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, source, workMode]);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#1e3a8a]">Internships</h1>
        <p className="text-sm text-slate-500 mb-6">Campus + external openings</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="flex-1 h-11 rounded-xl border px-4 text-sm" />
          <select value={source} onChange={(e) => setSource(e.target.value)} className="h-11 rounded-xl border px-3 text-sm">
            <option value="">All</option>
            <option value="campus">Campus</option>
            <option value="external">External</option>
          </select>
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="h-11 rounded-xl border px-3 text-sm">
            <option value="">All modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <div key={item._id} className="bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.isExternal ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {item.isExternal ? `External · ${item.source}` : "Campus"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100">{item.workMode}</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.companyName} · {item.location}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{item.stipend}{item.duration ? ` · ${item.duration}` : ""}</p>
                </div>
                <Link to={`/internships/${item._id}`} className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold text-center">
                  View & Apply
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}