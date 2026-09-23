import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import JourneyLoader from "../../components/common/JourneyLoader";
import {
  GraduationCap,
  BookOpen,
  FileText,
  FileEdit,
  Users,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Code2,
  BarChart3,
  Globe,
  Palette,
  Cloud,
  Eye,
  Edit2,
  Trash2,
  PlayCircle,
  Video,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowLeft,
  Check,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import {
  getEmployerCourses,
  deleteCourse,
  updateCourseStatus,
} from "../../services/courseService";

import api from "../../api/api";
import "./EmployeeCoursesPage.css";

/* =========================================================
   APPLICATION STATUS CONFIG
========================================================= */

const STATUS_CONFIG = {
  Applied: {
    label: "Applied",
    className: "bg-blue-50 text-blue-700 border border-blue-200/60",
  },
  New: {
    label: "New",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  },
  "Under Review": {
    label: "Under Review",
    className: "bg-blue-50 text-blue-700 border border-blue-200/60",
  },
  Shortlisted: {
    label: "Shortlisted",
    className: "bg-purple-50 text-purple-700 border border-purple-200/60",
  },
  Reviewed: {
    label: "Reviewed",
    className: "bg-slate-100 text-slate-700 border border-slate-200/60",
  },
  Enrolled: {
    label: "Enrolled",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  },
  Completed: {
    label: "Completed",
    className: "bg-purple-50 text-purple-700 border border-purple-200/60",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border border-rose-200/60",
  },
};

/* =========================================================
   STATUS BADGE COMPONENT
========================================================= */

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    className: "bg-slate-100 text-slate-700 border border-slate-200/60",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
};

/* =========================================================
   HELPERS: Relative Time Formatter
========================================================= */

const getRelativeTimeString = (dateInput) => {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};

/* Domain to Icon / Color Mapper */
const getDomainMeta = (domain = "", title = "") => {
  const text = `${domain} ${title}`.toLowerCase();
  if (text.includes("stack") || text.includes("web") || text.includes("code") || text.includes("software") || text.includes("developer")) {
    return {
      icon: Code2,
      bg: "bg-purple-50 text-purple-600 border-purple-100",
    };
  }
  if (text.includes("data") || text.includes("python") || text.includes("ai") || text.includes("machine") || text.includes("analytics")) {
    return {
      icon: BarChart3,
      bg: "bg-amber-50 text-amber-600 border-amber-100",
    };
  }
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("graphic")) {
    return {
      icon: Palette,
      bg: "bg-pink-50 text-pink-600 border-pink-100",
    };
  }
  if (text.includes("cloud") || text.includes("devops") || text.includes("aws") || text.includes("azure")) {
    return {
      icon: Cloud,
      bg: "bg-blue-50 text-blue-600 border-blue-100",
    };
  }
  return {
    icon: Globe,
    bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };
};

/* =========================================================
   APPLICATIONS PANEL COMPONENT
========================================================= */

const ApplicationsPanel = ({ onRefreshStats, courses = [] }) => {
  const [courseGroups, setCourseGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [expandedCourses, setExpandedCourses] = useState({});
  const [filterCourse, setFilterCourse] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/courses/my-applications");
      const data =
        response?.data?.courseGroups ||
        response?.data?.applications ||
        response?.data?.data ||
        response?.data ||
        [];

      setCourseGroups(Array.isArray(data) ? data : []);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error("Failed to fetch course applications:", err);
      setError(
        err?.response?.data?.message || "Failed to load course applications."
      );
    } finally {
      setLoading(false);
    }
  }, [onRefreshStats]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleUpdateStatus = async (courseId, applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      await api.patch(
        `/courses/${courseId}/applications/${applicationId}/status`,
        { status: newStatus }
      );
      await fetchApplications();
    } catch (err) {
      console.error("Failed to update application:", err);
      alert(
        err?.response?.data?.message || "Failed to update application status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const appStats = useMemo(() => {
    const allApplications = courseGroups.flatMap(
      (group) => group.applications || []
    );

    return {
      total: allApplications.length,
      applied: allApplications.filter(
        (a) => a.status === "Applied" || a.status === "New"
      ).length,
      enrolled: allApplications.filter((a) => a.status === "Enrolled").length,
      completed: allApplications.filter((a) => a.status === "Completed").length,
      rejected: allApplications.filter((a) => a.status === "Rejected").length,
    };
  }, [courseGroups]);

  const filteredGroups = useMemo(() => {
    return courseGroups
      .filter((group) => {
        const course = group.course || group;
        const courseId = (course?._id || group._id)?.toString();
        return filterCourse === "All" || courseId === filterCourse;
      })
      .map((group) => {
        const courseTitle =
          group.course?.title || group.title || "Course";

        const applications = (group.applications || []).filter((application) => {
          const matchesStatus =
            filterStatus === "All" || application.status === filterStatus;

          const studentName =
            application.student?.fullName ||
            application.student?.name ||
            application.user?.name ||
            application.studentName ||
            "";

          const studentEmail =
            application.student?.email ||
            application.user?.email ||
            application.studentEmail ||
            "";

          const query = searchQuery.trim().toLowerCase();
          const matchesSearch =
            !query ||
            studentName.toLowerCase().includes(query) ||
            studentEmail.toLowerCase().includes(query) ||
            courseTitle.toLowerCase().includes(query);

          return matchesStatus && matchesSearch;
        });

        return {
          ...group,
          applications,
        };
      })
      .filter((group) => group.applications.length > 0);
  }, [courseGroups, filterCourse, filterStatus, searchQuery]);

  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

    if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
        <p className="text-xs font-semibold text-rose-700">{error}</p>
        <button
          onClick={fetchApplications}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Application Sub-stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="text-[11px] font-semibold text-slate-500">Total Applicants</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{appStats.total}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-[11px] font-semibold text-blue-600">Pending Review</p>
          <p className="mt-0.5 text-lg font-bold text-blue-700">{appStats.applied}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-[11px] font-semibold text-emerald-600">Enrolled</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-700">{appStats.enrolled}</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
          <p className="text-[11px] font-semibold text-purple-600">Completed</p>
          <p className="mt-0.5 text-lg font-bold text-purple-700">{appStats.completed}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
          <p className="text-[11px] font-semibold text-rose-600">Rejected</p>
          <p className="mt-0.5 text-lg font-bold text-rose-700">{appStats.rejected}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, or course..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Course Filter */}
        <div className="relative">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Courses</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Applied">Applied</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Application List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-800">No applications found</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {courseGroups.length === 0
              ? "Students who apply to your courses will appear here."
              : "No applications match your active filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredGroups.map((group) => {
            const course = group.course || group;
            const courseId = course?._id;
            const isExpanded = expandedCourses[courseId] ?? true;

            return (
              <div
                key={courseId}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs"
              >
                {/* Course Header Toggle */}
                <button
                  type="button"
                  onClick={() => toggleCourse(courseId)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {course?.title || "Untitled Course"}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {group.applications.length} application
                        {group.applications.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-bold text-slate-400">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {/* Applications list */}
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100">
                    {group.applications.map((application) => {
                      const student =
                        application.student || application.user || {};
                      const studentName =
                        student.fullName ||
                        student.name ||
                        application.studentName ||
                        "Student";
                      const studentEmail =
                        student.email ||
                        application.studentEmail ||
                        "No email provided";

                      return (
                        <div
                          key={application._id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/40 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-900">
                                {studentName}
                              </h5>
                              <StatusBadge status={application.status} />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {studentEmail}
                            </p>
                            {application.createdAt && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Applied: {getRelativeTimeString(application.createdAt)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {(application.status === "Applied" ||
                              application.status === "New" ||
                              application.status === "Under Review") && (
                              <>
                                <button
                                  disabled={updatingId === application._id}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      courseId,
                                      application._id,
                                      "Enrolled"
                                    )
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                  {updatingId === application._id ? "Accepting..." : "Accept"}
                                </button>
                                <button
                                  disabled={updatingId === application._id}
                                  onClick={() =>
                                    handleUpdateStatus(
                                      courseId,
                                      application._id,
                                      "Rejected"
                                    )
                                  }
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =========================================================
   MAIN EMPLOYEE COURSES PAGE
========================================================= */

const EmployeeCoursesPage = ({
  embedded = false,
  onCreateCourse,
  onEditCourse,
  onManageContent,
  onViewDetails,
}) => {
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth || {});
  const [activeTab, setActiveTab] = useState("courses"); // "courses" or "applications"
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [deletingId, setDeletingId] = useState(null);
  const [statusLoading, setStatusLoading] = useState(null);

  /* =======================================================
     LOAD COURSES & APPLICATIONS
  ======================================================= */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [coursesRes, appsRes] = await Promise.allSettled([
        getEmployerCourses(),
        api.get("/courses/my-applications"),
      ]);

      if (coursesRes.status === "fulfilled") {
        const cData =
          coursesRes.value?.courses ||
          coursesRes.value?.data?.courses ||
          coursesRes.value?.data ||
          [];
        const rawCourses = Array.isArray(cData) ? cData : [];
        const myUserId = (user?._id || user?.id || "").toString();
        const userCourses = myUserId
          ? rawCourses.filter((c) => (c.createdBy?._id || c.createdBy)?.toString() === myUserId)
          : rawCourses;
        setCourses(userCourses);
      } else {
        console.error("Failed to load courses:", coursesRes.reason);
      }

      if (appsRes.status === "fulfilled") {
        const aData =
          appsRes.value?.data?.courseGroups ||
          appsRes.value?.data?.applications ||
          appsRes.value?.data?.data ||
          [];
        const flatApps = [];
        if (Array.isArray(aData)) {
          aData.forEach((group) => {
            if (group.applications && Array.isArray(group.applications)) {
              group.applications.forEach((app) => {
                flatApps.push({
                  ...app,
                  courseTitle: group.course?.title || group.title || "Course",
                  courseDomain: group.course?.domain || group.domain || "General",
                });
              });
            } else if (group._id && (group.student || group.user)) {
              flatApps.push({
                ...group,
                courseTitle: group.course?.title || group.title || "Course",
                courseDomain: group.course?.domain || group.domain || "General",
              });
            }
          });
        }
        // Sort newest applications first
        flatApps.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setApplications(flatApps);
      }
    } catch (err) {
      console.error("Failed to load course workspace data:", err);
      setError(err?.response?.data?.message || "Failed to load course data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =======================================================
     FILTERED COURSES
  ======================================================= */

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const title = course?.title?.toLowerCase() || "";
      const description = course?.description?.toLowerCase() || "";
      const domain = course?.domain?.toLowerCase() || "";
      const category = course?.category?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        domain.includes(query) ||
        category.includes(query);

      const status = course?.status || course?.courseStatus || "Draft";
      const matchesFilter = filter === "All" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [courses, search, filter]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const published = courses.filter((c) => c?.status === "Published").length;
    const draft = courses.filter((c) => c?.status === "Draft" || !c?.status).length;
    
    // Total enrolled students from both course counts and application enrolments
    const enrolledApps = applications.filter((a) => a.status === "Enrolled").length;
    const coursesSum = courses.reduce(
      (total, c) => total + Number(c?.enrolledStudents || c?.studentsCount || 0),
      0
    );
    const totalStudents = Math.max(coursesSum, enrolledApps);

    return {
      total: courses.length,
      published,
      draft,
      totalStudents,
    };
  }, [courses, applications]);

  /* =======================================================
     RECENT APPLICATIONS LIST (DYNAMIC - NO DUMMY DATA)
  ======================================================= */

  const recentApplicationsList = useMemo(() => {
    return applications.slice(0, 6).map((app) => ({
      id: app._id,
      courseTitle: app.courseTitle || app.course?.title || "Course",
      studentName:
        app.student?.fullName ||
        app.student?.username ||
        app.student?.name ||
        app.studentName ||
        "Student Applicant",
      timeAgo: getRelativeTimeString(app.createdAt),
      status: app.status || "Applied",
      domain: app.courseDomain || app.course?.domain || "",
    }));
  }, [applications]);

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleDelete = async (courseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(courseId);
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course._id !== courseId));
    } catch (err) {
      console.error("Failed to delete course:", err);
      alert(err?.response?.data?.message || "Failed to delete course.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (course) => {
    const currentStatus = course?.status || "Draft";
    const newStatus = currentStatus === "Published" ? "Draft" : "Published";

    try {
      setStatusLoading(course._id);
      await updateCourseStatus(course._id, newStatus);
      setCourses((prev) =>
        prev.map((item) =>
          item._id === course._id ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      console.error("Failed to update course status:", err);
      alert(err?.response?.data?.message || "Failed to update course status.");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleCreateClick = () => {
    if (onCreateCourse) {
      onCreateCourse();
    } else {
      navigate("/employer/courses/create");
    }
  };

  const handleEditClick = (courseId) => {
    if (onEditCourse) {
      onEditCourse(courseId);
    } else {
      navigate(`/employer/courses/${courseId}/edit`);
    }
  };

  const handleManageContentClick = (courseId) => {
    if (onManageContent) {
      onManageContent(courseId);
    } else {
      navigate(`/employer/courses/${courseId}/content`);
    }
  };

  const handleViewDetailsClick = (courseId) => {
    if (onViewDetails) {
      onViewDetails(courseId);
    } else {
      navigate(`/employer/courses/${courseId}`);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/employer/dashboard");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8"}>
      {/* Optional Back link for standalone view */}
      {!embedded && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* =====================================================
          1. HERO / BANNER SECTION
      ===================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-indigo-100/70 bg-gradient-to-r from-[#eef4ff] via-[#f3f1ff] to-[#f8f6ff] p-6 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Content */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm border border-indigo-50">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Course Management
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Create, manage and track your published courses. Help students learn and grow.
              </p>
            </div>
          </div>

          {/* Right Visual Illustration */}
          <div className="hidden sm:flex items-center gap-4 shrink-0 select-none">
            {/* Playful script annotation */}
            <div className="text-right">
              <span className="block text-xs font-medium text-indigo-600 tracking-tight" style={{ fontFamily: "cursive, sans-serif" }}>
                Empower learners
              </span>
              <span className="block text-xs font-medium text-indigo-500 tracking-tight" style={{ fontFamily: "cursive, sans-serif" }}>
                Build the future
              </span>
              {/* Curved arrow icon */}
              <div className="flex justify-end mt-0.5">
                <svg className="w-8 h-4 text-indigo-400" viewBox="0 0 32 16" fill="none" stroke="currentColor">
                  <path d="M2 14C10 14 24 12 28 4M28 4L22 4M28 4L28 10" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Books & Graduation Cap Graphic */}
            <div className="relative flex items-center justify-center w-20 h-16">
              <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none">
                {/* Book Stack */}
                <rect x="22" y="58" width="56" height="12" rx="3" fill="#cbdcf8" />
                <rect x="22" y="60" width="56" height="2" fill="#ffffff" />
                <rect x="18" y="72" width="64" height="14" rx="3" fill="#3b82f6" />
                <rect x="18" y="74" width="64" height="2" fill="#93c5fd" />
                {/* Graduation Cap */}
                <path d="M50 20L84 34L50 48L16 34L50 20Z" fill="#1e3a8a" />
                <path d="M50 20L84 34L50 38L16 34L50 20Z" fill="#2563eb" />
                <path d="M28 40V56C28 62 50 66 50 66C50 66 72 62 72 56V40" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Tassel */}
                <path d="M78 36V52" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="78" cy="54" r="2.5" fill="#f59e0b" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          2. 4 STATISTICS CARDS
      ===================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Courses */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Courses</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.total}
              </p>
              <p className="text-[11px] text-slate-400">
                {stats.total === 0 ? "No courses yet" : `${stats.total} total courses`}
              </p>
            </div>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50/80 text-blue-500">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Card 2: Published */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Published</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.published}
              </p>
              <p className="text-[11px] text-slate-400">
                {stats.published === 0 ? "No courses published" : `${stats.published} active courses`}
              </p>
            </div>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50/80 text-emerald-500">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Card 3: Drafts */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Drafts</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.draft}
              </p>
              <p className="text-[11px] text-slate-400">
                {stats.draft === 0 ? "No drafts available" : `${stats.draft} in draft`}
              </p>
            </div>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50/80 text-amber-500">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>

        {/* Card 4: Enrolled Learners */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Enrolled Learners</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {stats.totalStudents}
              </p>
              <p className="text-[11px] text-slate-400">
                {stats.totalStudents === 0 ? "No enrollments yet" : `${stats.totalStudents} learners`}
              </p>
            </div>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50/80 text-purple-500">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* =====================================================
          3. TWO COLUMN MAIN AREA: COURSE MGMT + RECENT APPS
      ===================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================================================
            LEFT COLUMN: COURSE MANAGEMENT CARD (Col 8)
        =================================================== */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
          {/* Top Bar: Tabs & Create Course CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("courses")}
                className={`relative py-2 text-xs sm:text-sm font-bold transition ${
                  activeTab === "courses"
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                My Courses
                {activeTab === "courses" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`relative py-2 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  activeTab === "applications"
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Course Applications
                {applications.length > 0 && (
                  <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                    {applications.length}
                  </span>
                )}
                {activeTab === "applications" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Course</span>
            </button>
          </div>

          {/* =================================================
              TAB 1: MY COURSES
          ================================================= */}
          {activeTab === "courses" && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses by title, domain, category..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Filter className="h-3.5 w-3.5" />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Courses</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-3 border-indigo-200 border-t-indigo-600" />
                    <p className="text-xs font-medium text-slate-500">Loading courses...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!loading && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center">
                  <p className="text-xs font-semibold text-rose-700">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && filteredCourses.length === 0 && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/30 py-12 px-6 text-center">
                  {/* Empty Icon Illustration */}
                  <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
                    <div className="h-16 w-14 rounded-xl border border-indigo-100 bg-white shadow-xs flex flex-col items-center justify-center">
                      <GraduationCap className="h-7 w-7 text-indigo-500" />
                      <div className="mt-1 h-1 w-6 rounded-full bg-slate-200" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    No courses found
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                    {courses.length === 0
                      ? "Create your first course to get started and start making an impact."
                      : "No courses match your active search or filter."}
                  </p>

                  <button
                    type="button"
                    onClick={handleCreateClick}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Course</span>
                  </button>
                </div>
              )}

              {/* Course Table View */}
              {!loading && !error && filteredCourses.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="min-w-full divide-y divide-slate-200/80 text-left text-xs">
                    <thead className="bg-slate-50/70 font-semibold text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3.5">Course Title</th>
                        <th scope="col" className="px-3.5 py-3.5">Domain</th>
                        <th scope="col" className="px-3.5 py-3.5">Category</th>
                        <th scope="col" className="px-3 py-3.5">Level</th>
                        <th scope="col" className="px-3 py-3.5">Duration</th>
                        <th scope="col" className="px-3 py-3.5">Price</th>
                        <th scope="col" className="px-3 py-3.5">Status</th>
                        <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredCourses.map((course) => {
                        const status = course?.status || "Draft";
                        const isPublished = status === "Published";

                        return (
                          <tr
                            key={course._id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Title & Thumbnail */}
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex items-center gap-3">
                                {course?.thumbnail ? (
                                  <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-100">
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                )}
                                <div className="min-w-0 max-w-[200px]">
                                  <p className="truncate font-semibold text-slate-900" title={course.title}>
                                    {course.title || "Untitled Course"}
                                  </p>
                                  {course.skills && course.skills.length > 0 && (
                                    <p className="truncate text-[10px] text-slate-400">
                                      {course.skills.slice(0, 2).join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Domain */}
                            <td className="px-3.5 py-3 text-slate-600">
                              <span className="inline-block max-w-[110px] truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {course.domain || "General"}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="px-3.5 py-3 text-slate-600">
                              <span className="inline-block max-w-[110px] truncate rounded-md bg-indigo-50/60 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                {course.category || "General"}
                              </span>
                            </td>

                            {/* Level */}
                            <td className="px-3 py-3 capitalize text-slate-600">
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                  course.level === "advanced"
                                    ? "bg-purple-50 text-purple-700"
                                    : course.level === "intermediate"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {course.level || "Beginner"}
                              </span>
                            </td>

                            {/* Duration */}
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                              {course.duration || "1"} {course.durationUnit || "hours"}
                            </td>

                            {/* Price */}
                            <td className="px-3 py-3 font-semibold whitespace-nowrap">
                              {course.price && course.price > 0 ? (
                                <span className="text-slate-800">₹{course.price}</span>
                              ) : (
                                <span className="text-emerald-600">Free</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                  isPublished
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                    : "bg-amber-50 text-amber-700 border border-amber-200/60"
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleManageContentClick(course._id)}
                                  title="Manage Curriculum / Video Content"
                                  className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition"
                                >
                                  <Video className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleViewDetailsClick(course._id)}
                                  title="View Public Course Page"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(course._id)}
                                  title="Edit Course Details"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(course)}
                                  disabled={statusLoading === course._id}
                                  title={isPublished ? "Set to Draft" : "Publish Course"}
                                  className={`rounded-lg p-1.5 transition ${
                                    isPublished
                                      ? "text-emerald-600 hover:bg-emerald-50"
                                      : "text-amber-600 hover:bg-amber-50"
                                  }`}
                                >
                                  {statusLoading === course._id ? (
                                    <Clock className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(course._id)}
                                  disabled={deletingId === course._id}
                                  title="Delete Course"
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =================================================
              TAB 2: COURSE APPLICATIONS
          ================================================= */}
          {activeTab === "applications" && (
            <ApplicationsPanel onRefreshStats={loadData} />
          )}
        </div>

        {/* ===================================================
            RIGHT COLUMN: RECENT APPLICATIONS CARD (Col 4)
        =================================================== */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Recent Applications
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("applications")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Applications list */}
          <div className="space-y-2.5">
            {recentApplicationsList.map((app) => {
              const meta = getDomainMeta(app.domain, app.courseTitle);
              const DomainIcon = meta.icon;

              return (
                <div
                  key={app.id}
                  onClick={() => setActiveTab("applications")}
                  className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200/80 hover:bg-indigo-50/30 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.bg}`}
                    >
                      <DomainIcon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {app.courseTitle}
                      </h4>
                      <p className="truncate text-[11px] text-slate-600">
                        {app.studentName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Applied • {app.timeAgo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <StatusBadge status={app.status} />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCoursesPage;