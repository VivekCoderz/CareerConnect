import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../services/api";
import "./EmployeeCoursesPage.css";

// ============================================================
// STATUS CONFIG — matches exact backend enum values
// CourseApplication status: "Applied" | "Enrolled" | "Completed" | "Rejected"
// ============================================================
const STATUS_CONFIG = {
  Applied: {
    label: "Pending Review",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    dot: "#3b82f6",
  },
  Enrolled: {
    label: "Enrolled",
    color: "#065f46",
    bg: "#d1fae5",
    border: "#6ee7b7",
    dot: "#10b981",
  },
  Completed: {
    label: "Completed",
    color: "#0f766e",
    bg: "#ccfbf1",
    border: "#5eead4",
    dot: "#14b8a6",
  },
  Rejected: {
    label: "Rejected",
    color: "#991b1b",
    bg: "#fee2e2",
    border: "#fca5a5",
    dot: "#ef4444",
  },
};

// ============================================================
// STATUS BADGE
// ============================================================
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: "#374151",
    bg: "#f3f4f6",
    border: "#e5e7eb",
    dot: "#9ca3af",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "10px",
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

// ============================================================
// APPLICATIONS PANEL — fetches grouped applications and handles
// Accept / Reject actions. Fully backend-driven; refresh-safe.
// ============================================================
const ApplicationsPanel = () => {
  const [courseGroups, setCourseGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // ---- Fetch all employer applications (grouped by course) ----
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/courses/my-applications");
      if (res.data?.success) {
        const groups = res.data.courseGroups || [];
        setCourseGroups(groups);
        // Expand all courses that have applications by default
        const defaultExpanded = {};
        groups.forEach((g) => {
          if (g.applications?.length > 0) {
            defaultExpanded[g._id] = true;
          }
        });
        setExpandedCourses(defaultExpanded);
      }
    } catch (err) {
      console.error("Fetch Employer Applications Error:", err);
      setError(
        err?.response?.data?.message || "Unable to load course applications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ---- Accept or Reject an application ----
  const handleUpdateStatus = async (courseId, applicationId, newStatus) => {
    try {
      setUpdatingId(applicationId);
      const res = await api.patch(
        `/courses/${courseId}/applications/${applicationId}/status`,
        { status: newStatus }
      );
      if (res.data?.success) {
        // Update local state so UI reflects immediately (refresh-safe because
        // the source of truth is the backend — a page reload will show the
        // same state since we persisted via the API call above).
        setCourseGroups((prev) =>
          prev.map((group) => {
            if (group._id.toString() !== courseId.toString()) return group;
            return {
              ...group,
              applications: group.applications.map((app) =>
                app._id.toString() === applicationId.toString()
                  ? { ...app, status: newStatus }
                  : app
              ),
            };
          })
        );
      }
    } catch (err) {
      console.error("Update Application Status Error:", err);
      alert(err?.response?.data?.message || "Failed to update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleCourse = (courseId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  // ---- Aggregate stats ----
  const totalStats = useMemo(() => {
    let total = 0, applied = 0, enrolled = 0, rejected = 0;
    courseGroups.forEach((g) => {
      g.applications?.forEach((app) => {
        total++;
        if (app.status === "Applied") applied++;
        else if (app.status === "Enrolled") enrolled++;
        else if (app.status === "Rejected") rejected++;
      });
    });
    return { total, applied, enrolled, rejected };
  }, [courseGroups]);

  // ---- Filter groups based on status + search ----
  const filteredGroups = useMemo(() => {
    return courseGroups
      .map((group) => {
        const apps = (group.applications || []).filter((app) => {
          const matchStatus = filterStatus === "All" || app.status === filterStatus;
          const q = searchQuery.toLowerCase();
          const matchSearch =
            !q ||
            (app.student?.fullName || "").toLowerCase().includes(q) ||
            (app.student?.email || "").toLowerCase().includes(q) ||
            (app.student?.username || "").toLowerCase().includes(q);
          return matchStatus && matchSearch;
        });
        return { ...group, applications: apps };
      })
      .filter((g) => g.applications.length > 0 || (!filterStatus || filterStatus === "All"));
  }, [courseGroups, filterStatus, searchQuery]);

  if (loading) {
    return (
      <div className="courses-loading" style={{ minHeight: 200 }}>
        <div className="loading-spinner" />
        <p>Loading student applications...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Section Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#172033" }}>
            Course Applications
          </h2>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "#788397" }}>
            Review and manage student applications for all your courses.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          style={{
            border: "1px solid #e0e4eb",
            background: "white",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 11,
            fontWeight: 700,
            color: "#5a6478",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Applications", value: totalStats.total, color: "#1b2537" },
          { label: "Pending Review", value: totalStats.applied, color: "#1d4ed8" },
          { label: "Enrolled", value: totalStats.enrolled, color: "#065f46" },
          { label: "Rejected", value: totalStats.rejected, color: "#991b1b" },
        ].map((s) => (
          <div
            key={s.label}
            className="stat-card"
            style={{ cursor: "default" }}
          >
            <div>
              <span>{s.label}</span>
              <strong style={{ color: s.color }}>{s.value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter & Search Bar ── */}
      <div
        style={{
          padding: "13px 16px",
          background: "white",
          border: "1px solid #e8ebf1",
          borderRadius: 14,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div className="course-filters">
          {["All", "Applied", "Enrolled", "Completed", "Rejected"].map((s) => (
            <button
              key={s}
              className={filterStatus === s ? "active" : ""}
              onClick={() => setFilterStatus(s)}
            >
              {s === "Applied" ? "Pending" : s}
            </button>
          ))}
        </div>
        <div className="course-search" style={{ width: 220 }}>
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="course-error" style={{ marginBottom: 18 }}>
          <div>
            <strong>Failed to load applications</strong>
            <p>{error}</p>
          </div>
          <button onClick={fetchApplications}>Try Again</button>
        </div>
      )}

      {/* ── No data ── */}
      {!error && filteredGroups.every((g) => g.applications.length === 0) && (
        <div className="empty-courses">
          <div className="empty-icon">📋</div>
          <h3>No applications found</h3>
          <p>
            {searchQuery || filterStatus !== "All"
              ? "No applications match your current filters."
              : "No students have applied for your courses yet. Publish a course and share it!"}
          </p>
        </div>
      )}

      {/* ── Course Groups ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredGroups.map((group) => {
          if (group.applications.length === 0) return null;
          const isExpanded = expandedCourses[group._id] !== false;
          const pendingCount = group.applications.filter(
            (a) => a.status === "Applied"
          ).length;

          return (
            <div
              key={group._id}
              style={{
                background: "white",
                border: "1px solid #e7eaf0",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              {/* Course Header */}
              <button
                onClick={() => toggleCourse(group._id)}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: isExpanded ? "1px solid #f0f2f6" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: "#eef3ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    🎓
                  </div>
                  <div style={{ textAlign: "left", minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#172033",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {group.title}
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 10,
                        color: "#8892a2",
                      }}
                    >
                      {group.domain} · {group.applications.length} application
                      {group.applications.length !== 1 ? "s" : ""}
                      {pendingCount > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: "2px 7px",
                            borderRadius: 20,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: 800,
                          }}
                        >
                          {pendingCount} pending
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 16,
                    color: "#a0aab8",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    flexShrink: 0,
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Applications List */}
              {isExpanded && (
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.applications.map((app) => {
                    const student = app.student || {};
                    const isUpdating = updatingId === app._id;
                    const initials = student.fullName
                      ? student.fullName
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : (student.username?.[0] || "S").toUpperCase();

                    return (
                      <div
                        key={app._id}
                        style={{
                          background: "#fafbfc",
                          border: "1px solid #edf0f4",
                          borderRadius: 14,
                          padding: 14,
                          transition: "border-color 0.2s",
                        }}
                      >
                        {/* Top row: avatar + info + status + actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 13,
                              background: student.profileImage
                                ? "transparent"
                                : "#182f58",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 14,
                              flexShrink: 0,
                              overflow: "hidden",
                            }}
                          >
                            {student.profileImage ? (
                              <img
                                src={student.profileImage}
                                alt={student.fullName}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          {/* Student details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: "#172033",
                                }}
                              >
                                {student.fullName || student.username || "Student"}
                              </h4>
                              <StatusBadge status={app.status} />
                            </div>
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: 11,
                                color: "#788397",
                              }}
                            >
                              {student.email}
                              {student.username && student.username !== student.email && (
                                <span style={{ color: "#a0aab8" }}>
                                  {" "}· @{student.username}
                                </span>
                              )}
                            </p>
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: 10,
                                color: "#a0aab8",
                              }}
                            >
                              Applied:{" "}
                              {new Date(app.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>

                          {/* Accept / Reject buttons — only for Applied */}
                          {app.status === "Applied" && (
                            <div
                              style={{
                                display: "flex",
                                gap: 7,
                                flexShrink: 0,
                                alignSelf: "center",
                              }}
                            >
                              <button
                                disabled={isUpdating}
                                onClick={() =>
                                  handleUpdateStatus(group._id, app._id, "Enrolled")
                                }
                                style={{
                                  border: "none",
                                  borderRadius: 9,
                                  padding: "8px 14px",
                                  background: "#059669",
                                  color: "white",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: isUpdating ? "not-allowed" : "pointer",
                                  opacity: isUpdating ? 0.55 : 1,
                                  transition: "background 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isUpdating) e.target.style.background = "#047857";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "#059669";
                                }}
                              >
                                {isUpdating ? "Updating..." : "✓ Accept"}
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() =>
                                  handleUpdateStatus(group._id, app._id, "Rejected")
                                }
                                style={{
                                  border: "1px solid #fca5a5",
                                  borderRadius: 9,
                                  padding: "8px 14px",
                                  background: "#fff5f5",
                                  color: "#991b1b",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: isUpdating ? "not-allowed" : "pointer",
                                  opacity: isUpdating ? 0.55 : 1,
                                  transition: "background 0.2s",
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Student Profile Detail Row */}
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: "1px solid #edf0f4",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16,
                          }}
                        >
                          {/* Technical Skills */}
                          {student.technicalSkills?.length > 0 && (
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Technical Skills
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 4,
                                }}
                              >
                                {student.technicalSkills.slice(0, 6).map((skill, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: 6,
                                      background: "#fff4dd",
                                      color: "#a35f00",
                                      fontSize: 9,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {student.technicalSkills.length > 6 && (
                                  <span
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: 6,
                                      background: "#f1f3f7",
                                      color: "#788397",
                                      fontSize: 9,
                                      fontWeight: 700,
                                    }}
                                  >
                                    +{student.technicalSkills.length - 6} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {student.education?.length > 0 && (
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Education
                              </p>
                              {student.education.slice(0, 1).map((edu, i) => (
                                <p
                                  key={i}
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "#4a5568",
                                    fontWeight: 600,
                                  }}
                                >
                                  {edu.degree}
                                  {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                                  {edu.institution ? ` · ${edu.institution}` : ""}
                                  {edu.endYear ? ` (${edu.endYear})` : ""}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Career Goal */}
                          {student.careerGoal && (
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Career Goal
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: "#4a5568",
                                  fontWeight: 600,
                                }}
                              >
                                {student.careerGoal}
                              </p>
                            </div>
                          )}

                          {/* Bio */}
                          {student.bio && (
                            <div style={{ minWidth: 0, flexBasis: "100%" }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                About
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: "#4a5568",
                                  lineHeight: 1.5,
                                }}
                              >
                                {student.bio}
                              </p>
                            </div>
                          )}

                          {/* Experience */}
                          {student.experience?.length > 0 && (
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Experience
                              </p>
                              {student.experience.slice(0, 1).map((exp, i) => (
                                <p
                                  key={i}
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "#4a5568",
                                    fontWeight: 600,
                                  }}
                                >
                                  {exp.role} at {exp.organization}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Location */}
                          {(student.location?.city || student.location?.country) && (
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#8892a2",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Location
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: "#4a5568",
                                  fontWeight: 600,
                                }}
                              >
                                📍{" "}
                                {[
                                  student.location.city,
                                  student.location.state,
                                  student.location.country,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
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
        })}
      </div>
    </div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================
const EmployeeCoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // "courses" | "applications"
  const [activeTab, setActiveTab] = useState("courses");

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

  // ── Back to Dashboard — uses getDashboardPath logic:
  // employer role → /employer/dashboard
  const handleBackToDashboard = () => {
    navigate("/employer/dashboard");
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
          {/* Back to Dashboard */}
          <button
            onClick={handleBackToDashboard}
            style={{
              border: "none",
              background: "none",
              padding: "0 0 8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: "#788397",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#172033")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#788397")}
          >
            ← Back to Dashboard
          </button>

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

      {/* ================= TAB NAV ================= */}
      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto 20px",
          display: "flex",
          gap: 4,
          padding: "4px",
          background: "#f2f4f7",
          borderRadius: 12,
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setActiveTab("courses")}
          style={{
            border: "none",
            borderRadius: 9,
            padding: "8px 18px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            background: activeTab === "courses" ? "white" : "transparent",
            color: activeTab === "courses" ? "#172033" : "#7c8798",
            boxShadow:
              activeTab === "courses" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
          }}
        >
          📚 My Courses
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          style={{
            border: "none",
            borderRadius: 9,
            padding: "8px 18px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            background: activeTab === "applications" ? "white" : "transparent",
            color: activeTab === "applications" ? "#172033" : "#7c8798",
            boxShadow:
              activeTab === "applications"
                ? "0 2px 6px rgba(0,0,0,0.06)"
                : "none",
          }}
        >
          📋 Course Applications
        </button>
      </section>

      {/* ================= TAB: MY COURSES ================= */}
      {activeTab === "courses" && (
        <>
          {/* ── TOOLBAR ── */}
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

          {/* ── ERROR ── */}
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

          {/* ── EMPTY ── */}
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

          {/* ── COURSE GRID ── */}
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
        </>
      )}

      {/* ================= TAB: APPLICATIONS ================= */}
      {activeTab === "applications" && <ApplicationsPanel />}

    </div>
  );
};

export default EmployeeCoursesPage;