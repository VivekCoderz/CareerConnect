import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, BookOpen, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import CourseContentManager from "../../components/courses/CourseContentManager";
import ContentCard from "../../components/courses/ContentCard";
import CourseProgress from "../../components/courses/CourseProgress";
import api from "../../api/api";

/**
 * CourseContentPage
 * Dual-role Page for:
 * 1. Employers: Course Content Management (add/edit video lectures & PDFs via CourseContentManager).
 * 2. Students: Interactive LMS Course Player (watch videos, download PDFs, read notes, mark completed).
 */
const CourseContentPage = ({ id: propId, onBack }) => {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = propId || params.id || params.courseId;

  const { user } = useSelector((state) => state.auth || {});
  const isEmployer = user?.role === "employer";

  // Student player states
  const [courseInfo, setCourseInfo] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [progress, setProgress] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [loading, setLoading] = useState(!isEmployer);
  const [error, setError] = useState(null);

  const fetchStudentCourseContent = async () => {
    if (isEmployer || !courseId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/student/courses/${courseId}/content`);
      if (res.data?.success) {
        setCourseInfo(res.data.course || {});
        setContentList(res.data.content || []);
        setProgress(res.data.progress || 0);
      }
    } catch (err) {
      console.error("Fetch Student Course Content Error:", err);
      setError(
        err.response?.data?.message ||
          "You must be enrolled in this course to view its learning content."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentCourseContent();
  }, [courseId, isEmployer]);

  const handleMarkComplete = async (contentId) => {
    try {
      const res = await api.patch(
        `/student/courses/${courseId}/content/${contentId}/complete`
      );

      if (res.data?.success) {
        const newProgress = res.data.progress ?? 100;
        setProgress(newProgress);
        setCompletedIds((prev) => new Set(prev).add(contentId));
      }
    } catch (err) {
      console.error("Mark Complete Error:", err);
      alert(err.response?.data?.message || "Failed to mark lesson as completed.");
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(isEmployer ? "/employer/courses" : "/student/courses");
    }
  };

  // Employer View -> Use CourseContentManager
  if (isEmployer) {
    return (
      <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <CourseContentManager courseId={courseId} onBack={handleBack} />
        </div>
      </div>
    );
  }

  // Student LMS Player View
  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1e3a8a] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to My Courses</span>
        </button>

        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600">Loading course curriculum & player...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
            <Lock size={40} className="mx-auto text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold shadow-xs"
            >
              Return to Catalog
            </button>
          </div>
        ) : (
          <>
            {/* Header & Course Progress */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                    <ShieldCheck size={13} /> Enrolled Course
                  </span>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
                    {courseInfo?.title || "Course Curriculum"}
                  </h1>
                </div>
              </div>

              {/* Course Progress Component */}
              <CourseProgress
                progress={progress}
                totalCount={contentList.length}
                completedCount={
                  contentList.filter((c) => completedIds.has(c._id)).length
                }
                size="lg"
              />
            </div>

            {/* Curriculum Lessons List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">
                  Course Lessons & Resources
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {contentList.length} Total Lessons
                </span>
              </div>

              {contentList.length === 0 ? (
                <p className="text-xs text-slate-500 p-6 text-center bg-slate-50 rounded-2xl">
                  No learning materials published for this course yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {contentList.map((item, idx) => (
                    <ContentCard
                      key={item._id}
                      item={item}
                      index={idx}
                      isEmployee={false}
                      isStudent={true}
                      isCompleted={completedIds.has(item._id)}
                      onMarkComplete={handleMarkComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseContentPage;
