import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Upload,
  EyeOff,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  Users,
  Video,
} from "lucide-react";
import {
  getEmployerCourses,
  deleteCourse,
  updateCourseStatus,
} from "../../services/courseService";
import "./EmployeeCoursesPage.css";

/**
 * EmployeeCoursesPage
 * Instructor / Employer course management dashboard.
 * Supports standalone route & embedded dashboard integration.
 */
const EmployeeCoursesPage = ({
  embedded = false,
  onCreateCourse,
  onEditCourse,
  onManageContent,
  onViewDetails,
}) => {
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

      const response = await getEmployerCourses();
      setCourses(response?.courses || []);
    } catch (err) {
      console.error("Failed to load employer courses:", err);
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
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title?.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q) ||
        course.domain?.toLowerCase().includes(q) ||
        course.category?.toLowerCase().includes(q);

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
      "Are you sure you want to permanently delete this course?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(courseId);
      const res = await deleteCourse(courseId);
      if (res?.success) {
        setCourses((prev) => prev.filter((course) => course._id !== courseId));
      }
    } catch (err) {
      console.error("Delete course error:", err);
      alert(err?.response?.data?.message || "Unable to delete the course.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (course) => {
    const newStatus = course.status === "Published" ? "Draft" : "Published";

    try {
      setStatusLoading(course._id);
      const response = await updateCourseStatus(course._id, newStatus);
      const updatedCourse = response?.course;

      setCourses((prev) =>
        prev.map((item) =>
          item._id === course._id
            ? updatedCourse || { ...item, status: newStatus }
            : item
        )
      );
    } catch (err) {
      console.error("Status update error:", err);
      alert(err?.response?.data?.message || "Unable to update course status.");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleCreateClick = () => {
    if (onCreateCourse) onCreateCourse();
    else navigate("/employer/courses/create");
  };

  const handleEditClick = (courseId) => {
    if (onEditCourse) onEditCourse(courseId);
    else navigate(`/employer/courses/${courseId}/edit`);
  };

  const handleManageContentClick = (courseId) => {
    if (onManageContent) onManageContent(courseId);
    else navigate(`/employer/courses/${courseId}/content`);
  };

  const handleViewDetailsClick = (courseId) => {
    if (onViewDetails) onViewDetails(courseId);
    else navigate(`/courses/${courseId}`);
  };

  return (
    <div className={embedded ? "space-y-6 animate-fade-in" : "employee-courses-page"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {!embedded && (
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              CareerConnect <span>·</span> Course Management
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Course Management Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, manage curriculum, publish video/PDF lessons, and track learner enrollments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateClick}
          className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
            📚
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Courses</span>
            <h3 className="text-xl font-bold text-slate-900">{stats.total}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Published Active</span>
            <h3 className="text-xl font-bold text-emerald-700">{stats.published}</h3>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg">
            📝
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Drafts in Progress</span>
            <h3 className="text-xl font-bold text-amber-700">{stats.drafts}</h3>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search created courses by title, domain, or category..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["All", "Published", "Draft"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex-1 sm:flex-initial ${
                filter === item
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
          <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">
            Loading your courses workspace...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
          <button
            type="button"
            onClick={loadCourses}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Course List Grid */}
      {!loading && !error && filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4">
          <BookOpen size={40} className="mx-auto text-slate-300" />
          <h4 className="text-base font-bold text-slate-800">
            No courses found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating your first course, setting up modules, and uploading video lessons.
          </p>
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> Create Course Now
          </button>
        </div>
      ) : (
        !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isPublished = course.status === "Published";
              const isStatusUpdating = statusLoading === course._id;
              const isDeleting = deletingId === course._id;

              return (
                <div
                  key={course._id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                >
                  {/* Thumbnail / Header */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-4 flex flex-col justify-between text-white">
                        <BookOpen size={24} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {course.domain || "Course"}
                          </p>
                          <p className="text-xs font-bold line-clamp-1">{course.title}</p>
                        </div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10.5px] font-bold shadow-xs border ${
                        isPublished
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "bg-amber-400 text-slate-900 border-amber-300"
                      }`}
                    >
                      {course.status || "Draft"}
                    </span>

                    {/* Duration */}
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
                      <Clock size={11} /> {course.duration} {course.durationUnit || "hrs"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="text-[#1e3a8a] font-bold">
                          {course.category || course.domain || "Technology"}
                        </span>
                        <span className="capitalize">{course.level || "Beginner"}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleManageContentClick(course._id)}
                          className="flex-1 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Video size={14} /> Upload / Manage Videos
                        </button>

                        <button
                          type="button"
                          onClick={() => handleViewDetailsClick(course._id)}
                          className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                          title="View Course Details"
                        >
                          Details
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(course)}
                          disabled={isStatusUpdating}
                          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                            isPublished
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {isPublished ? (
                            <>
                              <EyeOff size={12} /> Unpublish
                            </>
                          ) : (
                            <>
                              <Upload size={12} /> Publish
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditClick(course._id)}
                          className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                          title="Edit Course Information"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(course._id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                          title="Delete Course"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default EmployeeCoursesPage;