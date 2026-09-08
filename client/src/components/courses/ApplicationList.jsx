import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import api from "../../api/api";

/**
 * ApplicationList
 * Renders list of student applications / enrollments for a specific course.
 * Used by Employers / Instructors.
 */
const ApplicationList = ({ courseId, courseTitle }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchApplications = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/applications`);
      if (res.data?.success) {
        setApplications(res.data.applications || []);
      }
    } catch (err) {
      console.error("Fetch Course Applications Error:", err);
      setError(err.response?.data?.message || "Failed to load course applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [courseId]);

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      const res = await api.patch(
        `/courses/${courseId}/applications/${applicationId}/status`,
        { status: newStatus }
      );

      if (res.data?.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app._id === applicationId ? { ...app, status: newStatus } : app
          )
        );
      }
    } catch (err) {
      console.error("Update Application Status Error:", err);
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics computation
  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === "Applied").length,
    enrolled: applications.filter((a) => a.status === "Enrolled").length,
    completed: applications.filter((a) => a.status === "Completed").length,
    rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  // Filtered applications
  const filteredApplications = applications.filter((app) => {
    const matchesFilter = filter === "All" || app.status === filter;
    const studentName = app.student?.fullName || app.student?.username || "";
    const studentEmail = app.student?.email || "";
    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Applied":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock size={12} /> Applied
          </span>
        );
      case "Enrolled":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <UserCheck size={12} /> Enrolled
          </span>
        );
      case "Completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
            <CheckCircle size={12} /> Completed
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <div className="w-8 h-8 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">
          Loading student applications...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Applicants</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-blue-600">Pending Review</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.applied}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-emerald-600">Enrolled Learners</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.enrolled}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <p className="text-xs font-semibold text-teal-700">Course Graduates</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["All", "Applied", "Enrolled", "Completed", "Rejected"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === st
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or email..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-[#1e3a8a] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={fetchApplications}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh List"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Applications Table / Cards */}
      {filteredApplications.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
          <Users size={32} className="mx-auto text-slate-300" />
          <h4 className="text-sm font-bold text-slate-800">No applications found</h4>
          <p className="text-xs text-slate-500">
            No student enrollment requests match your current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => {
            const student = app.student || {};
            const isUpdating = updatingId === app._id;

            return (
              <div
                key={app._id}
                className="p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {student.fullName ? student.fullName[0].toUpperCase() : "S"}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {student.fullName || student.username || "Student"}
                    </h4>
                    <p className="text-xs text-slate-500">{student.email}</p>
                    <p className="text-[10.5px] text-slate-400 mt-0.5">
                      Applied on: {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {getStatusBadge(app.status)}

                  {app.status === "Applied" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(app._id, "Enrolled")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                      >
                        Approve / Enroll
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(app._id, "Rejected")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApplicationList;
