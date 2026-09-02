import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyPosts, updateStatus, remove, syncExternal } from "../../services/internshipService";

export default function MyInternships() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMyPosts();
      setList(res.internships || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onStatus = async (id, status) => {
    try {
      await updateStatus(id, status);
      setList((p) => p.map((i) => (i._id === id ? { ...i, status } : i)));
    } catch (err) {
      setError(err.response?.data?.message || "Status update failed");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this internship?")) return;
    try {
      await remove(id);
      setList((p) => p.filter((i) => i._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const onSync = async () => {
    try {
      setSyncing(true);
      setMsg("");
      const res = await syncExternal();
      setMsg(`Synced ${res.upserted || 0} external internships`);
    } catch (err) {
      setError(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#f59e0b]">Manage Internships</h1>
            <p className="text-sm text-slate-500">Post, pause, close · sync external boards</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
            >
              {syncing ? "Syncing..." : "Sync External APIs"}
            </button>
            <Link
              to="/employer/internships/new"
              className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold"
            >
              + Post Internship
            </Link>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {msg && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{msg}</div>}

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16 bg-white border rounded-2xl">
            <p className="text-slate-600 font-semibold">No internships yet</p>
            <Link to="/employer/internships/new" className="mt-3 inline-block text-sm font-bold text-[#f59e0b]">
              Post your first internship →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <div key={item._id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100">{item.status}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600">{item.workMode}</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.location} · {item.stipend} · Applicants: {item.applicantsCount || 0}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/employer/internships/${item._id}/edit`}
                    className="h-9 px-3 rounded-xl border text-xs font-bold text-slate-700"
                  >
                    Edit
                  </Link>
                  <select
                    value={item.status}
                    onChange={(e) => onStatus(item._id, e.target.value)}
                    className="h-9 px-2 rounded-xl border text-xs bg-white"
                  >
                    <option value="Published">Published</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onDelete(item._id)}
                    className="h-9 px-3 rounded-xl border border-red-200 text-xs font-bold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}