import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../../services/jobService";
import { applyOpportunity } from "../../services/studentDashboardService";

export default function Jobs({
  embedded = false,
  studentProfile,
  onApply,
  onSave,
  savedIds = [],
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [localSavedIds, setLocalSavedIds] = useState(savedIds);
  const [appliedIds, setAppliedIds] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const params = {};
        if (q) params.search = q;
        if (source) params.source = source;
        if (workMode) params.workMode = workMode;
        const res = await getJobs(params);
        setList(res?.jobs || []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, source, workMode]);

  const handleApplyClick = async (item) => {
    if (onApply) {
      onApply(item);
      return;
    }

    try {
      const res = await applyOpportunity({
        opportunityId: item._id || item.id,
        jobId: item._id || item.id,
        title: item.title,
        company: item.company || item.companyName,
        type: item.type || "Full-Time",
      });
      if (res?.success) {
        setAppliedIds((prev) => [...prev, item._id || item.id]);
        showToast(res.message || `Applied for "${item.title}"!`, "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to apply", "error");
    }
  };

  const handleSaveClick = (item) => {
    const id = item._id || item.id;
    if (onSave) {
      onSave(item);
    }
    setLocalSavedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const content = (
    <>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          {!embedded && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Geeta University · CareerConnect
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Jobs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Campus openings + curated external listings
          </p>
        </div>
        {!embedded && (
          <Link
            to="/applications"
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af]"
          >
            My Applications →
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role, company, or skill..."
            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-[#1e3a8a]"
          >
            <option value="">All sources</option>
            <option value="campus">Campus only</option>
            <option value="external">External only</option>
          </select>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-[#1e3a8a]"
          >
            <option value="">All work modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { id: "", label: "All" },
            { id: "campus", label: "Campus" },
            { id: "external", label: "External" },
          ].map((chip) => (
            <button
              key={chip.id || "all"}
              type="button"
              onClick={() => setSource(chip.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                source === chip.id
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className="text-xs font-semibold text-slate-500 mb-4">
          {list.length} job{list.length !== 1 ? "s" : ""} found
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading jobs...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-14 rounded-2xl bg-white border border-slate-200">
          <div className="text-3xl mb-2">💼</div>
          <h3 className="text-base font-bold text-slate-800">No jobs found</h3>
          <p className="text-sm text-slate-500 mt-1">Try changing filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.map((item) => {
            const itemId = item._id || item.id;
            const isSaved = (savedIds.length ? savedIds : localSavedIds).includes(itemId);
            const isApplied = appliedIds.includes(itemId);

            return (
              <article
                key={itemId}
                className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#1e3a8a]/30 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {item.isExternal ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          External · {item.source || item.platformSource || "API"}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          ✓ Campus
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {item.workMode || "On-Site"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {item.type || item.opportunityType || "Full-Time"}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 group-hover:text-[#1e3a8a] transition line-clamp-1">
                      {item.title}
                    </h2>
                    <p className="text-sm font-semibold text-slate-600 mt-0.5">
                      {item.company || item.companyName || item.employerId?.companyName || "Company"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">📍 {item.location || "India"}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1e3a8a]">
                        {item.salary || "Competitive Package"}
                      </span>
                      {item.requiredSkills?.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-stretch gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSaveClick(item)}
                      className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                        isSaved
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title={isSaved ? "Saved" : "Save Job"}
                    >
                      {isSaved ? "★ Saved" : "☆ Save"}
                    </button>

                    {item.applyLink ? (
                      <a
                        href={item.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm transition gap-1"
                      >
                        <span>Apply Online</span>
                        <span>↗</span>
                      </a>
                    ) : isApplied ? (
                      <span className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        ✓ Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplyClick(item)}
                        className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm transition"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-slide-in-right ${
            toast.type === "error"
              ? "bg-rose-900 text-white border border-rose-700"
              : "bg-slate-900 text-white border border-slate-700"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold">
              GU
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Geeta University
              </p>
              <p className="text-sm font-bold text-slate-900">CareerConnect</p>
            </div>
          </Link>
          <Link
            to="/applications"
            className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af]"
          >
            My Applications →
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white p-6 sm:p-8 relative overflow-hidden shadow-md">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Explore Career Opportunities
          </h1>
          <p className="text-sm text-blue-100 mt-2 max-w-xl">
            Discover vetted on-campus placement drives and verified industry job opportunities tailored to your career trajectory.
          </p>
        </div>

        {content}
      </main>
    </div>
  );
}
