import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyApplications, withdraw } from "../../services/applicationService";
import recruitmentService from "../../services/recruitmentService";
import CandidateOfferResponseModal from "../../components/student/CandidateOfferResponseModal";

export default function MyApplications({ embedded = false }) {
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedOffer, setSelectedOffer] = useState(null);

  const fetchApplicationsAndOffers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyApplications();
      if (res.success) setApplications(res.applications || []);
      else setError(res.message || "Failed to load applications");
      const [appRes, offerRes] = await Promise.all([
        getMyApplications().catch(() => ({ success: false, applications: [] })),
        recruitmentService.getOffers().catch(() => ({ success: false, offers: [] })),
      ]);

      if (appRes.success) {
        setApplications(appRes.applications || []);
      }
      if (offerRes?.offers) {
        setOffers(offerRes.offers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load applications & offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsAndOffers();
  }, []);

  const handleWithdraw = async (appId) => {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      setActionLoading(true);
      setError("");
      const res = await withdraw(appId);
      if (res.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a._id === appId ? { ...a, status: "Withdrawn", stage: "Withdrawn" } : a
          )
        );
        fetchApplicationsAndOffers();
      } else {
        setError(res.message || "Failed to withdraw");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to withdraw.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Hired":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "Withdrawn":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "Offered":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Offer":
        return "bg-amber-50 text-amber-800 border border-amber-300 font-bold animate-pulse";
      case "Interview":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Shortlisted":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Under Review":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const filtered =
    filter === "All"
      ? applications
      : applications.filter((a) => a.status === filter);

  const statusTabs = [
    "All",
    "Applied",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Offered",
    "Hired",
    "Rejected",
    "Withdrawn",
  ];

  const listBlock = (
    <>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track internship & job applications
          </p>
  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
              GEETA UNIVERSITY
            </h1>
            <h2 className="text-3xl font-extrabold text-[#1e3a8a] tracking-tight">
              My Applications & Job Offers
            </h2>
            <p className="mt-2 text-slate-600">
              Track your recruitment pipeline stages and review official employment offer letters.
            </p>
          </div>
          <Link
            to="/internships"
            className="mt-4 sm:mt-0 inline-flex items-center text-sm font-bold text-[#1e3a8a] hover:text-[#1e40af] transition-colors"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Browse Listings
          </Link>
        </div>
        {!embedded && (
          <Link to="/internships" className="text-xs font-bold text-[#1e3a8a]">
            Browse Internships →
          </Link>
        )}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              filter === tab
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 rounded-2xl bg-white border border-slate-200">
          <div className="text-3xl mb-2">📄</div>
          <h3 className="text-base font-bold text-slate-800">
            {filter === "All" ? "No applications yet" : `No “${filter}” applications`}
          </h3>
          <p className="text-sm text-slate-500 mt-1">Apply to campus internships to track them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const opportunity = app.internshipId || app.jobId;
            const cannotWithdraw = ["Hired", "Rejected", "Withdrawn"].includes(app.status);
            const internshipId = app.internshipId?._id || app.internshipId || null;

            return (
              <article
                key={app._id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-[#1e3a8a]/25 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                          app.status
                        )}`}
                      >
                        {app.status}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {app.opportunityType || "Internship"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {app.opportunityTitle || opportunity?.title || "Opportunity"}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600 mt-0.5">
                      {app.companyName || opportunity?.companyName || "Company"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Applied{" "}
                      {new Date(app.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {opportunity?.stipend ? ` · ${opportunity.stipend}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {internshipId && !embedded && (
                      <Link
                        to={`/internships/${internshipId}`}
                        className="h-9 px-3.5 inline-flex items-center rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                      >
                        View role
                      </Link>
                    )}
                    {!cannotWithdraw && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(app._id)}
                        disabled={actionLoading}
                        className="h-9 px-3.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="w-full">{listBlock}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
          <Link to="/internships" className="text-xs font-bold text-[#1e3a8a]">
            Browse Internships →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#f59e0b]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-2">
              Application tracker
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">My Applications</h1>
            <p className="mt-2 text-sm text-blue-100">
              {applications.length} total application{applications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {listBlock}
      </main>
      <div className="max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        {/* ACTIVE JOB OFFERS BANNER & SECTION */}
        {offers.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 rounded-3xl border border-amber-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎉</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Official Job Offers Received ({offers.length})
                  </h3>
                  <p className="text-xs text-slate-600">
                    Congratulations! You have received official employment offer letter(s).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {offers.map((off) => {
                const isPending = ["Sent", "Viewed"].includes(off.status);
                return (
                  <div
                    key={off._id}
                    className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{off.designation}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            off.status === "Accepted"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : off.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          {off.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {off.employerId?.companyName || "Partner Organization"} • {off.department}
                      </p>

                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Offered CTC:</span>
                          <span className="font-bold text-slate-900">₹{off.salary?.toLocaleString()} {off.salaryPeriod}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Joining Date:</span>
                          <span className="font-bold text-blue-900">
                            {off.joiningDate ? new Date(off.joiningDate).toLocaleDateString() : "Immediate"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOffer(off)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                        isPending
                          ? "bg-[#f59e0b] hover:bg-[#d97706] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>📄</span>
                      <span>{isPending ? "Review & Respond to Offer" : "View Official Offer Letter"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APPLICATIONS LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">My Application History</h3>
            <span className="text-xs text-slate-500">{applications.length} Total</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1e3a8a]"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-bold text-slate-700">No applications yet</h3>
              <p className="mt-2 text-sm text-slate-500">
                You have not applied to any job or internship opportunities.
              </p>
              <Link
                to="/internships"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors shadow-sm"
              >
                Search Internships
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const opportunity = app.internshipId || app.jobId;
                const isWithdrawn = app.status === "Withdrawn";
                const cannotWithdraw = ["Hired", "Rejected", "Withdrawn"].includes(app.status);

                return (
                  <div
                    key={app._id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:shadow-sm transition-shadow shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {app.opportunityType}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {app.opportunityTitle || (opportunity?.title) || "Opportunity"}
                      </h3>
                      <p className="text-sm font-semibold text-slate-600">
                        {app.companyName || (opportunity?.companyName) || "Company"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-wider">Applied On</p>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {opportunity?.location && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">Location</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{opportunity.location}</p>
                          </div>
                        )}
                        {opportunity?.stipend && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">Stipend</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{opportunity.stipend}</p>
                          </div>
                        )}
                        {app.stage && !isWithdrawn && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">ATS Stage</p>
                            <p className="font-semibold text-slate-800 mt-0.5">{app.stage}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 md:mt-0 md:ml-6 flex items-center gap-3">
                      {app.internshipId && (
                        <Link
                          to={`/internships/${app.internshipId._id || app.internshipId}`}
                          className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          View Details
                        </Link>
                      )}

                      {!cannotWithdraw && (
                        <button
                          onClick={() => handleWithdraw(app._id)}
                          disabled={actionLoading}
                          className="px-4 py-2 border border-transparent text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Candidate Offer Response Modal */}
      <CandidateOfferResponseModal
        isOpen={Boolean(selectedOffer)}
        onClose={() => setSelectedOffer(null)}
        offer={selectedOffer}
        onOfferResponded={fetchApplicationsAndOffers}
      />
    </div>
  );
}