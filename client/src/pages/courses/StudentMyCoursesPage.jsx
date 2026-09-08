import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  FileText,
  Award,
  ArrowLeft,
  AlertCircle,
  X,
  ChevronRight,
} from "lucide-react";
import api from "../../api/api";
import CourseProgress from "../../components/courses/CourseProgress";
import ContentCard from "../../components/courses/ContentCard";

/**
 * StudentMyCoursesPage
 * Page displaying student's active enrolled courses and progress viewer.
 */
const StudentMyCoursesPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Course Viewer State
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseContent, setCourseContent] = useState([]);
  const [courseProgressPercent, setCourseProgressPercent] = useState(0);
  const [completedContentIds, setCompletedContentIds] = useState(new Set());
  const [loadingContent, setLoadingContent] = useState(false);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/student/courses");
      if (res.data?.success) {
        setEnrolledCourses(res.data.courses || []);
      }
    } catch (err) {
      console.error("Fetch Student My Courses Error:", err);
      setError(err.response?.data?.message || "Failed to load enrolled courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  // Open Learning Viewer for a specific course
  const handleOpenCourseViewer = async (courseItem) => {
    const courseObj = courseItem.course || courseItem;
    setActiveCourse(courseObj);
    setCourseProgressPercent(courseItem.progress || 0);

    try {
      setLoadingContent(true);
      const res = await api.get(`/student/courses/${courseObj._id}/content`);
      if (res.data?.success) {
        setCourseContent(res.data.content || []);
        if (res.data.progress !== undefined) {
          setCourseProgressPercent(res.data.progress);
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
      const res = await api.patch(
        `/student/courses/${activeCourse._id}/content/${contentId}/complete`
      );

      if (res.data?.success) {
        const newProgress = res.data.progress ?? 100;
        setCourseProgressPercent(newProgress);
        setCompletedContentIds((prev) => new Set(prev).add(contentId));

        // Update main enrolled list progress state as well
        setEnrolledCourses((prev) =>
          prev.map((c) =>
            c.course?._id === activeCourse._id ? { ...c, progress: newProgress } : c
          )
        );
      }
    } catch (err) {
      console.error("Mark Complete Error:", err);
      alert(err.response?.data?.message || "Failed to update progress.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-600">Loading your active learning courses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between gap-3">
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
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Enrolled Courses
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track your course completion progress, watch video lectures, and read study notes.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Enrolled Courses Grid */}
        {enrolledCourses.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
            <BookOpen size={36} className="mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-800">You haven't enrolled in any courses yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore available learning courses in the catalog and enroll to boost your skills.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((item) => {
              const course = item.course || {};
              const progressVal = item.progress || 0;
              const isCompleted = progressVal === 100 || item.status === "Completed";

              return (
                <div
                  key={item.applicationId || course._id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] text-[11px] font-bold border border-blue-200/80">
                        {course.category || "Course"}
                      </span>

                      {isCompleted && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Passed
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <CourseProgress progress={progressVal} status={item.status} size="sm" />

                    <button
                      type="button"
                      onClick={() => handleOpenCourseViewer(item)}
                      className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Continue Learning</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Learning Player / Lessons Modal */}
        {activeCourse && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    {activeCourse.category || "LMS Course Player"}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {activeCourse.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCourse(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Summary */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <CourseProgress progress={courseProgressPercent} size="md" />
              </div>

              {/* Lessons List */}
              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Course Lessons & Curriculum
                </h3>

                {loadingContent ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">Loading lessons...</p>
                  </div>
                ) : courseContent.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 text-center bg-slate-50 rounded-2xl">
                    No curriculum content published yet for this course.
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
