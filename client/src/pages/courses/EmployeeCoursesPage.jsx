import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

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
    className: "bg-blue-100 text-blue-700",
  },
  Enrolled: {
    label: "Enrolled",
    className: "bg-green-100 text-green-700",
  },
  Completed: {
    label: "Completed",
    className: "bg-purple-100 text-purple-700",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
};

/* =========================================================
   APPLICATIONS PANEL
========================================================= */

const ApplicationsPanel = () => {
  const [courseGroups, setCourseGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [expandedCourses, setExpandedCourses] = useState({});
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------------------------------------------------------
     FETCH APPLICATIONS
  --------------------------------------------------------- */

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/courses/my-applications");

      const data =
        response?.data?.applications ||
        response?.data?.data ||
        response?.data ||
        [];

      setCourseGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch course applications:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load course applications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  /* ---------------------------------------------------------
     UPDATE APPLICATION STATUS
  --------------------------------------------------------- */

  const handleUpdateStatus = async (
    courseId,
    applicationId,
    newStatus
  ) => {
    try {
      setUpdatingId(applicationId);

      await api.patch(
        `/courses/${courseId}/applications/${applicationId}/status`,
        {
          status: newStatus,
        }
      );

      await fetchApplications();
    } catch (err) {
      console.error("Failed to update application:", err);

      alert(
        err?.response?.data?.message ||
          "Failed to update application status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------------------------------------------------------
     STATS
  --------------------------------------------------------- */

  const stats = useMemo(() => {
    const allApplications = courseGroups.flatMap(
      (group) => group.applications || []
    );

    return {
      total: allApplications.length,
      applied: allApplications.filter(
        (application) => application.status === "Applied"
      ).length,
      enrolled: allApplications.filter(
        (application) => application.status === "Enrolled"
      ).length,
      completed: allApplications.filter(
        (application) => application.status === "Completed"
      ).length,
      rejected: allApplications.filter(
        (application) => application.status === "Rejected"
      ).length,
    };
  }, [courseGroups]);

  /* ---------------------------------------------------------
     FILTER APPLICATIONS
  --------------------------------------------------------- */

  const filteredGroups = useMemo(() => {
    return courseGroups
      .map((group) => {
        const applications = (group.applications || []).filter(
          (application) => {
            const matchesStatus =
              filterStatus === "All" ||
              application.status === filterStatus;

            const studentName =
              application.student?.name ||
              application.user?.name ||
              application.studentName ||
              "";

            const studentEmail =
              application.student?.email ||
              application.user?.email ||
              application.studentEmail ||
              "";

            const matchesSearch =
              !searchQuery.trim() ||
              `${studentName} ${studentEmail}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

            return matchesStatus && matchesSearch;
          }
        );

        return {
          ...group,
          applications,
        };
      })
      .filter((group) => group.applications.length > 0);
  }, [courseGroups, filterStatus, searchQuery]);

  /* ---------------------------------------------------------
     TOGGLE COURSE
  --------------------------------------------------------- */

  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  /* ---------------------------------------------------------
     LOADING
  --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">
            Loading applications...
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     ERROR
  --------------------------------------------------------- */

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">{error}</p>

        <button
          onClick={fetchApplications}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          APPLICATION STATS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Applied</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {stats.applied}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Enrolled</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {stats.enrolled}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">
            {stats.completed}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search student by name or email..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="All">All Status</option>
          <option value="Applied">Applied</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* =====================================================
          APPLICATION LIST
      ===================================================== */}

      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">
            No applications found
          </p>

          <p className="mt-1 text-sm text-gray-500">
            There are no applications matching your current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const course = group.course || group;

            const courseId = course?._id;

            const isExpanded =
              expandedCourses[courseId] ?? true;

            return (
              <div
                key={courseId}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                {/* Course Header */}

                <button
                  type="button"
                  onClick={() => toggleCourse(courseId)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-gray-50"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {course?.title || "Untitled Course"}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {group.applications.length} application
                      {group.applications.length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <span className="text-xl text-gray-500">
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>

                {/* Applications */}

                {isExpanded && (
                  <div className="border-t">
                    {group.applications.map((application) => {
                      const student =
                        application.student ||
                        application.user ||
                        {};

                      const studentName =
                        student.name ||
                        application.studentName ||
                        "Student";

                      const studentEmail =
                        student.email ||
                        application.studentEmail ||
                        "No email";

                      return (
                        <div
                          key={application._id}
                          className="flex flex-col gap-4 border-b p-5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900">
                              {studentName}
                            </h4>

                            <p className="text-sm text-gray-500">
                              {studentEmail}
                            </p>

                            {application.appliedAt && (
                              <p className="mt-1 text-xs text-gray-400">
                                Applied:{" "}
                                {new Date(
                                  application.appliedAt
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge
                              status={application.status}
                            />

                            {application.status ===
                              "Applied" && (
                              <>
                                <button
                                  disabled={
                                    updatingId ===
                                    application._id
                                  }
                                  onClick={() =>
                                    handleUpdateStatus(
                                      courseId,
                                      application._id,
                                      "Enrolled"
                                    )
                                  }
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {updatingId ===
                                  application._id
                                    ? "Updating..."
                                    : "Accept"}
                                </button>

                                <button
                                  disabled={
                                    updatingId ===
                                    application._id
                                  }
                                  onClick={() =>
                                    handleUpdateStatus(
                                      courseId,
                                      application._id,
                                      "Rejected"
                                    )
                                  }
                                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
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

  const [activeTab, setActiveTab] = useState("courses");

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [deletingId, setDeletingId] = useState(null);
  const [statusLoading, setStatusLoading] =
    useState(null);

  /* =======================================================
     LOAD COURSES
  ======================================================= */

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getEmployerCourses();

      const data =
        response?.data?.courses ||
        response?.data?.data ||
        response?.data ||
        [];

      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load courses:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load courses."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  /* =======================================================
     FILTERED COURSES
  ======================================================= */

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courses.filter((course) => {
      const title =
        course?.title?.toLowerCase() || "";

      const description =
        course?.description?.toLowerCase() || "";

      const domain =
        course?.domain?.toLowerCase() || "";

      const category =
        course?.category?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        domain.includes(query) ||
        category.includes(query);

      const status =
        course?.status ||
        course?.courseStatus ||
        "Draft";

      const matchesFilter =
        filter === "All" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [courses, search, filter]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const published = courses.filter(
      (course) =>
        course?.status === "Published"
    ).length;

    const draft = courses.filter(
      (course) =>
        course?.status === "Draft"
    ).length;

    const totalStudents = courses.reduce(
      (total, course) =>
        total +
        Number(
          course?.enrolledStudents ||
            course?.studentsCount ||
            0
        ),
      0
    );

    return {
      total: courses.length,
      published,
      draft,
      totalStudents,
    };
  }, [courses]);

  /* =======================================================
     DELETE COURSE
  ======================================================= */

  const handleDelete = async (courseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(courseId);

      await deleteCourse(courseId);

      setCourses((prev) =>
        prev.filter(
          (course) => course._id !== courseId
        )
      );
    } catch (err) {
      console.error("Failed to delete course:", err);

      alert(
        err?.response?.data?.message ||
          "Failed to delete course."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     TOGGLE PUBLISH STATUS
  ======================================================= */

  const handleToggleStatus = async (course) => {
    const currentStatus =
      course?.status || "Draft";

    const newStatus =
      currentStatus === "Published"
        ? "Draft"
        : "Published";

    try {
      setStatusLoading(course._id);

      await updateCourseStatus(
        course._id,
        newStatus
      );

      setCourses((prev) =>
        prev.map((item) =>
          item._id === course._id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Failed to update course status:",
        err
      );

      alert(
        err?.response?.data?.message ||
          "Failed to update course status."
      );
    } finally {
      setStatusLoading(null);
    }
  };

  /* =======================================================
     CREATE
  ======================================================= */

  const handleCreateClick = () => {
    if (onCreateCourse) {
      onCreateCourse();
    } else {
      navigate("/employer/courses/create");
    }
  };

  /* =======================================================
     EDIT
  ======================================================= */

  const handleEditClick = (courseId) => {
    if (onEditCourse) {
      onEditCourse(courseId);
    } else {
      navigate(`/employer/courses/${courseId}/edit`);
    }
  };

  /* =======================================================
     MANAGE CONTENT
  ======================================================= */

  const handleManageContentClick = (courseId) => {
    if (onManageContent) {
      onManageContent(courseId);
    } else {
      navigate(
        `/employer/courses/${courseId}/content`
      );
    }
  };

  /* =======================================================
     VIEW DETAILS
  ======================================================= */

  const handleViewDetailsClick = (courseId) => {
    if (onViewDetails) {
      onViewDetails(courseId);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  /* =======================================================
     BACK TO DASHBOARD
  ======================================================= */

  const handleBackToDashboard = () => {
    navigate("/employer/dashboard");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={
        embedded
          ? "space-y-6 animate-fade-in"
          : "employee-courses-page"
      }
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-6">
        {!embedded && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
            CareerConnect{" "}
            <span className="mx-1 text-gray-300">
              ·
            </span>{" "}
            Course Management
          </div>
        )}

        {!embedded && (
          <button
            onClick={handleBackToDashboard}
            className="mb-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Dashboard
          </button>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Course Management Workspace
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create, manage curriculum, publish
              video/PDF lessons, and track learner
              enrollments.
            </p>
          </div>

          {activeTab === "courses" && (
            <button
              onClick={handleCreateClick}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              + Create Course
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Courses
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Published
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {stats.published}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Drafts
          </p>

          <p className="mt-1 text-2xl font-bold text-orange-600">
            {stats.draft}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Enrolled Learners
          </p>

          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {stats.totalStudents}
          </p>
        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
              activeTab === "courses"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            My Courses
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("applications")
            }
            className={`border-b-2 px-2 py-3 text-sm font-semibold transition ${
              activeTab === "applications"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Course Applications
          </button>
        </div>
      </div>

      {/* =====================================================
          COURSES TAB
      ===================================================== */}

      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* SEARCH + FILTER */}

          <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search courses..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="All">
                All Courses
              </option>

              <option value="Published">
                Published
              </option>

              <option value="Draft">
                Draft
              </option>
            </select>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="flex min-h-[250px] items-center justify-center rounded-xl border bg-white">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />

                <p className="text-sm text-gray-500">
                  Loading courses...
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-semibold text-red-700">
                {error}
              </p>

              <button
                onClick={loadCourses}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            !error &&
            filteredCourses.length === 0 && (
              <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
                <h3 className="text-lg font-bold text-gray-800">
                  No courses found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {courses.length === 0
                    ? "Create your first course to get started."
                    : "Try changing your search or filter."}
                </p>

                {courses.length === 0 && (
                  <button
                    onClick={handleCreateClick}
                    className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Create Course
                  </button>
                )}
              </div>
            )}

          {/* =================================================
              COURSE GRID
          ================================================= */}

          {!loading &&
            !error &&
            filteredCourses.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => {
                  const courseStatus =
                    course?.status || "Draft";

                  const isPublished =
                    courseStatus === "Published";

                  return (
                    <div
                      key={course._id}
                      className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      {/* THUMBNAIL */}

                      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                        {course?.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="text-5xl">
                              📚
                            </span>
                          </div>
                        )}

                        {/* STATUS */}

                        <div className="absolute left-3 top-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              isPublished
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {courseStatus}
                          </span>
                        </div>

                        {/* DURATION */}

                        {course?.duration && (
                          <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                            {course.duration}{" "}
                            {course.durationUnit ||
                              "hours"}
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}

                      <div className="p-5">
                        {/* CATEGORY */}

                        <div className="mb-2 flex flex-wrap gap-2">
                          {course?.category && (
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
                              {course.category}
                            </span>
                          )}

                          {course?.domain && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                              {course.domain}
                            </span>
                          )}

                          {course?.level && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-600">
                              {course.level}
                            </span>
                          )}
                        </div>

                        {/* TITLE */}

                        <h3 className="line-clamp-2 text-lg font-bold text-gray-900">
                          {course?.title ||
                            "Untitled Course"}
                        </h3>

                        {/* DESCRIPTION */}

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">
                          {course?.description ||
                            "No course description available."}
                        </p>

                        {/* SKILLS */}

                        {Array.isArray(
                          course?.skills
                        ) &&
                          course.skills.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {course.skills
                                .slice(0, 4)
                                .map(
                                  (skill, index) => (
                                    <span
                                      key={`${skill}-${index}`}
                                      className="rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-600"
                                    >
                                      {skill}
                                    </span>
                                  )
                                )}

                              {course.skills.length >
                                4 && (
                                <span className="px-1 py-1 text-[11px] text-gray-400">
                                  +
                                  {course.skills.length -
                                    4}{" "}
                                  more
                                </span>
                              )}
                            </div>
                          )}

                        {/* ACTIONS */}

                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              handleManageContentClick(
                                course._id
                              )
                            }
                            className="rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            🎥 Manage Content
                          </button>

                          <button
                            onClick={() =>
                              handleViewDetailsClick(
                                course._id
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            View Details
                          </button>

                          <button
                            onClick={() =>
                              handleToggleStatus(
                                course
                              )
                            }
                            disabled={
                              statusLoading ===
                              course._id
                            }
                            className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${
                              isPublished
                                ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {statusLoading ===
                            course._id
                              ? "Updating..."
                              : isPublished
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <button
                            onClick={() =>
                              handleEditClick(
                                course._id
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                course._id
                              )
                            }
                            disabled={
                              deletingId ===
                              course._id
                            }
                            className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            course._id
                              ? "Deleting..."
                              : "🗑️ Delete Course"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* =====================================================
          APPLICATIONS TAB
      ===================================================== */}

      {activeTab === "applications" && (
        <ApplicationsPanel />
      )}
    </div>
  );
};

export default EmployeeCoursesPage;