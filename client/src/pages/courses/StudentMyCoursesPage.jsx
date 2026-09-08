import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowLeft,
  AlertCircle,
  X,
  Compass,
} from "lucide-react";
import {
  getStudentMyCourses,
  getStudentCourseContent,
  markContentComplete,
} from "../../services/courseService";
import CourseProgress from "../../components/courses/CourseProgress";
import ContentCard from "../../components/courses/ContentCard";
import CourseCard from "../../components/courses/CourseCard";

/**
 * StudentMyCoursesPage
 * Displays student's active enrolled courses and live lesson player modal.
 * Supports standalone routing & embedded dashboard mode.
 */
const StudentMyCoursesPage = ({ embedded = false, onBackToCatalog }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Course Player Modal State
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseContent, setCourseContent] = useState([]);
  const [courseProgressPercent, setCourseProgressPercent] = useState(0);
  const [completedContentIds, setCompletedContentIds] = useState(new Set());
  const [loadingContent, setLoadingContent] = useState(false);

  const fetchMyCoursesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudentMyCourses();
      if (res?.success) {
        setEnrolledCourses(res.courses || []);
      }
    } catch (err) {
      console.error("Fetch Student My Courses Error:", err);
      setError(err.response?.data?.message || "Failed to load enrolled courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCoursesData();
  }, []);

  // Open Learning Viewer for a specific course
  const handleOpenCourseViewer = async (courseItem) => {
    const courseObj = courseItem.course || courseItem;
    setActiveCourse(courseObj);
    setCourseProgressPercent(courseItem.progress || 0);

    try {
      setLoadingContent(true);
      const res = await getStudentCourseContent(courseObj._id);
      if (res?.success) {
        setCourseContent(res.content || []);
        if (res.progress !== undefined) {
          setCourseProgressPercent(res.progress);
        }
      }
    } catch (err) {
      console.error("Fetch Student Course Content Error:", err);
      alert(err.response?.data?.message || "Failed to load course lessons.");
    } finally {
      setLoadingContent(false);
    }
  };

  // Mark Content Complete
  const handleMarkComplete = async (contentId) => {
    if (!activeCourse) return;
    try {
      const res = await markContentComplete(activeCourse._id, contentId);
      if (res?.success) {
        const newProgress = res.progress ?? 100;
        setCourseProgressPercent(newProgress);
        setCompletedContentIds((prev) => new Set(prev).add(contentId));

        // Update main enrolled list progress state as well
        setEnrolledCourses((prev) =>
          prev.map((c) => {
            const cId = c.course?._id || c._id;
            return cId === activeCourse._id
              ? { ...c, progress: newProgress, status: res.status || c.status }
              : c;
          })
        );
      }
    } catch (err) {
      console.error("Mark Complete Error:", err);
      alert(err.response?.data?.message || "Failed to update progress.");
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8"}>
      <div className={embedded ? "space-y-6" : "max-w-6xl mx-auto space-y-6"}>
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-3">
          {embedded ? (
            onBackToCatalog && (
              <button
                type="button"
                onClick={onBackToCatalog}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Catalog
              </button>
            )
          ) : (
            <>
              <Link
                to="/courses"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <ArrowLeft size={14} /> Back to Catalog
              </Link>

              <Link
                to={getDashboardPath(user?.userType || "student", user)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#1e3a8a] hover:bg-blue-100 transition shadow-2xs"
              >
                Dashboard →
              </Link>
            </>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Enrolled Courses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your ongoing progress, review study materials, watch video lectures, and complete modules.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600">
              Loading your active enrolled courses...
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
              onClick={fetchMyCoursesData}
              className="text-xs font-bold underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Enrolled Courses Grid */}
        {!loading && !error && enrolledCourses.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4">
            <BookOpen size={40} className="mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">
              You haven't enrolled in any courses yet
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore available recommended courses in the catalog and enroll to accelerate your learning.
            </p>
            {onBackToCatalog ? (
              <button
                type="button"
                onClick={onBackToCatalog}
                className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Compass size={14} /> Explore Course Catalog
              </button>
            ) : (
              <Link
                to="/courses"
                className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
              >
                <Compass size={14} /> Explore Course Catalog
              </Link>
            )}
          </div>
        ) : (
          !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((item) => {
                const course = item.course || item;
                const progressVal = item.progress || 0;

                return (
                  <CourseCard
                    key={item.applicationId || course._id}
                    course={course}
                    mode="enrolled"
                    progress={progressVal}
                    status={item.status}
                    onContinueLearning={() => handleOpenCourseViewer(item)}
                  />
                );
              })}
            </div>
          )
        )}

        {/* Interactive Course Player Modal */}
        {activeCourse && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    {activeCourse.category || activeCourse.domain || "Course Curriculum"}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {activeCourse.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCourse(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Summary Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <CourseProgress progress={courseProgressPercent} size="md" />
              </div>

              {/* Lessons List */}
              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Course Lessons & Materials ({courseContent.length})
                </h3>

                {loadingContent ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">
                      Loading lessons...
                    </p>
                  </div>
                ) : courseContent.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    No curriculum lessons published yet for this course.
                  </p>
                ) : (
                  courseContent.map((item, idx) => (
                    <ContentCard
                      key={item._id}
                      item={item}
                      index={idx}
                      isEmployee={false}
                      isStudent={true}
                      isCompleted={completedContentIds.has(item._id)}
                      onMarkComplete={handleMarkComplete}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMyCoursesPage;
