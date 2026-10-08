import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getMyPosts, updateStatus, remove } from "../../services/internshipService";
import ModerationBadge from "../../components/employer/ModerationBadge";
import EmployerNavbar from "../../components/employer/EmployerNavbar";
import { canEmployerRepublish } from "../../utils/listingModeration";

export default function MyInternships() {
  const { user } = useSelector((state) => state.auth);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMyPosts();
      const raw = res.internships || res.data || [];
      const myUserId = (user?._id || user?.id || "").toString();
      const filtered = myUserId
        ? raw.filter((i) => (i.createdBy?._id || i.createdBy)?.toString() === myUserId)
        : raw;
      setList(filtered);
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
      setError("");
      const res = await updateStatus(id, status);
      const updated = res.internship || res.data;
      setList((p) => p.map((i) => (i._id === id ? { ...i, ...(updated || { status }) } : i)));
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <EmployerNavbar />
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#f59e0b]">Manage Internships</h1>
            <p className="text-sm text-slate-500">Post, pause and close your internships</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/employer/internships/new"
              className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold"
            >
              + Post Internship
            </Link>
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

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
                    {["Pending Approval", "Rejected", "Draft"].includes(item.status) ? (
                      <ModerationBadge status={item.status} className="text-xs" />
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100">
                        {item.isExpired || item.closedReason === "expired" ? "Expired" : item.status}
                      </span>
                    )}
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
                    {(item.status === "Published" || canEmployerRepublish(item)) && (
                      <option value="Published">Published</option>
                    )}
                    {["Pending Approval", "Rejected"].includes(item.status) && (
                      <option value={item.status} disabled>
                        {item.status}
                      </option>
                    )}
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