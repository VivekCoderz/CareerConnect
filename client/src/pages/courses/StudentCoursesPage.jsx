import JourneyLoader from "../../components/common/JourneyLoader";
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getDashboardPath } from "../../utils/dashboardRedirect";
import BrandLogo from "../../components/common/BrandLogo";
import {
  Search,
  Sparkles,
  BookOpen,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Award,
} from "lucide-react";

import api from "../../api/api";
import CourseCard from "../../components/courses/CourseCard";
import StudentMyCoursesPage from "./StudentMyCoursesPage";
import CourseDetailsPage from "./CourseDetailsPage";
import { loadRazorpayScript } from "../../utils/razorpay";
import { createCourseOrder, verifyCoursePayment } from "../../services/paymentService";
import PaymentReceiptModal from "../../components/courses/PaymentReceiptModal";

/**
 * StudentCoursesPage
 * Clean Student LMS Dashboard & Catalog component.
 * Integrates directly inside the existing CareerConnect Student Dashboard framework.
 * (No duplicate inner navbar, notification bell, profile header, or logout button).
 */
const StudentCoursesPage = ({ onViewDetails, onNavigateToMyCourses, embedded = false }) => {

  // Navigation tab state:
  // "recommended" | "my-courses" | "all" | "details"
  const [activeTab, setActiveTab] = useState("recommended");
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Data states
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [applicationStatusMap, setApplicationStatusMap] = useState({});

  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Application Modal state
  const [selectedCourseForApply, setSelectedCourseForApply] = useState(null);
  const [applicationMotivation, setApplicationMotivation] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Razorpay Checkout / Receipt state
  const [processingCourseId, setProcessingCourseId] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = "success") => {
    setToastMessage({
      message: msg,
      type,
    });

    setTimeout(() => setToastMessage(null), 4000);
  };

  const showMyCourses = () => {
    if (onNavigateToMyCourses) onNavigateToMyCourses();
    else setActiveTab("my-courses");
  };

  // Load independent catalog, recommendations, and enrollment data together.
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/courses/recommended").catch(() => null),
      api.get("/courses/catalog").catch(() => null),
      api.get("/student/courses").catch(() => null),
    ]).then(([recRes, catalogRes, myRes]) => {
      if (!active) return;
      if (recRes?.data?.success) setRecommendedCourses(recRes.data.courses || []);
      if (catalogRes?.data?.courses) {
        setAllCourses(catalogRes.data.courses.filter((course) => course.status === "Published"));
      }
      if (myRes?.data?.success && myRes.data.courses) {
        const applications = myRes.data.courses;
        setMyApplications(applications);
        const statusMap = {};
        applications.forEach((item) => {
          if (item.course?._id) statusMap[item.course._id] = item.status || "Applied";
        });
        setApplicationStatusMap(statusMap);
      }
    }).catch((err) => {
      if (!active) return;
      console.error("Fetch Student LMS Data Error:", err);
      setError("Failed to load course catalog data.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Handle direct buy or free enrollment from course cards
  const handleEnrollOrBuyCourse = async (course) => {
    const currentStatus = applicationStatusMap[course._id];
    if (currentStatus === "Enrolled" || currentStatus === "In Progress" || currentStatus === "Completed") {
      showToast("You are already enrolled in this course.", "info");
      showMyCourses();
      return;
    }

    try {
      setProcessingCourseId(course._id);

      // 1. Free Course -> Direct Enrollment
      if (!course.price || course.price <= 0) {
        let orderRes;
        try {
          orderRes = await createCourseOrder(course._id);
        } catch (callErr) {
          const directRes = await api.post(`/courses/${course._id}/enroll`).catch(() => null);
          if (directRes?.data?.success) {
            orderRes = directRes.data;
          } else {
            throw callErr;
          }
        }

        if (orderRes && orderRes.success) {
          showToast("Enrolled in free course successfully!", "success");
          setApplicationStatusMap((prev) => ({
            ...prev,
            [course._id]: "Enrolled",
          }));
          setMyApplications((prev) => [
            {
              applicationId: `enr-${Date.now()}`,
              course,
              status: "Enrolled",
              progress: 0,
            },
            ...prev.filter((i) => i.course?._id !== course._id),
          ]);
          setReceiptData({
            isFree: true,
            amount: 0,
            courseTitle: course.title,
            courseId: course._id,
            paidAt: new Date(),
          });
          setShowReceiptModal(true);
        } else {
          showToast(orderRes?.message || "Failed to enroll in free course.", "error");
        }
        return;
      }

      // 2. Paid Course -> Razorpay Checkout
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showToast("Unable to load Razorpay payment gateway.", "error");
        return;
      }

      const orderRes = await createCourseOrder(course._id);
      if (!orderRes || !orderRes.success) {
        showToast(orderRes?.message || "Failed to initiate payment.", "error");
        return;
      }

      const options = {
        key: orderRes.keyId || "rzp_test_TbSS4kb8G70xwq",
        amount: orderRes.amount,
        currency: orderRes.currency || "INR",
        name: "CareerConnect",
        description: `Enrollment: ${course.title}`,
        image: "/favicon.svg",
        ...(orderRes.isSimulated ? {} : { order_id: orderRes.orderId }),
        handler: async function (response) {
          try {
            const verifyRes = await verifyCoursePayment({
              razorpayOrderId: response.razorpay_order_id || orderRes.orderId,
              razorpayPaymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpaySignature: response.razorpay_signature || "",
              courseId: course._id,
            });

            if (verifyRes.success) {
              showToast("Payment verified! Course unlocked.", "success");
              setApplicationStatusMap((prev) => ({
                ...prev,
                [course._id]: "Enrolled",
              }));
              setMyApplications((prev) => [
                {
                  applicationId: verifyRes.payment?.id || `enr-${Date.now()}`,
                  course,
                  status: "Enrolled",
                  progress: 0,
                },
                ...prev.filter((i) => i.course?._id !== course._id),
              ]);
              setReceiptData({
                paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                orderId: response.razorpay_order_id || orderRes.orderId,
                amount: course.price,
                courseTitle: course.title,
                courseId: course._id,
                paidAt: new Date(),
              });
              setShowReceiptModal(true);
            }
          } catch (err) {
            console.error("Payment verification failed:", err);
            showToast(err.response?.data?.message || "Payment verification failed.", "error");
          } finally {
            setProcessingCourseId(null);
          }
        },
        prefill: {
          name: orderRes.prefill?.name || user?.fullName || "",
          email: orderRes.prefill?.email || user?.email || "",
          contact: orderRes.prefill?.contact || user?.phone || "",
        },
        theme: {
          color: "#1e3a8a",
        },
        modal: {
          ondismiss: function () {
            setProcessingCourseId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async function (response) {
        console.warn("Payment failed or cancelled:", response.error);
        setProcessingCourseId(null);

        const shouldSimulate = window.confirm(
          `Payment Alert: ${response.error?.description || "Transaction incomplete."}\n\nWould you like to complete demo enrollment for testing?`
        );

        if (shouldSimulate) {
          try {
            setProcessingCourseId(course._id);
            const simRes = await verifyCoursePayment({
              razorpayOrderId: orderRes.orderId,
              razorpayPaymentId: `test_pay_${Date.now().toString().slice(-8)}`,
              razorpaySignature: "demo_test_signature",
              courseId: course._id,
            });
            if (simRes.success) {
              showToast("Payment verified! Course unlocked.", "success");
              setApplicationStatusMap((prev) => ({
                ...prev,
                [course._id]: "Enrolled",
              }));
              setMyApplications((prev) => [
                {
                  applicationId: `enr-${Date.now()}`,
                  course,
                  status: "Enrolled",
                  progress: 0,
                },
                ...prev.filter((i) => i.course?._id !== course._id),
              ]);
              setReceiptData({
                paymentId: `test_pay_${Date.now().toString().slice(-8)}`,
                orderId: orderRes.orderId,
                amount: course.price,
                courseTitle: course.title,
                courseId: course._id,
                paidAt: new Date(),
              });
              setShowReceiptModal(true);
            }
          } catch (simErr) {
            showToast(simErr.response?.data?.message || "Demo verification failed.", "error");
          } finally {
            setProcessingCourseId(null);
          }
        }
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      showToast(err.response?.data?.message || "Failed to start payment.", "error");
    } finally {
      setProcessingCourseId(null);
    }
  };

  // Open Application Form Modal
  const handleOpenApplyModal = (course) => {
    const currentStatus = applicationStatusMap[course._id];

    if (currentStatus) {
      showToast(
        `You have already applied for this course (Status: ${currentStatus}).`,
        "info"
      );
      return;
    }

    setSelectedCourseForApply(course);

    setApplicationMotivation(
      `I want to enroll in "${course.title}" to build hands-on skills in ${
        course.domain || "technology"
      } and advance my career readiness.`
    );
  };
  // Submit Application Form Modal
  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!selectedCourseForApply) return;

    const courseId = selectedCourseForApply._id;

    try {
      setIsSubmittingApp(true);

      const res = await api.post(
        `/courses/${courseId}/apply`,
        {
          motivation: applicationMotivation,
        }
      );

      if (res.data?.success) {
        const createdApp = res.data.application || {};

        showToast(
          "Application submitted successfully.",
          "success"
        );

        // Update application status map
        setApplicationStatusMap((prev) => ({
          ...prev,
          [courseId]: "Applied",
        }));

        // Update My Applications state
        setMyApplications((prev) => [
          {
            applicationId:
              createdApp._id || `temp-${Date.now()}`,
            course: selectedCourseForApply,
            status: "Applied",
            progress: 0,
          },
          ...prev.filter(
            (item) => item.course?._id !== courseId
          ),
        ]);

        // Close modal
        setSelectedCourseForApply(null);
      }
    } catch (err) {
      console.error("Apply Course Error:", err);

      const errMsg =
        err.response?.data?.message ||
        "Failed to submit course application.";

      // Handle duplicate application
      if (
        err.response?.status === 409 ||
        errMsg.toLowerCase().includes("already applied")
      ) {
        setApplicationStatusMap((prev) => ({
          ...prev,
          [courseId]: "Applied",
        }));

        showToast(
          "You have already applied for this course.",
          "info"
        );

        setSelectedCourseForApply(null);
      } else {
        showToast(errMsg, "error");
      }
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Active list based on tab
  const currentCourseList = activeTab === "all" || recommendedCourses.length === 0
    ? allCourses
    : recommendedCourses;

  // Filter courses by search & domain/level
  const filteredCourses = currentCourseList.filter(
    (course) => {
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        course.title?.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q) ||
        course.domain?.toLowerCase().includes(q) ||
        (course.skills || []).some((skill) =>
          skill.toLowerCase().includes(q)
        );

      const matchesDomain =
        selectedDomain === "All" ||
        course.domain === selectedDomain;

      const matchesLevel =
        selectedLevel === "All" ||
        course.level?.toLowerCase() ===
          selectedLevel.toLowerCase();

      return (
        matchesSearch &&
        matchesDomain &&
        matchesLevel
      );
    }
  );

  const totalPages = Math.ceil(filteredCourses.length / PAGE_SIZE) || 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const startIndex = (visiblePage - 1) * PAGE_SIZE;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== visiblePage) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  const domainList = [
    "All",
    ...new Set(
      currentCourseList
        .map((course) => course.domain)
        .filter(Boolean)
    ),
  ];

  // Helper to get exact status for a course
  const getCourseStatus = (courseId) => {
    return applicationStatusMap[courseId] || null;
  };

  const studentName = user?.fullName || user?.name || "Student";
  const dashboardPath = getDashboardPath(user?.userType || user?.role, user);
  const enrolledCount = myApplications.filter((item) =>
    ["Enrolled", "In Progress", "Completed"].includes(item.status)
  ).length;

  return (
    <div className={embedded ? "space-y-7" : "min-h-screen bg-[#f5f7fc] text-slate-900"}>
      {!embedded && (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link to={dashboardPath} className="flex min-w-0 items-center gap-3">
              <BrandLogo markOnly className="h-9 w-11 shrink-0 sm:hidden" />
              <BrandLogo className="hidden h-9 w-44 shrink-0 sm:block" />
              <span className="hidden border-l border-slate-200 pl-3 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 md:inline">Learning hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to={dashboardPath} className="hidden items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex">
                <ArrowLeft size={15} /> Dashboard
              </Link>
              <button type="button" onClick={showMyCourses} className="inline-flex items-center gap-2 rounded-xl bg-[#213f94] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#182e72]">
                <BookOpen size={15} /> My learning
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={embedded ? "space-y-7" : "mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-9 lg:px-8"}>
      {!embedded && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to={dashboardPath} className="hover:text-[#213f94]">Dashboard</Link>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="text-[#213f94]">Learning hub</span>
        </nav>
      )}

      <section className="relative isolate overflow-hidden rounded-[30px] bg-gradient-to-br from-[#101d46] via-[#252467] to-[#5633a9] px-6 py-8 text-white shadow-xl shadow-indigo-950/10 sm:px-9 sm:py-10 lg:px-12">
        <div className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border-[44px] border-white/10" />
        <div className="pointer-events-none absolute bottom-[-7rem] right-44 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(270px,0.75fr)] lg:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-100">
              <Sparkles size={14} className="text-amber-300" /> CareerConnect learning
            </span>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              Build the skills for your next opportunity.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-indigo-100/90 sm:text-base">
              Hi {studentName.split(" ")[0]}, explore courses that fit your goals, learn at your pace, and track everything in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => { setActiveTab("all"); setCurrentPage(1); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-extrabold text-[#263875] shadow-sm transition hover:bg-indigo-50">
                Explore all courses <ArrowRight size={15} />
              </button>
              <button type="button" onClick={showMyCourses} className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/20">
                My learning <BookOpen size={15} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:gap-3 lg:grid-cols-1">
            {[
              { icon: BookOpen, value: allCourses.length, label: "Courses to explore" },
              { icon: Sparkles, value: recommendedCourses.length, label: "Picked for you" },
              { icon: Award, value: enrolledCount, label: "In your learning" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col gap-1 rounded-xl bg-white/10 p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-3">
                <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-amber-200 sm:flex"><Icon size={18} /></span>
                <span className="text-xl font-black leading-none sm:text-2xl">{value}</span>
                <span className="text-[10px] font-medium leading-tight text-indigo-100 sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PAGE CONTROL & NAVIGATION TABS ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Explore learning</h2>
          <p className="mt-1 text-sm text-slate-500">
            Find a course, check the details, and keep track of your progress.
          </p>
        </div>

        {/* Course View Tabs */}
        <div role="tablist" aria-label="Course views" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab("recommended");
              setSelectedCourseId(null);
              setCurrentPage(1);
            }}
            role="tab"
            aria-selected={activeTab === "recommended"}
            className={`whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "recommended"
                ? "bg-[#1e3a8a] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>For you</span>
          </button>

          <button
            type="button"
            onClick={() => {
              showMyCourses();
              setSelectedCourseId(null);
            }}
            role="tab"
            aria-selected={activeTab === "my-courses"}
            className={`whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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
              setCurrentPage(1);
            }}
            role="tab"
            aria-selected={activeTab === "all"}
            className={`whitespace-nowrap px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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

      ) : activeTab === "details" &&
        selectedCourseId ? (

        <CourseDetailsPage
          id={selectedCourseId}
          onBack={() =>
            setActiveTab("recommended")
          }
        />

      ) : (
        <>
          {/* ================= SEARCH & FILTER TOOLBAR ================= */}
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0 sm:p-5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search a course, skill, or topic"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-[#1e3a8a] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">

              <select
                value={selectedDomain}
                onChange={(e) => { setSelectedDomain(e.target.value); setCurrentPage(1); }}
                aria-label="Filter by domain"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1e3a8a]"
              >
                {domainList.map((domain) => (
                  <option
                    key={domain}
                    value={domain}
                  >
                    Domain: {domain}
                  </option>
                ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setCurrentPage(1); }}
                aria-label="Filter by level"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1e3a8a]"
              >
                <option value="All">
                  Level: All
                </option>
                <option value="beginner">
                  Beginner
                </option>
                <option value="intermediate">
                  Intermediate
                </option>
                <option value="advanced">
                  Advanced
                </option>
              </select>

            </div>
          </div>

          {/* Section Header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
            <h3 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900">
              {activeTab === "recommended" ? (
                <>
                  <Sparkles size={19} className="text-violet-600" />
                  <span>{recommendedCourses.length > 0 ? "Picked for you" : "Start exploring"}</span>
                </>
              ) : (
                <>
                  <BookOpen
                    size={18}
                    className="text-[#1e3a8a]"
                  />
                  <span>
                    All Courses
                  </span>
                </>
              )}

            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {activeTab === "recommended" && recommendedCourses.length > 0
                ? "Course suggestions based on your learning profile."
                : "Browse the published courses available right now."}
            </p>
            </div>

            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              {filteredCourses.length > 0
                ? `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, filteredCourses.length)} of ${filteredCourses.length} Courses`
                : "0 Courses Available"}
            </span>

          </div>

          {/* ================= LOADING / ERROR ================= */}

          {loading && (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl">
              <JourneyLoader variant="learning" size="md" className="mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600">
                Matching recommended courses for
                your profile...
              </p>

            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Course Grid */}
          {!loading && filteredCourses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-white px-6 py-14 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><BookOpen size={27} /></span>
              <h4 className="mt-5 text-lg font-bold text-slate-900">No courses found</h4>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {searchQuery || selectedDomain !== "All" || selectedLevel !== "All"
                  ? "Try a different search or clear your filters to see more courses."
                  : "New courses are on their way. Check back soon for fresh learning opportunities."}
              </p>
              {(searchQuery || selectedDomain !== "All" || selectedLevel !== "All") && (
                <button type="button" onClick={() => { setSearchQuery(""); setSelectedDomain("All"); setSelectedLevel("All"); }} className="mt-5 rounded-xl bg-[#213f94] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#182e72]">
                  Clear filters
                </button>
              )}
            </div>

          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    matchedSkills={course.matchedSkills || []}
                    applicationStatus={getCourseStatus(course._id)}
                    onViewDetails={(id) => {
                      if (onViewDetails) onViewDetails(id);
                      else {
                        setSelectedCourseId(id);
                        setActiveTab("details");
                      }
                    }}
                    onApply={(c) => handleEnrollOrBuyCourse(c)}
                    isApplying={processingCourseId === course._id}
                    onContinueLearning={() => {
                      showMyCourses();
                    }}
                  />
                ))}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <p className="text-xs font-semibold text-slate-500">
                    Page <span className="text-slate-900 font-bold">{visiblePage}</span> of{" "}
                    <span className="text-slate-900 font-bold">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(visiblePage - 1)}
                      disabled={visiblePage <= 1}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - visiblePage) <= 1)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === "..." ? (
                            <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold select-none">
                              ...
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => handlePageChange(p)}
                              className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold transition ${
                                visiblePage === p
                                  ? "bg-[#1e3a8a] text-white shadow-xs"
                                  : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}
                    </div>

                    <button
                      onClick={() => handlePageChange(visiblePage + 1)}
                      disabled={visiblePage >= totalPages}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </>
      )}

      {/* ================= APPLICATION FORM MODAL ================= */}

      {selectedCourseForApply && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">

          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">

            {/* Modal Header */}

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
                onClick={() =>
                  setSelectedCourseForApply(null)
                }
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={handleSubmitApplication}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >

              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-[#1e3a8a] font-semibold flex items-center gap-2">
                <ShieldCheck size={16} />
                Pre-filled with your registered
                student profile
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={studentName}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Email Address
                  </label>

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
                  Statement of Interest / Motivation{" "}
                  <span className="text-rose-500">
                    *
                  </span>
                </label>

                <textarea
                  rows={3}
                  value={applicationMotivation}
                  onChange={(e) =>
                    setApplicationMotivation(
                      e.target.value
                    )
                  }
                  placeholder="Why do you want to join this course?"
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 outline-none"
                />

              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-snug">
                💳 <strong>Payment Notice:</strong>{" "}
                Payment integration will be available
                after application approval by the
                course administrator.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCourseForApply(null)
                  }
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <span>
                    {isSubmittingApp
                      ? "Submitting..."
                      : "Submit Application"}
                  </span>

                  <ArrowRight size={14} />
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}

      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-slide-in-right ${
            toastMessage.type === "error"
              ? "bg-rose-900 text-white border border-rose-700"
              : "bg-slate-900 text-white border border-slate-700"
          }`}
        >
          <span>
            {toastMessage.type === "error"
              ? "⚠️"
              : "✓"}
          </span>

          <span>
            {toastMessage.message}
          </span>
        </div>
      )}

      {/* Razorpay Payment Receipt / Confirmation Modal */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receiptData={receiptData}
        onStartLearning={() => {
          setShowReceiptModal(false);
          showMyCourses();
        }}
      />
      </div>
    </div>
   
  );
};

export default StudentCoursesPage;
