import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  ShieldCheck,
  Clock3,
  Lock,
  ArrowLeft,
} from "lucide-react";
import api from "../../api/api";
import CourseProgress from "../../components/courses/CourseProgress";
import ContentCard from "../../components/courses/ContentCard";

/**
 * StudentMyCoursesPage
 * Page displaying student's enrolled courses and pending applications grouped logically:
 * - Pending Applications (Waiting for Employer Approval)
 * - Active Enrolled Courses (Continue Learning Player)
 * - Completed Courses (Passed & Certificates)
 */
const StudentMyCoursesPage = () => {

  const { user } = useSelector((state) => state.auth || {});
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab State: "enrolled" | "pending" | "completed"
  const [activeTab, setActiveTab] = useState("enrolled");

  // Course Player Modal State
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
        setCoursesList(res.data.courses || []);
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

  // Filter courses by category tab using exact backend status strings
  const pendingCourses = coursesList.filter(
    (item) => item.status === "Applied" || item.status === "Pending"
  );

  const enrolledCourses = coursesList.filter(
    (item) => item.status === "Enrolled" || item.status === "In Progress"
  );

  const completedCourses = coursesList.filter(
    (item) => item.status === "Completed" || item.progress === 100
  );

  // Open LMS Course Content Player
  const handleOpenCourseViewer = async (courseItem) => {
    const courseObj = courseItem.course || courseItem;
    if (courseItem.status === "Applied" || courseItem.status === "Pending") {
      alert("This course application is pending employer approval. Content will unlock upon acceptance.");
      return;
    }

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

  // Mark Content Complete & Recalculate Progress
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

        // Update local state
        setCoursesList((prev) =>
          prev.map((c) => {
            if (c.course?._id === activeCourse._id) {
              const updatedStatus = newProgress === 100 ? "Completed" : c.status;
              return { ...c, progress: newProgress, status: updatedStatus };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error("Mark Complete Error:", err);
      alert(err.response?.data?.message || "Failed to update progress.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-600">Loading your enrolled courses & applications...</p>
      </div>
    );
  }

  // Get current active tab list
  let displayList = enrolledCourses;
  if (activeTab === "pending") displayList = pendingCourses;
  if (activeTab === "completed") displayList = completedCourses;

  return (

    <div className="space-y-6">
    
 {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("enrolled")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "enrolled"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Enrolled ({enrolledCourses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock3 size={14} />
            <span>Pending Applications ({pendingCourses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Completed ({completedCourses.length})</span>
          </button>
        </div>
    

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Courses Cards Grid */}
      {displayList.length === 0 ? (
        <div className="p-14 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <BookOpen size={40} className="mx-auto text-slate-300" />
          <h4 className="text-base font-bold text-slate-800">
            {activeTab === "pending"
              ? "No pending course applications"
              : activeTab === "completed"
              ? "No completed courses yet"
              : "You haven't enrolled in any courses yet"}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === "pending"
              ? "Applications you submit will appear here while waiting for employer approval."
              : activeTab === "completed"
              ? "Complete all curriculum content in an enrolled course to unlock completion status."
              : "Explore recommended courses in the catalog and click Apply Now to start learning."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayList.map((item) => {
            const course = item.course || {};
            const progressVal = item.progress || 0;
            const isPending = item.status === "Applied" || item.status === "Pending";
            const isCompleted = progressVal === 100 || item.status === "Completed";

            return (
              <div
                key={item.applicationId || course._id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#1e3a8a] text-[11px] font-bold border border-blue-200/80">
                      {course.category || "Course"}
                    </span>

                    {isPending ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1">
                        <Clock3 size={12} /> Application Pending
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 flex items-center gap-1">
                        <ShieldCheck size={12} /> Enrolled
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
                  <CourseProgress
                    progress={progressVal}
                    status={item.status}
                    size="sm"
                  />

                  {isPending ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Lock size={14} />
                      <span>Waiting for Employer Approval</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCourseViewer(item)}
                      className={`w-full py-2.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all ${
                        isCompleted
                          ? "bg-teal-600 hover:bg-teal-700"
                          : "bg-[#1e3a8a] hover:bg-[#1e40af]"
                      }`}
                    >
                      <span>{isCompleted ? "Review Completed Course" : "Continue Learning"}</span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= LMS COURSE CONTENT PLAYER MODAL ================= */}
      {activeCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-widest">
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
              <CourseProgress
                progress={courseProgressPercent}
                totalCount={courseContent.length}
                completedCount={
                  courseContent.filter((c) => completedContentIds.has(c._id)).length
                }
                size="md"
              />
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
  );
};

export default StudentMyCoursesPage;
