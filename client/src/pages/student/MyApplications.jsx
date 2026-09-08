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
  const [viewingAppModal, setViewingAppModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplicationsAndOffers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const [appRes, offerRes] = await Promise.all([
        getMyApplications().catch(() => ({
          success: false,
          applications: [],
        })),
        recruitmentService.getOffers().catch(() => ({
          success: false,
          offers: [],
        })),
      ]);

      if (appRes.success) {
        setApplications(appRes.applications || []);
      } else if (!silent) {
        setError(appRes.message || "Failed to load applications");
      }

      if (offerRes?.offers) {
        setOffers(offerRes.offers || []);
      }
    } catch (err) {
      if (!silent) {
        setError(
          err.response?.data?.message ||
            "Failed to load applications & offers."
        );
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplicationsAndOffers();

    // Dynamic background status synchronization (poll every 6 seconds)
    const pollTimer = setInterval(() => {
      fetchApplicationsAndOffers(true);
    }, 6000);

    const onWindowFocus = () => {
      fetchApplicationsAndOffers(true);
    };

    window.addEventListener("focus", onWindowFocus);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchApplicationsAndOffers(true);
  };

  const handleWithdraw = async (appId) => {
    if (!window.confirm("Withdraw this application?")) return;

    try {
      setActionLoading(true);
      setError("");

      const res = await withdraw(appId);

      if (res.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a._id === appId
              ? {
                  ...a,
                  status: "Withdrawn",
                  stage: "Withdrawn",
                }
              : a
          )
        );

        await fetchApplicationsAndOffers();
      } else {
        setError(res.message || "Failed to withdraw");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to withdraw."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-2xs";

      case "Interview Scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200 font-bold animate-pulse";

      case "Interview Completed":
        return "bg-purple-50 text-purple-700 border-purple-200 font-bold";

      case "Selected":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-black";

      case "Hired":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";

      case "Withdrawn":
        return "bg-slate-100 text-slate-500 border-slate-200";

      case "Offered":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";

      case "Offer":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse";

      case "Interview":
        return "bg-purple-50 text-purple-700 border-purple-200";

      case "Shortlisted":
        return "bg-amber-50 text-amber-800 border-amber-200 font-bold";

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
    "Approved",
    "Under Review",
    "Shortlisted",
    "Interview Scheduled",
    "Interview Completed",
    "Selected",
    "Offered",
    "Hired",
    "Rejected",
    "Withdrawn",
  ];

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8"}>
      <main className={embedded ? "" : "max-w-5xl mx-auto"}>
        {!embedded && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e3a8a] to-blue-700 text-white p-6 sm:p-8 mb-8 shadow-sm">
            <div className="relative z-10">
              <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-2">
                Application tracker
              </p>

              <h1 className="text-2xl sm:text-3xl font-bold">
                My Applications
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                {applications.length} total application
                {applications.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {embedded && (
          <div className="mb-5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              My Applications
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track internship & job applications
            </p>
          </div>
        )}

        {!embedded && (
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Application History
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Track all your job and internship applications
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
              >
                <span className={refreshing ? "animate-spin" : ""}>🔄</span>
                <span>{refreshing ? "Updating..." : "Refresh Status"}</span>
              </button>

              <Link
                to="/internships"
                className="text-xs font-bold text-[#1e3a8a]"
              >
                Browse Internships →
              </Link>
            </div>
          </div>
        )}

        {/* Status Filters */}
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

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Offers */}
        {offers.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 rounded-3xl border border-amber-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎉</span>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Official Job Offers Received ({offers.length})
                  </h3>

                  <p className="text-xs text-slate-600">
                    Congratulations! You have received official employment
                    offer letter(s).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {offers.map((off) => {
                const isPending = ["Sent", "Viewed"].includes(
                  off.status
                );

                return (
                  <div
                    key={off._id}
                    className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {off.designation}
                        </span>

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
                        {off.employerId?.companyName ||
                          "Partner Organization"}{" "}
                        • {off.department}
                      </p>

                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">
                            Offered CTC:
                          </span>

                          <span className="font-bold text-slate-900">
                            ₹
                            {off.salary?.toLocaleString()}{" "}
                            {off.salaryPeriod}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">
                            Joining Date:
                          </span>

                          <span className="font-bold text-blue-900">
                            {off.joiningDate
                              ? new Date(
                                  off.joiningDate
                                ).toLocaleDateString()
                              : "Immediate"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOffer(off)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                        isPending
                          ? "bg-[#f59e0b] hover:bg-[#d97706] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      <span>📄</span>

                      <span>
                        {isPending
                          ? "Review & Respond to Offer"
                          : "View Official Offer Letter"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Applications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              My Application History
            </h3>

            <span className="text-xs text-slate-500">
              {filtered.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-3" />

              <p className="text-sm text-slate-500">
                Loading applications...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 rounded-2xl bg-white border border-slate-200">
              <div className="text-3xl mb-2">📄</div>

              <h3 className="text-base font-bold text-slate-800">
                {filter === "All"
                  ? "No applications yet"
                  : `No “${filter}” applications`}
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Apply to campus internships to track them here.
              </p>

              <Link
                to="/internships"
                className="mt-5 inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
              >
                Browse Internships
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => {
                const opportunity =
                  app.internshipId || app.jobId;

                const isWithdrawn =
                  app.status === "Withdrawn";

                const cannotWithdraw = [
                  "Hired",
                  "Rejected",
                  "Withdrawn",
                ].includes(app.status);

                return (
                  <div
                    key={app._id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:shadow-sm transition-shadow shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>

                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {app.opportunityType ||
                            "Internship"}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {app.opportunityTitle ||
                          opportunity?.title ||
                          "Opportunity"}
                      </h3>

                      <p className="text-sm font-semibold text-slate-600">
                        {app.companyName ||
                          opportunity?.companyName ||
                          "Company"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
                        <div>
                          <p className="font-bold text-slate-400 uppercase tracking-wider">
                            Applied On
                          </p>

                          <p className="font-semibold text-slate-800 mt-0.5">
                            {app.createdAt
                              ? new Date(
                                  app.createdAt
                                ).toLocaleDateString(
                                  "en-IN"
                                )
                              : "N/A"}
                          </p>
                        </div>

                        {opportunity?.location && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">
                              Location
                            </p>

                            <p className="font-semibold text-slate-800 mt-0.5">
                              {opportunity.location}
                            </p>
                          </div>
                        )}

                        {opportunity?.stipend && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">
                              Stipend
                            </p>

                            <p className="font-semibold text-slate-800 mt-0.5">
                              {opportunity.stipend}
                            </p>
                          </div>
                        )}

                        {app.stage && !isWithdrawn && (
                          <div>
                            <p className="font-bold text-slate-400 uppercase tracking-wider">
                              ATS Stage
                            </p>

                            <p className="font-semibold text-slate-800 mt-0.5">
                              {app.stage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 md:mt-0 md:ml-6 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingAppModal(app)}
                        className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <span>📄</span>
                        <span>View Application</span>
                      </button>

                      {app.internshipId && (
                        <Link
                          to={`/internships/${
                            app.internshipId._id ||
                            app.internshipId
                          }`}
                          className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          Listing Info
                        </Link>
                      )}

                      {!cannotWithdraw && (
                        <button
                          type="button"
                          onClick={() =>
                            handleWithdraw(app._id)
                          }
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
      </main>

      {/* Candidate Application Submitted Details Modal */}
      {viewingAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-blue-700 text-white relative">
              <button
                type="button"
                onClick={() => setViewingAppModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-sm font-bold"
              >
                ✕
              </button>
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border inline-block mb-2 ${
                getStatusBadgeClass(viewingAppModal.status)
              }`}>
                {viewingAppModal.status}
              </span>
              <h2 className="text-xl font-bold">
                {viewingAppModal.opportunityTitle || viewingAppModal.internshipId?.title || viewingAppModal.jobId?.title || "Application"}
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                {viewingAppModal.companyName || viewingAppModal.internshipId?.companyName || viewingAppModal.jobId?.companyName || "Company"} · Applied on{" "}
                {viewingAppModal.createdAt ? new Date(viewingAppModal.createdAt).toLocaleDateString("en-IN") : "Recently"}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Submitted Applicant Info</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Name</span>
                    <span className="font-semibold text-slate-900">{viewingAppModal.studentName || viewingAppModal.applicationData?.fullName || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email</span>
                    <span className="font-semibold text-slate-900">{viewingAppModal.studentEmail || viewingAppModal.applicationData?.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phone</span>
                    <span className="font-semibold text-slate-900">{viewingAppModal.studentPhone || viewingAppModal.applicationData?.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Education</span>
                    <span className="font-semibold text-slate-900">{viewingAppModal.education || viewingAppModal.applicationData?.education || "N/A"}</span>
                  </div>
                </div>
              </div>

              {(viewingAppModal.skills?.length > 0 || viewingAppModal.applicationData?.skills) && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Skills Submitted</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(viewingAppModal.skills)
                      ? viewingAppModal.skills
                      : Array.isArray(viewingAppModal.applicationData?.skills)
                      ? viewingAppModal.applicationData.skills
                      : [viewingAppModal.applicationData?.skills || viewingAppModal.skills]
                    ).map((s, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewingAppModal.resumeUrl && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Submitted Resume</h4>
                    <p className="text-slate-500 text-[11px]">Your linked document</p>
                  </div>
                  <a
                    href={viewingAppModal.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-blue-800 transition"
                  >
                    View Resume ↗
                  </a>
                </div>
              )}

              {(viewingAppModal.coverLetter || viewingAppModal.coverNote) && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Cover Note</h4>
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-line">
                    {viewingAppModal.coverLetter || viewingAppModal.coverNote}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingAppModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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