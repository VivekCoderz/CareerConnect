import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import {
  Search,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import api from "../../api/api";
import CourseCard from "../../components/courses/CourseCard";
import StudentMyCoursesPage from "./StudentMyCoursesPage";
import CourseDetailsPage from "./CourseDetailsPage";

/**
 * StudentCoursesPage
 * Clean Student LMS Dashboard & Catalog component.
 * Integrates directly inside the existing CareerConnect Student Dashboard framework.
 * (No duplicate inner navbar, notification bell, profile header, or logout button).
 */
const StudentCoursesPage = ({ onViewDetails }) => {

  // Navigation tab state: "recommended" | "my-courses" | "all" | "details"
  const [activeTab, setActiveTab] = useState("recommended");
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Data states
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [applicationStatusMap, setApplicationStatusMap] = useState({});
  const [studentProfile, setStudentProfile] = useState(null);

  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");

  // Application Modal state
  const [selectedCourseForApply, setSelectedCourseForApply] = useState(null);
  const [applicationMotivation, setApplicationMotivation] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({ message: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Recommended Courses, Catalog, Enrolled Applications, and Profile
  const fetchAllLmsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recommended courses from backend
      const recRes = await api.get("/courses/recommended").catch(() => null);
      if (recRes?.data?.success) {
        setRecommendedCourses(recRes.data.courses || []);
        if (recRes.data.studentProfile) {
          setStudentProfile(recRes.data.studentProfile);
        }
      }

      // Fetch student's profile info if not populated yet
      const profRes = await api.get("/student/profile").catch(() => null);
      if (profRes?.data?.success && profRes.data.profile) {
        setStudentProfile(profRes.data.profile);
      }

      // Fetch catalog for "All Courses"
      const catalogRes = await api.get("/employer/learning/courses").catch(() => null);
      if (catalogRes?.data?.courses) {
        setAllCourses(catalogRes.data.courses.filter((c) => c.status === "Published"));
      }

      // Fetch student's applications / enrolled courses to populate application status map
      const myRes = await api.get("/student/courses").catch(() => null);
      if (myRes?.data?.success && myRes.data.courses) {
        const apps = myRes.data.courses || [];
        setMyApplications(apps);

        const statusMap = {};
        apps.forEach((item) => {
          if (item.course?._id) {
            statusMap[item.course._id] = item.status || "Applied";
          }
        });
        setApplicationStatusMap(statusMap);
      }
    } catch (err) {
      console.error("Fetch Student LMS Data Error:", err);
      setError("Failed to load course catalog data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLmsData();
  }, []);

  // Open Application Form Modal
  const handleOpenApplyModal = (course) => {
    // Double check status before opening
    const currentStatus = applicationStatusMap[course._id];
    if (currentStatus) {
      showToast(`You have already applied for this course (Status: ${currentStatus}).`, "info");
      return;
    }

    setSelectedCourseForApply(course);
    setApplicationMotivation(
      `I want to enroll in "${course.title}" to build hands-on skills in ${course.domain || "technology"} and advance my career readiness.`
    );
  };

  // Submit Application Form Modal
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!selectedCourseForApply) return;

    const courseId = selectedCourseForApply._id;

    try {
      setIsSubmittingApp(true);
      const res = await api.post(`/courses/${courseId}/apply`, {
        motivation: applicationMotivation,
      });

      if (res.data?.success) {
        const createdApp = res.data.application || {};

        showToast("Application submitted successfully.", "success");

        // 1. Immediately update application status map to "Applied"
        setApplicationStatusMap((prev) => ({
          ...prev,
          [courseId]: "Applied",
        }));

        // 2. Immediately update myApplications state so count and My Courses tab update without refresh
        setMyApplications((prev) => [
          {
            applicationId: createdApp._id || `temp-${Date.now()}`,
            course: selectedCourseForApply,
            status: "Applied",
            progress: 0,
          },
          ...prev.filter((item) => item.course?._id !== courseId),
        ]);

        // 3. Close modal
        setSelectedCourseForApply(null);
      }
    } catch (err) {
      console.error("Apply Course Error:", err);
      const errMsg = err.response?.data?.message || "Failed to submit course application.";

      // Handle duplicate application response from backend
      if (err.response?.status === 409 || errMsg.toLowerCase().includes("already applied")) {
        setApplicationStatusMap((prev) => ({
          ...prev,
          [courseId]: "Applied",
        }));
        showToast("You have already applied for this course.", "info");
        setSelectedCourseForApply(null);
      } else {
        showToast(errMsg, "error");
      }
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Active list based on tab
  const currentCourseList = activeTab === "all" ? allCourses : recommendedCourses;

  // Filter courses by search & domain/level
  const filteredCourses = currentCourseList.filter((course) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      course.title?.toLowerCase().includes(q) ||
      course.description?.toLowerCase().includes(q) ||
      course.domain?.toLowerCase().includes(q) ||
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
    ...new Set(currentCourseList.map((c) => c.domain).filter(Boolean)),
  ];

  // Helper to get exact status for a course
  const getCourseStatus = (courseId) => {
    return applicationStatusMap[courseId] || null;
  };

  const studentName = user?.fullName || user?.name || "Student";
  const studentSkillsList = [
    ...(studentProfile?.technicalSkills || []),
    ...(studentProfile?.softSkills || []),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* ================= PAGE CONTROL & NAVIGATION TABS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Courses & Learning Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Explore recommended LMS courses, apply for enrollments, and complete video/notes curriculum.
          </p>
        </div>

        {/* Course View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("recommended");
              setSelectedCourseId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "recommended"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Recommended Courses</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("my-courses");
              setSelectedCourseId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "my-courses"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck size={14} />
            <span>My Courses ({myApplications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSelectedCourseId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={14} />
            <span>All Courses</span>
          </button>
        </div>
      </div>

      {/* ================= TAB CONTENTS ================= */}
      {activeTab === "my-courses" ? (
        <StudentMyCoursesPage />
      ) : activeTab === "details" && selectedCourseId ? (
        <CourseDetailsPage
          id={selectedCourseId}
          onBack={() => setActiveTab("recommended")}
        />
      ) : (
        <>
          {/* ================= WELCOME BANNER ================= */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-indigo-900 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-extrabold text-amber-300 uppercase tracking-wider border border-white/20 inline-flex items-center gap-1.5">
                <Sparkles size={13} /> CareerConnect Skill Recommendations
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {studentName} 👋
              </h2>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                {studentSkillsList.length > 0 ? (
                  <>
                    Recommended courses matched against your profile skills (
                    <span className="text-amber-300 font-bold">
                      {studentSkillsList.slice(0, 4).join(", ")}
                    </span>
                    ). Apply for courses to unlock video lectures, study notes, and certificates.
                  </>
                ) : (
                  "Explore top LMS courses designed to build job-ready skills and earn industry credentials."
                )}
              </p>
            </div>
          </div>

          {/* ================= SEARCH & FILTER TOOLBAR ================= */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by skill, title, category, or domain..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a] text-slate-700"
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
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white outline-none focus:border-[#1e3a8a] text-slate-700"
              >
                <option value="All">Level: All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === "recommended" ? (
                <>
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Recommended Courses</span>
                </>
              ) : (
                <>
                  <BookOpen size={18} className="text-[#1e3a8a]" />
                  <span>All Courses</span>
                </>
              )}
            </h3>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {filteredCourses.length} Courses Available
            </span>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl">
              <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600">
                Matching recommended courses for your profile...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Course Grid */}
          {!loading && filteredCourses.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <h4 className="text-base font-bold text-slate-800">No courses match your filter</h4>
              <p className="text-xs text-slate-500">
                Try adjusting your search query or switching domain filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  matchedSkills={course.matchedSkills || []}
                  applicationStatus={getCourseStatus(course._id)}
                  onViewDetails={(id) => {
                    setSelectedCourseId(id);
                    setActiveTab("details");
                  }}
                  onApply={(c) => handleOpenApplyModal(c)}
                  onContinueLearning={() => {
                    setActiveTab("my-courses");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= APPLICATION FORM MODAL ================= */}
      {selectedCourseForApply && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-extrabold text-amber-300 uppercase tracking-widest">
                  Course Application Form
                </span>
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {selectedCourseForApply.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForApply(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-[#1e3a8a] font-semibold flex items-center gap-2">
                <ShieldCheck size={16} /> Pre-filled with your registered student profile
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={studentName}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || "student@geetauniversity.edu.in"}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Statement of Interest / Motivation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={applicationMotivation}
                  onChange={(e) => setApplicationMotivation(e.target.value)}
                  placeholder="Why do you want to join this course?"
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-snug">
                💳 <strong>Payment Notice:</strong> Payment integration will be available after application approval by the course administrator.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForApply(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <span>{isSubmittingApp ? "Submitting..." : "Submit Application"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-slide-in-right ${
            toastMessage.type === "error"
              ? "bg-rose-900 text-white border border-rose-700"
              : "bg-slate-900 text-white border border-slate-700"
          }`}
        >
          <span>{toastMessage.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;