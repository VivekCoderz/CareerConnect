import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getAdminReports, updateAdminReportStatus } from "../../services/adminService";
import { BarChart3, Search, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getAdminReports({ status: statusFilter });
      if (res?.success) {
        setReports(res.reports || []);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setResolving(true);
      await updateAdminReportStatus(reportId, newStatus, resolutionNotes);
      setSelectedReport(null);
      setResolutionNotes("");
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update report status");
    } finally {
      setResolving(false);
    }
  };

  return (
    <AdminLayout onRefresh={fetchReports} isRefreshing={loading}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Reports & Trust</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {reports.length} Reports Logged
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review and resolve platform flags, user complaints, spam, and policy violations.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 outline-none shadow-xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">Report Category</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">Tenant / Company</th>
                <th className="px-5 py-3">Reported By</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Loading reports from MongoDB...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    0 reports found. No current trust or spam flags filed.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{r.reportType}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">{r.details}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.companyId?.name || "Global / Unassigned"}</td>
                    <td className="px-5 py-3.5 text-slate-500">{r.reportedByName || "User"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === "Open"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : r.status === "Under Review"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedReport(r)}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Review Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Review Report: {selectedReport.reportType}</h2>
                <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p><strong>Reported Details:</strong></p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                  {selectedReport.details}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Notes</label>
                <textarea
                  rows="3"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain resolution or dismissal rationale..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={resolving}
                  onClick={() => handleUpdateStatus(selectedReport._id, "Dismissed")}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Dismiss
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => handleUpdateStatus(selectedReport._id, "Under Review")}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition"
                  >
                    Mark In Review
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => handleUpdateStatus(selectedReport._id, "Resolved")}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                  >
                    Resolve Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
