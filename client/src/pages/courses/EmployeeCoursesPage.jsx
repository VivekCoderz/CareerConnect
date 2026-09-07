import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../services/api";
import "./EmployeeCoursesPage.css";

const EmployeeCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [statusLoading, setStatusLoading] = useState(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/courses/my-courses");

      const data = response?.data;

      setCourses(
        data?.courses ||
          data?.data?.courses ||
          (Array.isArray(data) ? data : [])
      );
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load your courses. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title?.toLowerCase().includes(search.toLowerCase()) ||
        course.description?.toLowerCase().includes(search.toLowerCase()) ||
        course.domain?.toLowerCase().includes(search.toLowerCase());

      const status = course.status || "Draft";

      const matchesFilter =
        filter === "All" || status.toLowerCase() === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [courses, search, filter]);

  const stats = useMemo(() => {
    const published = courses.filter(
      (course) => course.status === "Published"
    ).length;

    const drafts = courses.filter(
      (course) => course.status !== "Published"
    ).length;

    return {
      total: courses.length,
      published,
      drafts,
    };
  }, [courses]);

  const handleDelete = async (courseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(courseId);

      await api.delete(`/courses/${courseId}`);

      setCourses((prev) =>
        prev.filter((course) => course._id !== courseId)
      );
    } catch (err) {
      console.error("Delete course error:", err);
      alert(
        err?.response?.data?.message ||
          "Unable to delete the course."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (course) => {
    const newStatus =
      course.status === "Published" ? "Draft" : "Published";

    try {
      setStatusLoading(course._id);

      const response = await api.patch(
        `/courses/${course._id}/status`,
        {
          status: newStatus,
        }
      );

      const updatedCourse =
        response?.data?.course ||
        response?.data?.data?.course;

      setCourses((prev) =>
        prev.map((item) =>
          item._id === course._id
            ? updatedCourse || { ...item, status: newStatus }
            : item
        )
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert(
        err?.response?.data?.message ||
          "Unable to update course status."
      );
    } finally {
      setStatusLoading(null);
    }
  };

  const getInitials = (name = "") => {
    const words = name.trim().split(" ");

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase() || "GU";
  };

  if (loading) {
    return (
      <div className="employee-courses-page">
        <div className="courses-loading">
          <div className="loading-spinner"></div>
          <h3>Loading your courses...</h3>
          <p>Please wait while we fetch your course workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-courses-page">

      {/* ================= HEADER ================= */}
      <header className="courses-header">
        <div>
          <div className="breadcrumb">
            Dashboard <span>/</span> Courses
          </div>

          <h1>Course Management</h1>

          <p>
            Create, manage and publish learning content for
            CareerConnect learners.
          </p>
        </div>

        <button
          className="create-course-btn"
          onClick={() => navigate("/employer/courses/create")}
        >
          <span>+</span>
          Create New Course
        </button>
      </header>

      {/* ================= WELCOME CARD ================= */}
      <section className="welcome-card">
        <div className="welcome-content">
          <div className="welcome-avatar">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
              />
            ) : (
              getInitials(user?.fullName || user?.name)
            )}
          </div>

          <div>
            <p className="welcome-small">Welcome back</p>

            <h2>
              {user?.fullName || user?.name || "Course Creator"}
            </h2>

            <p>
              Manage your courses and keep your learning content
              up to date.
            </p>
          </div>
        </div>

        <div className="welcome-decoration">
          <div>🎓</div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="course-stats">

        <div className="stat-card">
          <div className="stat-icon total">📚</div>
          <div>
            <span>Total Courses</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon published">✓</div>
          <div>
            <span>Published</span>
            <strong>{stats.published}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon draft">📝</div>
          <div>
            <span>Drafts</span>
            <strong>{stats.drafts}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon learners">👥</div>
          <div>
            <span>Learning Hub</span>
            <strong>Active</strong>
          </div>
        </div>

      </section>

      {/* ================= TOOLBAR ================= */}
      <section className="course-toolbar">

        <div className="toolbar-left">
          <h2>My Courses</h2>
          <span>{filteredCourses.length} courses</span>
        </div>

        <div className="toolbar-right">

          <div className="course-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="course-filters">

            {["All", "Published", "Draft"].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}

          </div>

        </div>
      </section>

      {/* ================= ERROR ================= */}
      {error && (
        <div className="course-error">
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>

          <button onClick={loadCourses}>
            Try Again
          </button>
        </div>
      )}

      {/* ================= EMPTY ================= */}
      {!error && filteredCourses.length === 0 && (
        <div className="empty-courses">

          <div className="empty-icon">📚</div>

          <h3>
            {search || filter !== "All"
              ? "No matching courses"
              : "No courses yet"}
          </h3>

          <p>
            {search || filter !== "All"
              ? "Try changing your search or filter."
              : "Create your first course and start building your learning content."}
          </p>

          {!search && filter === "All" && (
            <button
              onClick={() =>
                navigate("/employer/courses/create")
              }
            >
              + Create Your First Course
            </button>
          )}

        </div>
      )}

      {/* ================= COURSE GRID ================= */}
      {filteredCourses.length > 0 && (
        <section className="course-grid">

          {filteredCourses.map((course) => {

            const isPublished =
              course.status === "Published";

            return (
              <article
                className="course-card"
                key={course._id}
              >

                {/* Thumbnail */}
                <div className="course-thumbnail">

                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                    />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <span>🎓</span>
                    </div>
                  )}

                  <span
                    className={`course-status ${
                      isPublished
                        ? "published-status"
                        : "draft-status"
                    }`}
                  >
                    {isPublished
                      ? "● Published"
                      : "● Draft"}
                  </span>

                </div>

                {/* Content */}
                <div className="course-card-content">

                  <div className="course-domain">
                    {course.domain || "General"}
                  </div>

                  <h3>{course.title}</h3>

                  <p className="course-description">
                    {course.description ||
                      "No course description available."}
                  </p>

                  <div className="course-meta">

                    <span>
                      📖 Course
                    </span>

                    {course.duration && (
                      <span>
                        ⏱ {course.duration}
                        {course.durationUnit
                          ? ` ${course.durationUnit}`
                          : ""}
                      </span>
                    )}

                  </div>

                  <div className="course-divider"></div>

                  {/* Actions */}
                  <div className="course-actions">

                    <button
                      className="manage-btn"
                      onClick={() =>
                        navigate(
                          `/employer/courses/${course._id}/content`
                        )
                      }
                    >
                      Manage Content
                      <span>→</span>
                    </button>

                    <div className="secondary-actions">

                      <button
                        title="Edit Course"
                        onClick={() =>
                          navigate(
                            `/employer/courses/${course._id}/edit`
                          )
                        }
                      >
                        ✏️
                      </button>

                      <button
                        title={
                          isPublished
                            ? "Unpublish"
                            : "Publish"
                        }
                        disabled={
                          statusLoading === course._id
                        }
                        onClick={() =>
                          handleToggleStatus(course)
                        }
                      >
                        {statusLoading === course._id
                          ? "..."
                          : isPublished
                          ? "↩"
                          : "🚀"}
                      </button>

                      <button
                        title="Delete Course"
                        disabled={
                          deletingId === course._id
                        }
                        onClick={() =>
                          handleDelete(course._id)
                        }
                      >
                        {deletingId === course._id
                          ? "..."
                          : "🗑️"}
                      </button>

                    </div>

                  </div>

                </div>

              </article>
            );
          })}

        </section>
      )}

    </div>
  );
};

export default EmployeeCoursesPage;