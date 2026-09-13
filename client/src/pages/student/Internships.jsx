import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInternships } from "../../services/internshipService";

export default function Internships({
  embedded = false,
  onSelectInternship,
  studentProfile,
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [workMode, setWorkMode] = useState("");

  const fetchList = async (pageToFetch = currentPage) => {
    try {
      setLoading(true);
      const params = {
        opportunityType: "internship",
        page: pageToFetch,
        limit: 10,
      };
      if (q) params.q = q;
      if (source) params.source = source;
      if (workMode) params.workMode = workMode;
      const res = await getInternships(params);
      const items = res?.internships || res?.data || [];
      setList(items.slice(0, 10));
      const total = res?.pagination?.total ?? items.length;
      setTotalCount(total);
      setTotalPages(res?.pagination?.totalPages || Math.ceil(total / 10) || 1);
    } catch {
      setList([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchList(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, source, workMode]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchList(newPage);
    }
  };

  const openDetail = (id) => {
    if (onSelectInternship) onSelectInternship(id);
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
            Internships
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
          Showing <span className="text-slate-900 font-bold">{totalCount > 0 ? `${((currentPage - 1) * 10) + 1}–${Math.min(currentPage * 10, totalCount)} of ${totalCount}` : list.length}</span> internship{totalCount !== 1 ? "s" : ""}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading internships...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-14 rounded-2xl bg-white border border-slate-200">
          <div className="text-3xl mb-2">📋</div>
          <h3 className="text-base font-bold text-slate-800">No internships found</h3>
          <p className="text-sm text-slate-500 mt-1">Try changing filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.slice(0, 10).map((item) => (
            <article
              key={item._id}
              className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#1e3a8a]/30 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {item.isExternal ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        External · {item.source || "API"}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        ✓ Campus
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {item.workMode}
                    </span>
                    {item.duration && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {item.duration}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-[#1e3a8a] transition line-clamp-1">
                    {item.title}
                  </h2>
                  <p className="text-sm font-semibold text-slate-600 mt-0.5">
                    {item.companyName || item.employerId?.companyName || "Company"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">📍 {item.location}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#1e3a8a]">
                      {item.stipend || "Stipend not disclosed"}
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

                <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                  {item.applyLink ? (
                    <a
                      href={item.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm transition"
                    >
                      Apply Online ↗
                    </a>
                  ) : onSelectInternship ? (
                    <button
                      type="button"
                      onClick={() => openDetail(item._id)}
                      className="h-10 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm transition"
                    >
                      View & Apply
                    </button>
                  ) : (
                    <Link
                      to={`/internships/${item._id}`}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm transition"
                    >
                      View & Apply
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            Page <span className="text-slate-900 font-bold">{currentPage}</span> of <span className="text-slate-900 font-bold">{totalPages}</span>
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    acc.push("...");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      disabled={loading}
                      className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition ${
                        currentPage === p
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next →
            </button>
          </div>
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-2">
              Placement Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Internships for you
            </h1>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Campus-verified openings and curated external listings on CareerConnect.
            </p>
          </div>
        </div>
        {content}
      </main>
    </div>
  );
}