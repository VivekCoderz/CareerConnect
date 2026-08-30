import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyApplications, withdraw } from "../../services/applicationService";

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMyApplications();
      if (res.success) {
        setApplications(res.applications);
      } else {
        setError(res.message || "Failed to load applications");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (appId) => {
    if (!window.confirm("Are you sure you want to withdraw this application? This action cannot be undone.")) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      const res = await withdraw(appId);
      if (res.success) {
        // Refresh the list
        fetchApplications();
      } else {
        setError(res.message || "Failed to withdraw application");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to withdraw application.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Hired":
        return "bg-green-50 text-green-700 border border-green-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border border-red-200";
      case "Withdrawn":
        return "bg-slate-100 text-slate-500 border border-slate-200";
      case "Offered":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      case "Interview":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "Shortlisted":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Under Review":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

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
              My Applications
            </h2>
            <p className="mt-2 text-slate-600">
              Track the progress and status of your active placement applications.
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
      </div>

      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200 mb-6">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

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
  );
}
