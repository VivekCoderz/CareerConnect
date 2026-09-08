import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  Tag,
  Pencil,
  Trash2,
  Upload,
  EyeOff,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Video,
  DollarSign,
  Share2,
  Clock3,
  Lock,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import api from "../../api/api";
import ApplicationList from "../../components/courses/ApplicationList";
import ContentCard from "../../components/courses/ContentCard";

/**
 * CourseDetailsPage
 * Comprehensive course details view for Employers (management) & Students (discovery/apply).
 */
const CourseDetailsPage = ({
  id: propId,
  onBack,
  onEdit,
  onManageContent,
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = propId || params.id || params.courseId;

  const { user } = useSelector((state) => state.auth || {});

  const [course, setCourse] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("content"); // "content" | "applications"
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Student application state
  const [studentApplication, setStudentApplication] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [applySuccess, setApplySuccess] = useState(null);

  const isEmployer = user?.role === "employer";

  const fetchCourseData = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch course info
      if (isEmployer) {
        const myRes = await api.get("/courses/my-courses").catch(() => null);
        if (myRes?.data?.success && myRes.data.courses) {
          const found = myRes.data.courses.find((c) => c._id === courseId);
          if (found) setCourse(found);
        }
      }

      if (!course) {
        const detailRes = await api.get(`/courses/${courseId}`).catch(() => null);
        if (detailRes?.data?.success) {
          setCourse(detailRes.data.course);
        }
      }

      // Check student's application status for this course
      if (!isEmployer) {
        const myCoursesRes = await api.get("/student/courses").catch(() => null);
        if (myCoursesRes?.data?.courses) {
          const foundApp = myCoursesRes.data.courses.find(
            (item) => item.course?._id === courseId
          );
          if (foundApp) {
            setStudentApplication(foundApp);
          }
        }
      }

      // Fetch course content list
      const contentRes = await api.get(`/course-content/${courseId}`).catch(() => null);
      if (contentRes?.data?.success) {
        setContentList(contentRes.data.content || []);
        if (contentRes.data.course && !course) {
          setCourse(contentRes.data.course);
        }
      }
    } catch (err) {
      console.error("Fetch Course Details Error:", err);
      setError(err.response?.data?.message || "Failed to load course details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  // Toggle Publish / Draft
  const handleToggleStatus = async () => {
    if (!course) return;
    const newStatus = course.status === "Published" ? "Draft" : "Published";

    try {
      setIsUpdatingStatus(true);
      const res = await api.patch(`/courses/${course._id}/status`, {
        status: newStatus,
      });

      if (res.data?.success) {
        setCourse((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Update Status Error:", err);
      alert(err.response?.data?.message || "Failed to update course status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this course?"))
      return;

    try {
      const res = await api.delete(`/courses/${course._id}`);
      if (res.data?.success) {
        if (onBack) onBack();
        else navigate("/employer/courses");
      }
    } catch (err) {
      console.error("Delete Course Error:", err);
      alert(err.response?.data?.message || "Failed to delete course");
    }
  };

  // Submit Student Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingApp(true);
      setApplySuccess(null);

      const res = await api.post(`/courses/${course._id}/apply`, { motivation });
      if (res.data?.success) {
        setApplySuccess("Application submitted successfully!");
        setStudentApplication({
          status: "Applied",
          progress: 0,
        });
        setShowApplyModal(false);
      }
    } catch (err) {
      console.error("Apply Course Error:", err);
      alert(err.response?.data?.message || "Failed to apply for course.");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-600">Loading course overview...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-8 max-w-4xl mx-auto space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1e3a8a]"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={18} /> {error || "Course not found"}
        </div>
      </div>
    );
  }

  const appStatus = studentApplication?.status;
  const isEnrolled = appStatus === "Enrolled" || appStatus === "In Progress";
  const isPending = appStatus === "Applied" || appStatus === "Pending";
  const isCompleted = appStatus === "Completed";

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
          <span>Back to Courses</span>
        </button>

        {/* Course Main Hero Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1e3a8a] text-xs font-bold border border-blue-200/80">
                  {course.category || "General Course"}
                </span>

                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                  {course.domain || "Technology"}
                </span>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    course.status === "Published"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {course.status}
                </span>

                {appStatus && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
                    Status: {appStatus}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {course.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {course.description}
              </p>

              {/* Meta stats */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-2 flex-wrap border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-[#1e3a8a]" />
                  {course.duration} {course.durationUnit || "hours"}
                </span>

                <span className="flex items-center gap-1.5">
                  <Layers size={15} className="text-[#1e3a8a]" />
                  Level: <span className="capitalize font-bold text-slate-700">{course.level || "Beginner"}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <BookOpen size={15} className="text-[#1e3a8a]" />
                  {contentList.length} Lessons
                </span>

                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  {course.price > 0 ? `₹${course.price}` : "Free Access"}
                </span>
              </div>

              {/* Skills Tags */}
              {course.skills && course.skills.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400">Skills Covered:</span>
                  {course.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Box */}
            {course.thumbnail ? (
              <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-xs bg-slate-100">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full md:w-56 h-36 rounded-2xl border border-slate-200 flex-shrink-0 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] text-white p-4 flex flex-col justify-between">
                <BookOpen size={28} />
                <div>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-wider">{course.category}</p>
                  <p className="text-sm font-bold truncate">{course.title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Employer Actions Toolbar */}
          {isEmployer ? (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit ? onEdit(course._id) : navigate(`/employer/courses/${course._id}/edit`)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Pencil size={14} /> Edit Course
                </button>

                <button
                  type="button"
                  onClick={() => onManageContent ? onManageContent(course._id) : navigate(`/employer/courses/${course._id}/content`)}
                  className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <BookOpen size={14} /> Manage Content ({contentList.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isUpdatingStatus}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    course.status === "Published"
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {course.status === "Published" ? (
                    <>
                      <EyeOff size={14} /> Unpublish Course
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Publish Course
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all"
                  title="Delete Course"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* Student Action & Status States */
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              {isCompleted ? (
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 size={18} />
                  <span>Course Completed! You have mastered all modules.</span>
                </div>
              ) : isEnrolled ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Enrolled & Content Unlocked
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/student/courses")}
                    className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <span>Continue Learning</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : isPending ? (
                <div className="flex items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-2xl w-full text-xs font-semibold">
                  <Clock3 size={16} />
                  <span>Application Submitted! Waiting for employer approval. Course curriculum will unlock upon acceptance.</span>
                </div>
              ) : applySuccess ? (
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> {applySuccess}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowApplyModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all"
                >
                  <span>Apply Now</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabbed Section for Employer: Content vs Applications */}
        {isEmployer && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "content"
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Curriculum ({contentList.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "applications"
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Student Applications
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === "content" && (
              <div className="space-y-3">
                {contentList.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
                    <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No lectures uploaded yet</p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 mb-3">
                      Add video lectures, PDF guides, or notes to this course.
                    </p>
                    <button
                      type="button"
                      onClick={() => onManageContent ? onManageContent(course._id) : navigate(`/employer/courses/${course._id}/content`)}
                      className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold"
                    >
                      + Add Content
                    </button>
                  </div>
                ) : (
                  contentList.map((item, idx) => (
                    <ContentCard key={item._id} item={item} index={idx} isEmployee={true} />
                  ))
                )}
              </div>
            )}

            {activeTab === "applications" && (
              <ApplicationList courseId={course._id} courseTitle={course.title} />
            )}
          </div>
        )}

        {/* Student View Syllabus */}
        {!isEmployer && (
          <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Course Syllabus & Curriculum Overview
              </h3>
              {!isEnrolled && (
                <span className="text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <Lock size={12} /> Content Locked Until Enrollment
                </span>
              )}
            </div>

            {contentList.length === 0 ? (
              <p className="text-xs text-slate-500">Syllabus content will be available upon enrollment.</p>
            ) : (
              <div className="space-y-3">
                {contentList.map((item, idx) => (
                  <ContentCard
                    key={item._id}
                    item={item}
                    index={idx}
                    isStudent={true}
                    isLocked={!isEnrolled && !isCompleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Apply for Course
              </h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 font-semibold">
                Applying for: <span className="font-extrabold text-[#1e3a8a]">{course.title}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Why do you want to join this course?
                </label>
                <textarea
                  rows={3}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Share your interest and goals for this course..."
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 font-medium outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11.5px]">
                💳 Payment integration will be available after application approval.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="px-5 py-2 rounded-xl bg-[#1e3a8a] text-white font-bold shadow-xs"
                >
                  {isSubmittingApp ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailsPage;
