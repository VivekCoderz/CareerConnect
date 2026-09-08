import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import { getRecommendedCourses, applyForCourse } from "../../services/courseService";
import CourseCard from "../../components/courses/CourseCard";

/**
 * StudentCoursesPage
 * Student course catalog & AI recommendations discovery view.
 * Supports both standalone routing and embedded dashboard integration.
 */
const StudentCoursesPage = ({
  embedded = false,
  onViewDetails,
  onNavigateToMyCourses,
}) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  // Applying state
  const [applyingId, setApplyingId] = useState(null);
  const [appliedCourseIds, setAppliedCourseIds] = useState(new Set());

  const fetchCoursesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRecommendedCourses();
      if (res?.success) {
        setCourses(res.courses || []);
      }
    } catch (err) {
      console.error("Fetch Recommended Courses Error:", err);
      setError("Failed to load recommended courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesData();
  }, []);

  const handleApply = async (courseId) => {
    try {
      setApplyingId(courseId);
      const res = await applyForCourse(courseId);
      if (res?.success) {
        setAppliedCourseIds((prev) => new Set(prev).add(courseId));
      }
    } catch (err) {
      console.error("Apply Course Error:", err);
      alert(err.response?.data?.message || "Failed to enroll in course.");
    } finally {
      setApplyingId(null);
    }
  };

  const handleSelectCourse = (courseId) => {
    if (onViewDetails) {
      onViewDetails(courseId);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  // Filtered List
  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      course.title?.toLowerCase().includes(q) ||
      course.description?.toLowerCase().includes(q) ||
      (course.skills || []).some((s) => s.toLowerCase().includes(q));

    const matchesDomain =
      selectedDomain === "All" || course.domain === selectedDomain;
    const matchesLevel =
      selectedLevel === "All" ||
      course.level?.toLowerCase() === selectedLevel.toLowerCase();

    return matchesSearch && matchesDomain && matchesLevel;
  });

  const domainList = [
    "All",
    ...new Set(courses.map((c) => c.domain).filter(Boolean)),
  ];

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        {/* Standalone Navigation Bar */}
        {!embedded && (
          <div className="flex items-center justify-between">
            <Link
              to={getDashboardPath(user?.userType || "student", user)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>

            <Link
              to="/my-courses"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#1e3a8a] hover:bg-blue-100 transition shadow-2xs"
            >
              <BookOpen size={14} /> My Enrolled Courses
            </Link>
          </div>
        )}

        {/* Hero Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-indigo-900 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold text-amber-300 uppercase tracking-wider border border-white/20">
                ✨ CareerConnect Learning Hub
              </span>
              {embedded && onNavigateToMyCourses && (
                <button
                  type="button"
                  onClick={onNavigateToMyCourses}
                  className="px-3 py-1 rounded-full bg-blue-500/40 hover:bg-blue-500/60 text-[11px] font-bold text-white border border-white/20 transition cursor-pointer flex items-center gap-1"
                >
                  <GraduationCap size={13} /> View Enrolled Courses &rarr;
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Explore & Recommended Courses
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Industry-aligned technical curriculum tailored for Geeta University students to bridge career skill gaps.
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by title, skill, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a] text-slate-700"
            >
              {domainList.map((d) => (
                <option key={d} value={d}>
                  Domain: {d}
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a] text-slate-700"
            >
              <option value="All">Level: All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600">
              Matching recommended courses for your profile...
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
              onClick={fetchCoursesData}
              className="text-xs font-bold underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Course Cards Grid */}
        {!loading && !error && filteredCourses.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
            <BookOpen size={36} className="mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">
              No courses match your search
            </h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or reset domain/level filters.
            </p>
          </div>
        ) : (
          !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course._id || course.id}
                  course={course}
                  mode="catalog"
                  isApplied={appliedCourseIds.has(course._id || course.id)}
                  isApplying={applyingId === (course._id || course.id)}
                  onViewDetails={handleSelectCourse}
                  onEnroll={handleApply}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentCoursesPage;
