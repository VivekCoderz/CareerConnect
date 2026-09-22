import JourneyLoader from "../../components/common/JourneyLoader";
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Services
import {
  getEmployerDashboard,
  getOrganizationStatus,
  requestCompanyApproval,
} from "../../services/employerService";
import jobService from "../../services/jobService";
import candidateService from "../../services/candidateService";
import recruitmentService from "../../services/recruitmentService";
import organizationService from "../../services/organizationService";
import learningService from "../../services/learningService";

// Employer Components
import EmployerNavbar from "../../components/employer/EmployerNavbar";
import EmployerSidebar from "../../components/employer/EmployerSidebar";
import JobModal from "../../components/employer/JobModal";
import ATSPipelineView from "../../components/employer/ATSPipelineView";
import CandidateCard from "../../components/employer/CandidateCard";
import AssessmentModal from "../../components/employer/AssessmentModal";
import InterviewScheduleModal from "../../components/employer/InterviewScheduleModal";
import InterviewManagementHub from "../../components/employer/InterviewManagementHub";
import OfferModal from "../../components/employer/OfferModal";
import OfferManagementHub from "../../components/employer/OfferManagementHub";
import LearningAndCertificationsHub from "../../components/employer/LearningAndCertificationsHub";
import AddEmployeeModal from "../../components/employer/AddEmployeeModal";
import AssignTrainingModal from "../../components/employer/AssignTrainingModal";
import SkillGapMatrix from "../../components/employer/SkillGapMatrix";
import HiringAnalyticsChart from "../../components/employer/HiringAnalyticsChart";
import MyInternships from "./MyInternships";
import LearningAnalyticsChart from "../../components/employer/LearningAnalyticsChart";
import DashboardPage from "../../features/employer/dashboard/DashboardPage";

// Courses & Learning modules (embedded)
import EmployeeCoursesPage from "../courses/EmployeeCoursesPage";
import CreateCoursePage from "../courses/CreateCoursePage";
import EditCoursePage from "../courses/EditCoursePage";
import CourseContentPage from "../courses/CourseContentPage";
import CourseDetailsPage from "../courses/CourseDetailsPage";
import CourseCard from "../../components/courses/CourseCard";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Layout & Tab State
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [trainingAssignments, setTrainingAssignments] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);
  const [courseCatalog, setCourseCatalog] = useState([]);
  const [myLearning, setMyLearning] = useState({ enrollments: [] });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [orgStatusData, setOrgStatusData] = useState(null);
  const [isOrgSubmitting, setIsOrgSubmitting] = useState(false);
  const [isEditingOrgRequest, setIsEditingOrgRequest] = useState(false);
  const [orgForm, setOrgForm] = useState({
    companyName: "",
    officialCompanyEmail: "",
    companyWebsite: "",
    industry: "Information Technology",
    companySize: "11-50",
    verificationDocument: "",
    verificationDocumentName: "",
    requestingEmployeeName: "",
    employeeDesignation: "",
    officialEmployeeEmail: "",
  });

  // Search & Filter States
  const [candidateSearchSkill, setCandidateSearchSkill] = useState("");
  const [candidateUserType, setCandidateUserType] = useState("All");
  const [courseDomainFilter, setCourseDomainFilter] = useState("All");
  const [courseLevelFilter, setCourseLevelFilter] = useState("All");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedCatalogCourseDetailId, setSelectedCatalogCourseDetailId] = useState(null);

  // Course Management View States
  const [coursesHubSubTab, setCoursesHubSubTab] = useState("catalog"); // "catalog", "my-learning", "manage-courses"
  const [courseMgmtView, setCourseMgmtView] = useState("list"); // "list", "create", "edit", "content", "detail"
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Modal States
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState(null);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerApplication, setOfferApplication] = useState(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAssignTrainingModalOpen, setIsAssignTrainingModalOpen] = useState(false);
  const [preselectedCourseForTraining, setPreselectedCourseForTraining] = useState(null);

  // Internship View States
  const [internshipView, setInternshipView] = useState("list"); // "list", "new", "edit"
  const [internshipIdToEdit, setInternshipIdToEdit] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Load
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [
          dashRes,
          jobsRes,
          appsRes,
          candsRes,
          assessRes,
          interRes,
          offersRes,
          empsRes,
          deptsRes,
          trainRes,
          gapsRes,
          coursesRes,
          learningRes,
          analyticsRes,
          orgStatusRes,
        ] = await Promise.all([
          getEmployerDashboard().catch(() => ({})),
          jobService.getJobs({ myJobs: "true" }).catch(() => ({ jobs: [] })),
          recruitmentService.getEmployerApplications().catch(() => ({ applications: [] })),
          candidateService.searchCandidates().catch(() => ({ candidates: [] })),
          recruitmentService.getAssessments().catch(() => ({ assessments: [] })),
          recruitmentService.getInterviews().catch(() => ({ interviews: [] })),
          recruitmentService.getOffers().catch(() => ({ offers: [] })),
          organizationService.getEmployees().catch(() => ({ employees: [] })),
          organizationService.getDepartments().catch(() => ({ departments: [] })),
          organizationService.getTrainingAssignments().catch(() => ({ assignments: [] })),
          organizationService.getSkillGapAnalysis().catch(() => ({ skillGaps: [] })),
          learningService.getCourseCatalog().catch(() => ({ courses: [] })),
          learningService.getMyLearning().catch(() => ({ enrollments: [] })),
          recruitmentService.getEmployerAnalytics().catch(() => null),
          getOrganizationStatus().catch(() => null),
        ]);

        if (dashRes?.success) setDashboardData(dashRes);
        setJobs(jobsRes?.jobs || []);
        setApplications(appsRes?.applications || []);
        setCandidates(candsRes?.candidates || []);
        setAssessments(assessRes?.assessments || []);
        setInterviews(interRes?.interviews || []);
        setOffers(offersRes?.offers || []);
        setEmployees(empsRes?.employees || []);
        setDepartments(deptsRes?.departments || []);
        setTrainingAssignments(trainRes?.assignments || []);
        setSkillGaps(gapsRes?.skillGaps || []);
        setCourseCatalog(coursesRes?.courses || []);
        setMyLearning(learningRes || { enrollments: [] });
        if (analyticsRes?.success) setAnalyticsData(analyticsRes);
        if (orgStatusRes?.success) setOrgStatusData(orgStatusRes);
      } catch (err) {
        console.error("Dashboard loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Candidate Search Trigger
  const handleCandidateSearch = async (e) => {
    e?.preventDefault();
    try {
      const res = await candidateService.searchCandidates({
        skills: candidateSearchSkill,
        userType: candidateUserType,
      });
      if (res?.success) setCandidates(res.candidates);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshDashboardData = async () => {
    try {
      const res = await getEmployerDashboard();
      if (res?.success) setDashboardData(res);
    } catch {
      // Non-blocking
    }
  };

  // Job Actions
  const handleSaveJob = async (jobPayload) => {
    if (jobToEdit) {
      const res = await jobService.updateJob(jobToEdit._id, jobPayload);
      if (res?.success) {
        setJobs((prev) => prev.map((j) => (j._id === jobToEdit._id ? res.job : j)));
        showToast("Job opportunity updated successfully!");
        refreshDashboardData();
      }
    } else {
      const res = await jobService.createJob(jobPayload);
      if (res?.success) {
        setJobs((prev) => [res.job, ...prev]);
        showToast("New job posted to CareerConnect talent portal!");
        refreshDashboardData();
      }
    }
  };

  const handleToggleJobStatus = async (jobId, newStatus) => {
    const res = await jobService.updateJobStatus(jobId, newStatus);
    if (res?.success) {
      setJobs((prev) => prev.map((j) => (j._id === jobId ? res.job : j)));
      showToast(`Job status changed to ${newStatus}`);
      refreshDashboardData();
    }
  };

  const handleDuplicateJob = async (jobId) => {
    const res = await jobService.duplicateJob(jobId);
    if (res?.success) {
      setJobs((prev) => [res.job, ...prev]);
      showToast("Job duplicated as draft!");
      refreshDashboardData();
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;
    const res = await jobService.deleteJob(jobId);
    if (res?.success) {
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
      showToast("Job deleted successfully");
      refreshDashboardData();
    }
  };

  // ATS Stage / Status Action
  const handleUpdateAppStage = async (appId, newStage) => {
    try {
      const res = await recruitmentService.updateApplicationStatus(appId, newStage);
      if (res?.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a._id === appId
              ? { ...a, ...res.application, status: newStage, stage: newStage }
              : a
          )
        );
        showToast(`Application marked as ${newStage}`);
        refreshDashboardData();
      } else {
        showToast(res?.message || "Failed to update application", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update application", "error");
    }
  };

  const handleAddAppNote = async (appId, note) => {
    const res = await recruitmentService.addApplicationNote(appId, note);
    if (res?.success) {
      setApplications((prev) => prev.map((a) => (a._id === appId ? res.application : a)));
      showToast("Note saved");
    }
  };

  // Interview Schedule
  const handleScheduleInterview = async (interviewPayload) => {
    const res = await recruitmentService.scheduleInterview(interviewPayload);
    if (res?.success) {
      setInterviews((prev) => [res.interview, ...prev]);
      showToast("Interview scheduled and invitation sent!");
      refreshDashboardData();
    }
  };

  // Job Offer
  const handleCreateOffer = async (offerPayload) => {
    const res = await recruitmentService.createOffer(offerPayload);
    if (res?.success) {
      setOffers((prev) => [res.offer, ...prev]);
      showToast("Formal offer letter sent to candidate!");
      refreshDashboardData();
    }
  };

  // Assessment
  const handleCreateAssessment = async (assessmentPayload) => {
    const res = await recruitmentService.createAssessment(assessmentPayload);
    if (res?.success) {
      setAssessments((prev) => [res.assessment, ...prev]);
      showToast("Recruitment assessment created successfully!");
    }
  };

  // Employee Management
  const handleAddEmployee = async (employeePayload) => {
    const res = await organizationService.addEmployee(employeePayload);
    if (res?.success) {
      setEmployees((prev) => [res.employee, ...prev]);
      showToast("Employee added to organization directory!");
      refreshDashboardData();
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm("Remove employee from organization?")) return;
    const res = await organizationService.deleteEmployee(empId);
    if (res?.success) {
      setEmployees((prev) => prev.filter((e) => e._id !== empId));
      showToast("Employee removed");
      refreshDashboardData();
    }
  };

  // Assign Training
  const handleAssignTraining = async (payload) => {
    const res = await organizationService.assignTraining(payload);
    if (res?.success) {
      if (res.assignments) {
        setTrainingAssignments((prev) => [...res.assignments, ...prev]);
      } else if (res.assignment) {
        setTrainingAssignments((prev) => [res.assignment, ...prev]);
      }
      showToast(res.message || "Training assigned successfully!");
    }
  };

  // 1-Click Gap Training
  const handle1ClickAssignGap = (course, departmentName) => {
    setPreselectedCourseForTraining(course);
    setIsAssignTrainingModalOpen(true);
  };

  // Employer as Learner Enroll
  const handleEnrollCourse = async (courseId) => {
    const res = await learningService.enrollInCourse(courseId);
    if (res?.success) {
      const myLRes = await learningService.getMyLearning();
      setMyLearning(myLRes || { enrollments: [] });
      showToast("Enrolled in course! Happy Learning.");
    }
  };

  const handleUpdateLearningProgress = async (enrollmentId, percent) => {
    const res = await learningService.updateProgress(enrollmentId, { progressPercentage: percent });
    if (res?.success) {
      setMyLearning((prev) => ({
        ...prev,
        enrollments: prev.enrollments.map((e) => (e._id === enrollmentId ? res.enrollment : e)),
      }));
      showToast(`Progress updated to ${percent}%`);
    }
  };

  const profile = dashboardData?.profile || {};
  const completion = dashboardData?.profileCompletion || profile.profileCompletion || 85;

  // Synchronize employer info & dynamic pre-fill into Connect Company form
  useEffect(() => {
    const prof = dashboardData?.profile || {};
    const existingReq = orgStatusData?.organizationRequest;
    const pre = orgStatusData?.prefill || {};

    setOrgForm((prev) => ({
      companyName:
        existingReq?.companyName ||
        existingReq?.organizationName ||
        prev.companyName ||
        pre.companyName ||
        prof.companyName ||
        user?.companyName ||
        "",
      officialCompanyEmail:
        existingReq?.officialCompanyEmail ||
        existingReq?.officialEmail ||
        prev.officialCompanyEmail ||
        pre.officialCompanyEmail ||
        prof.officialEmail ||
        "",
      companyWebsite:
        existingReq?.companyWebsite ||
        existingReq?.website ||
        prev.companyWebsite ||
        pre.companyWebsite ||
        prof.website ||
        "",
      industry:
        existingReq?.industry ||
        prev.industry ||
        pre.industry ||
        prof.industry ||
        "Information Technology",
      companySize:
        existingReq?.companySize ||
        prev.companySize ||
        pre.companySize ||
        prof.companySize ||
        "11-50",
      verificationDocument:
        existingReq?.verificationDocument ||
        prev.verificationDocument ||
        pre.verificationDocument ||
        "",
      verificationDocumentName: prev.verificationDocumentName || "",
      requestingEmployeeName:
        existingReq?.requestingEmployeeName ||
        existingReq?.contactPerson ||
        prev.requestingEmployeeName ||
        pre.requestingEmployeeName ||
        user?.fullName ||
        "",
      employeeDesignation:
        existingReq?.employeeDesignation ||
        existingReq?.designation ||
        prev.employeeDesignation ||
        pre.employeeDesignation ||
        user?.designation ||
        prof.designation ||
        "Talent Acquisition / HR",
      officialEmployeeEmail:
        existingReq?.officialEmployeeEmail ||
        prev.officialEmployeeEmail ||
        pre.officialEmployeeEmail ||
        user?.email ||
        "",
    }));
  }, [dashboardData?.profile, user, orgStatusData]);

  // Handle document file upload
  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Verification document must be under 10MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setOrgForm((prev) => ({
        ...prev,
        verificationDocument: reader.result,
        verificationDocumentName: file.name,
      }));
      showToast(`Attached document: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Handle request company approval submission (strictly 9 fields, no reason)
  const handleRequestCompanyApproval = async (e) => {
    e?.preventDefault();
    if (!orgForm.companyName?.trim()) {
      showToast("Please provide company name.", "error");
      return;
    }
    if (!orgForm.officialCompanyEmail?.trim()) {
      showToast("Please provide official company email.", "error");
      return;
    }
    if (!orgForm.companyWebsite?.trim()) {
      showToast("Please provide company website.", "error");
      return;
    }
    if (!orgForm.industry?.trim()) {
      showToast("Please select company industry.", "error");
      return;
    }
    if (!orgForm.companySize?.trim()) {
      showToast("Please select company size.", "error");
      return;
    }
    if (!orgForm.verificationDocument?.trim()) {
      showToast("Please upload or provide company registration/verification document.", "error");
      return;
    }
    if (!orgForm.requestingEmployeeName?.trim()) {
      showToast("Please provide requesting employee name.", "error");
      return;
    }
    if (!orgForm.employeeDesignation?.trim()) {
      showToast("Please provide employee designation.", "error");
      return;
    }
    if (!orgForm.officialEmployeeEmail?.trim()) {
      showToast("Please provide official employee email.", "error");
      return;
    }

    try {
      setIsOrgSubmitting(true);
      const payload = {
        companyName: orgForm.companyName.trim(),
        officialCompanyEmail: orgForm.officialCompanyEmail.trim(),
        companyWebsite: orgForm.companyWebsite.trim(),
        industry: orgForm.industry.trim(),
        companySize: orgForm.companySize.trim(),
        verificationDocument: orgForm.verificationDocument.trim(),
        requestingEmployeeName: orgForm.requestingEmployeeName.trim(),
        employeeDesignation: orgForm.employeeDesignation.trim(),
        officialEmployeeEmail: orgForm.officialEmployeeEmail.trim(),
      };
      const res = await requestCompanyApproval(payload);
      if (res?.success) {
        showToast(
          res.message || "Company connection request submitted! Pending Super Admin Approval.",
          "success"
        );
        setIsEditingOrgRequest(false);
        const updated = await getOrganizationStatus();
        if (updated?.success) {
          setOrgStatusData(updated);
        }
      }
    } catch (err) {
      console.error("Error submitting company connection request:", err);
      showToast(
        err.response?.data?.message || "Failed to submit company connection request",
        "error"
      );
    } finally {
      setIsOrgSubmitting(false);
    }
  };

  const filteredCourseCatalog = useMemo(() => {
    return courseCatalog.filter((course) => {
      const q = courseSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title?.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q) ||
        (course.skills || []).some((s) => s.toLowerCase().includes(q));

      const matchesDomain =
        courseDomainFilter === "All" || course.domain === courseDomainFilter;

      const matchesLevel =
        courseLevelFilter === "All" ||
        course.level?.toLowerCase() === courseLevelFilter.toLowerCase();

      return matchesSearch && matchesDomain && matchesLevel;
    });
  }, [courseCatalog, courseSearchQuery, courseDomainFilter, courseLevelFilter]);

  const orgStatus = orgStatusData?.status || "NOT_REQUESTED";
  let orgBadge = null;
  if (orgStatus === "APPROVED" || orgStatusData?.hasCompany) {
    orgBadge = "Verified";
  } else if (orgStatus === "PENDING" || orgStatus === "UNDER_REVIEW") {
    orgBadge = "Pending";
  } else if (orgStatus === "REJECTED") {
    orgBadge = "Action Req.";
  } else {
    orgBadge = "Verify";
  }

  // Helper for interview scheduled date/time formatting
  const formatInterviewDate = (dateStr, timeStr) => {
    if (!dateStr) return timeStr || "Upcoming";
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

      let dayLabel = "";
      if (diffDays === 0) dayLabel = "Today";
      else if (diffDays === 1) dayLabel = "Tomorrow";
      else if (diffDays === -1) dayLabel = "Yesterday";
      else {
        dayLabel = target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      return timeStr ? `${dayLabel} • ${timeStr}` : dayLabel;
    } catch (e) {
      return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
    }
  };

  // Helper for relative application date formatting
  const formatApplicationDate = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return String(dateStr).slice(0, 10);
    }
  };

  // Helper for application status badges
  const getAppStatusBadge = (status) => {
    const s = (status || "Applied").toLowerCase();
    if (s.includes("shortlist")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("interview")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (s.includes("select") || s.includes("offer") || s.includes("hire")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (s.includes("reject") || s.includes("withdraw")) return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-800 border-amber-200";
  };

  // Real dynamic active jobs derived from state / backend
  const activeJobsList = useMemo(() => {
    const filtered = jobs.filter((j) => {
      const s = (j.status || "").toLowerCase();
      return s === "published" || s === "active" || s === "open";
    });
    if (filtered.length > 0) return filtered;
    if (dashboardData?.activeJobs && dashboardData.activeJobs.length > 0) {
      return dashboardData.activeJobs;
    }
    return [];
  }, [jobs, dashboardData]);

  // Real dynamic upcoming interviews derived from state / backend
  const upcomingInterviewsList = useMemo(() => {
    const fromState = interviews.filter((iv) => {
      const s = (iv.status || "").toLowerCase();
      return !["cancelled", "completed", "no_show", "draft"].includes(s);
    });
    if (fromState.length > 0) {
      return fromState.slice(0, 5).map((iv) => ({
        _id: iv._id,
        candidateName: iv.candidateId?.fullName || iv.candidateName || "Candidate",
        candidateEmail: iv.candidateId?.email || "",
        candidateImage: iv.candidateId?.profileImage || "",
        roleTitle: iv.jobId?.title || iv.internshipId?.title || iv.title || "Position",
        scheduledDate: iv.scheduledDate || "",
        scheduledTime: iv.scheduledTime || iv.startTime || "",
        status: iv.status || "Scheduled",
        meetingLink: iv.meetingLink || "",
        meetingMode: iv.meetingMode || "Online",
        jobId: iv.jobId?._id || iv.jobId,
      }));
    }
    if (dashboardData?.upcomingInterviews && dashboardData.upcomingInterviews.length > 0) {
      return dashboardData.upcomingInterviews.filter((iv) => {
        const s = (iv.status || "").toLowerCase();
        return !["cancelled", "completed", "no_show", "draft"].includes(s);
      });
    }
    return [];
  }, [interviews, dashboardData]);

  // Real dynamic recent applications derived from state / backend
  const recentApplicationsList = useMemo(() => {
    if (applications.length > 0) {
      return applications.slice(0, 5).map((app) => ({
        _id: app._id,
        candidateName: app.studentName || app.candidateId?.fullName || "Applicant",
        candidateEmail: app.studentEmail || app.candidateId?.email || "",
        candidateImage: app.candidateId?.profileImage || "",
        position: app.opportunityTitle || app.jobId?.title || app.internshipId?.title || "Role",
        status: app.status || "Applied",
        appliedDate: app.appliedAt || app.createdAt,
        resumeUrl: app.resumeUrl || "",
      }));
    }
    if (dashboardData?.recentApplications && dashboardData.recentApplications.length > 0) {
      return dashboardData.recentApplications;
    }
    return [];
  }, [applications, dashboardData]);

  // True dynamic statistics from database data with zero hardcoded mock fallbacks
  const stats = useMemo(() => {
    return {
      activeJobs: activeJobsList.length || (dashboardData?.stats?.activeJobs ?? 0),
      applications: applications.length || (dashboardData?.stats?.applications ?? 0),
      interviews: upcomingInterviewsList.length || (dashboardData?.stats?.upcomingInterviews ?? dashboardData?.stats?.interviews ?? 0),
      teamStaff: employees.length || (dashboardData?.stats?.teamStaff ?? 0),
      employees: employees.length || (dashboardData?.stats?.teamStaff ?? 0),
      coursesCount: courseCatalog.length,
      orgBadge,
    };
  }, [activeJobsList, applications, upcomingInterviewsList, employees, dashboardData, courseCatalog, orgBadge]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <JourneyLoader variant="employer" size="hero" className="mb-4" />
        <p className="text-lg font-semibold text-slate-600">
          Preparing your hiring workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-slide-in-right">
          <span>✓</span> {toastMessage.text}
        </div>
      )}

      {/* Top Navbar */}
      <EmployerNavbar
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        profile={profile}
        company={dashboardData?.company}
        profileCompletion={dashboardData?.profileCompletion || completion}
        unreadNotifications={dashboardData?.unreadNotificationsCount || 0}
        activity={dashboardData?.activity || []}
        onSelectTab={setActiveTab}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Sidebar */}
        <EmployerSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          stats={stats}
        />

        {/* Content Area */}
        <main className="flex-1 lg:pl-64 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW DASHBOARD                               */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <DashboardPage
              data={dashboardData}
              onPostJob={() => {
                setJobToEdit(null);
                setIsJobModalOpen(true);
              }}
              onPostInternship={() => {
                setActiveTab("internships");
                setInternshipView("new");
              }}
              onViewApplications={() => setActiveTab("ats")}
              onScheduleInterview={() => {
                setInterviewCandidate(null);
                setIsInterviewModalOpen(true);
              }}
              onViewPipeline={() => setActiveTab("ats")}
              onCandidateClick={() => setActiveTab("candidates")}
              onJobClick={() => setActiveTab("jobs")}
              onViewAllJobs={() => setActiveTab("jobs")}
              onNavigate={(path) => {
                if (path.startsWith("/jobs")) setActiveTab("jobs");
                else if (path.startsWith("/ats")) setActiveTab("ats");
                else if (path.startsWith("/interviews")) setActiveTab("interviews");
                else if (path.startsWith("/offers")) setActiveTab("offers");
                else if (path.startsWith("/team")) setActiveTab("employees");
                else navigate(path);
              }}
              onRescheduleInterview={(iv) => {
                setInterviewCandidate(iv);
                setIsInterviewModalOpen(true);
              }}
              onCancelInterview={async (iv) => {
                try {
                  await recruitmentService.cancelInterview(iv.id || iv._id, {
                    cancellationReason: "Cancelled by employer from dashboard",
                  });
                  showToast("Interview cancelled successfully");
                  const freshInterviews = await recruitmentService.getInterviews().catch(() => ({ interviews: [] }));
                  setInterviews(freshInterviews.interviews || []);
                  refreshDashboardData();
                } catch {
                  showToast("Failed to cancel interview", "error");
                }
              }}
            />
          )}

          {/* ======================================================== */}
          {/* TAB: INTERNSHIP MANAGEMENT                               */}
          {/* ======================================================== */}
          {activeTab === "internships" && (
            <div className="space-y-5 animate-fade-in bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              {internshipView === "list" && (
                <MyInternships
                  onPostClick={() => setInternshipView("new")}
                  onEditClick={(id) => {
                    setInternshipIdToEdit(id);
                    setInternshipView("edit");
                  }}
                />
              )}
              {internshipView === "new" && (
                <PostInternship
                  onCancel={() => setInternshipView("list")}
                  onSuccess={() => setInternshipView("list")}
                />
              )}
              {internshipView === "edit" && (
                <EditInternship
                  id={internshipIdToEdit}
                  onCancel={() => setInternshipView("list")}
                  onSuccess={() => setInternshipView("list")}
                />
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: JOB MANAGEMENT                                    */}
          {/* ======================================================== */}
          {activeTab === "jobs" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Job & Opportunity Management</h2>
                  <p className="text-xs text-slate-500">Create, edit, pause and track vacancies</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setJobToEdit(null);
                    setIsJobModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <span>+</span> Post Opportunity
                </button>
              </div>

              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job._id}
                    className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{job.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          job.status === "Published"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : job.status === "Draft"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {job.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold">
                          {job.employmentType}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10.5px] font-semibold">
                          {job.workMode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        📍 {job.location} · Department: <span className="font-semibold text-slate-700">{job.department}</span> · Openings: {job.openings}
                      </p>
                      {job.requiredSkills?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">Skills:</span>
                          {job.requiredSkills.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-50 text-[#92400e] text-[10px] font-semibold border border-amber-200/60">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleJobStatus(job._id, job.status === "Published" ? "Paused" : "Published")}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                      >
                        {job.status === "Published" ? "Pause" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateJob(job._id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJobToEdit(job);
                          setIsJobModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job._id)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 text-xs font-bold"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ATS APPLICANT PIPELINE                            */}
          {/* ======================================================== */}
          {activeTab === "ats" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Applicant Tracking System</h2>
                <p className="text-xs text-slate-500">Manage candidate applications and hiring stages.</p>
              </div>

              <ATSPipelineView
                jobs={jobs}
                applications={applications}
                onUpdateStage={handleUpdateAppStage}
                onScheduleInterview={(app) => {
                  setInterviewCandidate(app);
                  setIsInterviewModalOpen(true);
                }}
                onCreateOffer={(app) => {
                  setOfferApplication(app);
                  setIsOfferModalOpen(true);
                }}
                onAddNote={handleAddAppNote}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: TALENT POOL & MATCHING ENGINE                     */}
          {/* ======================================================== */}
          {activeTab === "candidates" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">CareerConnect Talent Pool</h2>
                  <p className="text-xs text-slate-500">Live candidate matching with strong & missing skill analysis</p>
                </div>
              </div>

              {/* Filter Search Bar */}
              <form onSubmit={handleCandidateSearch} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
                <input
                  value={candidateSearchSkill}
                  onChange={(e) => setCandidateSearchSkill(e.target.value)}
                  placeholder="Filter by skills (e.g. React.js, Python, SQL)..."
                  className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
                <select
                  value={candidateUserType}
                  onChange={(e) => setCandidateUserType(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
                >
                  <option value="All">All Talent Types</option>
                  <option value="student">Undergraduate Students</option>
                  <option value="fresher">Fresh Graduates</option>
                  <option value="professional">Alumni & Working Professionals</option>
                </select>
                <button
                  type="submit"
                  className="px-5 h-10 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
                >
                  Search & Match
                </button>
              </form>

              {/* Candidate Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate._id || candidate.id}
                    candidate={candidate}
                    onScheduleInterview={(c) => {
                      setInterviewCandidate(c);
                      setIsInterviewModalOpen(true);
                    }}
                    onAssignAssessment={() => setIsAssessmentModalOpen(true)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: RECRUITMENT ASSESSMENTS                            */}
          {/* ======================================================== */}
          {activeTab === "assessments" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recruitment Assessments</h2>
                  <p className="text-xs text-slate-500">Create timed tests, auto-evaluate candidate skills</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
                >
                  + Create Assessment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessments.map((test) => (
                  <div key={test._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{test.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{test.skillCategory} · {test.timeLimitMinutes} Mins</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        {test.passingScorePercentage}% Pass Threshold
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{test.description}</p>
                    <p className="text-xs font-semibold text-slate-400">
                      📝 {test.questions?.length || 3} Multiple Choice Questions
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: INTERVIEWS                                        */}
          {/* ======================================================== */}
          {activeTab === "interviews" && (
            <InterviewManagementHub
              interviews={interviews}
              jobs={jobs}
              onRefresh={async () => {
                const interviewsRes = await recruitmentService.getInterviews().catch(() => ({ interviews: [] }));
                setInterviews(interviewsRes?.interviews || []);
              }}
              showToast={showToast}
              onOpenOfferModal={(candidate) => {
                setOfferApplication(candidate);
                setIsOfferModalOpen(true);
              }}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 7: JOB OFFERS                                        */}
          {/* ======================================================== */}
          {activeTab === "offers" && (
            <OfferManagementHub
              offers={offers}
              jobs={jobs}
              companyName={user?.fullName || "CareerConnect Partner"}
              onRefresh={async () => {
                const offersRes = await recruitmentService.getOffers().catch(() => ({ offers: [] }));
                setOffers(offersRes?.offers || []);
              }}
              showToast={showToast}
            />
          )}

          {/* ======================================================== */}
          {/* TAB: UNIFIED COURSES & LEARNING HUB                      */}
          {/* ======================================================== */}
          {(activeTab === "courses" || activeTab === "manage-courses" || activeTab === "learning" || activeTab === "my-learning") && (
            <div className="space-y-6 animate-fade-in">
              {/* Top Courses Subtab Navigation */}
              <div className="p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setCoursesHubSubTab("catalog");
                    setSelectedCatalogCourseDetailId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    coursesHubSubTab === "catalog"
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>🌟</span>
                  <span>Explore Course Catalog</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCoursesHubSubTab("my-learning");
                    setSelectedCatalogCourseDetailId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    coursesHubSubTab === "my-learning"
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>🎓</span>
                  <span>My Enrolled Courses & Certs</span>
                  {myLearning?.enrollments?.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      coursesHubSubTab === "my-learning" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                    }`}>
                      {myLearning.enrollments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCoursesHubSubTab("manage-courses");
                    setCourseMgmtView("list");
                    setSelectedCatalogCourseDetailId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    coursesHubSubTab === "manage-courses"
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>🛠️</span>
                  <span>Created Courses Studio</span>
                </button>
              </div>

              {/* SUBTAB 1: COURSE CATALOG & DISCOVERY */}
              {coursesHubSubTab === "catalog" && (
                <div className="space-y-5 animate-fade-in">
                  {selectedCatalogCourseDetailId ? (
                    <CourseDetailsPage
                      embedded
                      id={selectedCatalogCourseDetailId}
                      onBack={() => setSelectedCatalogCourseDetailId(null)}
                    />
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Explore & Recommended Courses
                          </h2>
                          <p className="text-xs text-slate-500">
                            Search by your desired skills, domain, and level to enroll and gain verified credentials
                          </p>
                        </div>
                      </div>

                      {/* Search & Domain & Level Filters */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            placeholder="Search courses by skill (e.g. React, Python, Cloud, HR, AI)..."
                            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#1e3a8a]"
                          />
                          <select
                            value={courseLevelFilter}
                            onChange={(e) => setCourseLevelFilter(e.target.value)}
                            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-[#1e3a8a]"
                          >
                            <option value="All">All Difficulty Levels</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Domain:</span>
                          {[
                            "All",
                            "Full Stack Development",
                            "Data Science & AI",
                            "Cloud & DevOps",
                            "Management & HR",
                          ].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setCourseDomainFilter(d)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                                courseDomainFilter === d
                                  ? "bg-[#1e3a8a] text-white shadow-2xs"
                                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Courses Grid */}
                      {filteredCourseCatalog.length === 0 ? (
                        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                          <p className="text-xs text-slate-500">
                            No courses match your search filter.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {filteredCourseCatalog.map((course) => {
                            const isEnrolled = myLearning?.enrollments?.some(
                              (e) => (e.courseId?._id || e.courseId) === course._id
                            );

                            return (
                              <CourseCard
                                key={course._id}
                                course={course}
                                mode="catalog"
                                isApplied={isEnrolled}
                                onViewDetails={(id) =>
                                  setSelectedCatalogCourseDetailId(id)
                                }
                                onEnroll={handleEnrollCourse}
                              />
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SUBTAB 2: MY ENROLLED COURSES & CERTIFICATES */}
              {coursesHubSubTab === "my-learning" && (
                <div className="space-y-5 animate-fade-in">
                  <LearningAndCertificationsHub
                    myLearning={myLearning}
                    userName={user?.fullName || "Verified Professional"}
                    onRefresh={async () => {
                      const myLRes = await learningService.getMyLearning().catch(() => ({ enrollments: [] }));
                      setMyLearning(myLRes || { enrollments: [] });
                    }}
                    showToast={showToast}
                  />
                </div>
              )}

              {/* SUBTAB 3: MY CREATED COURSES STUDIO */}
              {coursesHubSubTab === "manage-courses" && (
                <div className="space-y-5 animate-fade-in">
                  {courseMgmtView === "list" && (
                    <EmployeeCoursesPage
                      embedded
                      onCreateCourse={() => setCourseMgmtView("create")}
                      onEditCourse={(id) => {
                        setSelectedCourseId(id);
                        setCourseMgmtView("edit");
                      }}
                      onManageContent={(id) => {
                        setSelectedCourseId(id);
                        setCourseMgmtView("content");
                      }}
                      onViewDetails={(id) => {
                        setSelectedCourseId(id);
                        setCourseMgmtView("detail");
                      }}
                    />
                  )}
                  {courseMgmtView === "create" && (
                    <CreateCoursePage
                      onCancel={() => setCourseMgmtView("list")}
                      onSuccess={(newCourse) => {
                        if (newCourse?._id) {
                          setSelectedCourseId(newCourse._id);
                          setCourseMgmtView("content");
                          showToast("Course created! Now upload your video lectures (Cloudinary) and curriculum.");
                        } else {
                          setCourseMgmtView("list");
                          showToast("Course created successfully!");
                        }
                      }}
                    />
                  )}
                  {courseMgmtView === "edit" && (
                    <EditCoursePage
                      id={selectedCourseId}
                      onCancel={() => setCourseMgmtView("list")}
                      onSuccess={() => {
                        setCourseMgmtView("list");
                        showToast("Course updated successfully!");
                      }}
                    />
                  )}
                  {courseMgmtView === "content" && (
                    <CourseContentPage
                      id={selectedCourseId}
                      onBack={() => setCourseMgmtView("list")}
                    />
                  )}
                  {courseMgmtView === "detail" && (
                    <CourseDetailsPage
                      embedded
                      id={selectedCourseId}
                      onBack={() => setCourseMgmtView("list")}
                      onEdit={(id) => {
                        setSelectedCourseId(id);
                        setCourseMgmtView("edit");
                      }}
                      onManageContent={(id) => {
                        setSelectedCourseId(id);
                        setCourseMgmtView("content");
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: CONNECT COMPANY WITH CAREERCONNECT                   */}
          {/* ======================================================== */}
          {activeTab === "organization" && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Connect Company with CareerConnect
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        orgStatus === "APPROVED" || orgStatusData?.hasCompany
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : orgStatus === "PENDING" || orgStatus === "UNDER_REVIEW"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : orgStatus === "REJECTED"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-slate-100 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {orgStatus === "APPROVED" || orgStatusData?.hasCompany
                        ? "✓ Connected & Verified"
                        : orgStatus === "PENDING" || orgStatus === "UNDER_REVIEW"
                        ? "⏳ Pending Approval"
                        : orgStatus === "REJECTED"
                        ? "⚠️ Action Required"
                        : "Not Connected"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect your organization to CareerConnect to unlock verified enterprise workspace status, post jobs, and manage candidates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(orgStatus === "PENDING" || orgStatus === "UNDER_REVIEW") && (
                    <button
                      type="button"
                      onClick={() => setIsEditingOrgRequest(!isEditingOrgRequest)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      {isEditingOrgRequest ? "View Submitted Details" : "Edit / Re-submit Request"}
                    </button>
                  )}
                  {orgStatus === "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => setIsEditingOrgRequest(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      Re-submit Details
                    </button>
                  )}
                </div>
              </div>

              {/* Status Section 1: APPROVED */}
              {(orgStatus === "APPROVED" || orgStatusData?.hasCompany) && (
                <div className="space-y-6">
                  {/* Verified Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
                          🛡️
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-xl font-bold text-white tracking-tight">
                              {orgStatusData?.company?.name || profile.companyName || "Your Company"}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-bold">
                              ✓ Officially Verified
                            </span>
                          </div>
                          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                            Approved by the Super Admin. Your company has verified enterprise tenant status with isolated workspace data, trusted candidate visibility, and unrestricted recruitment capabilities.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold text-emerald-200">
                          Tenant Status: Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Company Verified Details */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Verified Organization Credentials</h4>
                        <p className="text-xs text-slate-500">Official attributes registered in the Super Admin system</p>
                      </div>
                      <Link
                        to="/employer/profile"
                        className="text-xs font-bold text-[#b45309] hover:underline"
                      >
                        Edit Public Profile →
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Company Legal Name</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">
                          {orgStatusData?.company?.name || profile.companyName || "N/A"}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Corporate Official Email</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">
                          {orgStatusData?.company?.officialEmail || profile.officialEmail || user?.email || "N/A"}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Company Website</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">
                          {orgStatusData?.company?.website || profile.website ? (
                            <a
                              href={orgStatusData?.company?.website || profile.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {orgStatusData?.company?.website || profile.website}
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Industry</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">
                          {orgStatusData?.company?.industry || profile.industry || "Information Technology"}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Headquarters</p>
                        <p className="text-sm font-bold text-slate-800 mt-1">
                          {orgStatusData?.company?.location || profile.headquarters?.city || "Gurugram, India"}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tenant Scope</p>
                        <p className="text-sm font-bold text-emerald-700 mt-1">
                          Multi-Tenant Enterprise (Full RBAC)
                        </p>
                      </div>
                    </div>

                    {/* Platform Entitlements */}
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Verified Platform Privileges</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { title: "Verified Employer Badge", desc: "Visible across all talent listings" },
                          { title: "Isolated Data Vault", desc: "Exclusive candidates, notes & ATS data" },
                          { title: "Priority Job Indexing", desc: "Ranked high in candidate search results" },
                          { title: "Direct Interview Scheduler", desc: "Automated video & in-person invites" },
                        ].map((priv, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
                            <span className="text-emerald-600 font-bold text-sm">✓</span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{priv.title}</p>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">{priv.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Section 2: PENDING / UNDER_REVIEW (when not editing) */}
              {(orgStatus === "PENDING" || orgStatus === "UNDER_REVIEW") && !isEditingOrgRequest && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-slate-900 text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shrink-0">
                          ⏳
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-xl font-bold text-white tracking-tight">
                              Verification Request Under Review
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-bold">
                              {orgStatus === "UNDER_REVIEW" ? "Under Active Review" : "Queued in Super Admin"}
                            </span>
                          </div>
                          <p className="text-xs text-amber-100/80 mt-1 max-w-xl">
                            Your organization approval request was received and forwarded to the CareerConnect Super Admin team for compliance verification and enterprise tenant provisioning.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingOrgRequest(true)}
                        className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-xs hover:bg-amber-50 transition cursor-pointer shrink-0"
                      >
                        Modify Application Details
                      </button>
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-6">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Verification Lifecycle Progress
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                          <span>✓</span> Step 1: Request Submitted
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Company data submitted on{" "}
                          {orgStatusData?.organizationRequest?.createdAt
                            ? new Date(orgStatusData.organizationRequest.createdAt).toLocaleDateString()
                            : "Recently"}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 animate-pulse">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                          Step 2: Super Admin Verification
                        </div>
                        <p className="text-[11px] text-amber-900">
                          {orgStatus === "UNDER_REVIEW"
                            ? "Super Admin is actively auditing official email and business registration."
                            : "In the pending review queue. Super Admin audits requests within 24 hours."}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-1">
                          <span>○</span> Step 3: Tenant Provisioned
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Upon approval, your company is issued multi-tenant workspace credentials automatically.
                        </p>
                      </div>
                    </div>

                    {/* Submitted Info Review - 9 Clean Fields */}
                    <div className="border-t border-slate-100 pt-5">
                      <h5 className="text-xs font-bold text-slate-700 mb-3">Submitted Connection Details (9 Fields)</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">1. Company Name</span>
                          <span className="font-semibold text-slate-800">
                            {orgStatusData?.organizationRequest?.companyName || orgStatusData?.organizationRequest?.organizationName || orgForm.companyName}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">2. Official Company Email</span>
                          <span className="font-semibold text-slate-800 font-mono text-[11px]">
                            {orgStatusData?.organizationRequest?.officialCompanyEmail || orgStatusData?.organizationRequest?.officialEmail || orgForm.officialCompanyEmail}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">3. Company Website</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {orgStatusData?.organizationRequest?.companyWebsite || orgStatusData?.organizationRequest?.website || orgForm.companyWebsite || "N/A"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">4. Industry</span>
                          <span className="font-semibold text-slate-800">
                            {orgStatusData?.organizationRequest?.industry || orgForm.industry}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">5. Company Size</span>
                          <span className="font-semibold text-slate-800">
                            {orgStatusData?.organizationRequest?.companySize || orgForm.companySize}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">6. Verification Document</span>
                          {orgStatusData?.organizationRequest?.verificationDocument ? (
                            <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                              <span>📄</span> Document Attached
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Provided</span>
                          )}
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">7. Requesting Employee</span>
                          <span className="font-semibold text-slate-800">
                            {orgStatusData?.organizationRequest?.requestingEmployeeName || orgStatusData?.organizationRequest?.contactPerson || orgForm.requestingEmployeeName}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">8. Employee Designation</span>
                          <span className="font-semibold text-slate-800">
                            {orgStatusData?.organizationRequest?.employeeDesignation || orgStatusData?.organizationRequest?.designation || orgForm.employeeDesignation}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">9. Official Employee Email</span>
                          <span className="font-semibold text-slate-800 font-mono text-[11px]">
                            {orgStatusData?.organizationRequest?.officialEmployeeEmail || orgForm.officialEmployeeEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Section 3: REJECTED (when not editing) */}
              {orgStatus === "REJECTED" && !isEditingOrgRequest && (
                <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-2xs space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-2xl shrink-0">
                      ⚠️
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          Verification Request Declined by Super Admin
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          REJECTED
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        The Super Admin reviewed your company verification request and flagged issues that require clarification or corrected corporate credentials.
                      </p>

                      {orgStatusData?.organizationRequest?.rejectionReason && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                          <span className="font-bold block mb-0.5">Super Admin Rejection Reason:</span>
                          "{orgStatusData.organizationRequest.rejectionReason}"
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingOrgRequest(true)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          Revise and Re-submit Request
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Section 4: MINIMAL 9-FIELD CONNECTION FORM (If NOT_REQUESTED or isEditingOrgRequest) */}
              {(orgStatus === "NOT_REQUESTED" || isEditingOrgRequest) && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-6">
                  {/* Form Header */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {isEditingOrgRequest ? "Update Company Connection Details" : "Connect Company with CareerConnect"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submit your organization credentials below. Super Admin will verify and activate your enterprise connection.
                      </p>
                    </div>
                    {isEditingOrgRequest && (
                      <button
                        type="button"
                        onClick={() => setIsEditingOrgRequest(false)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleRequestCompanyApproval} className="space-y-6">
                    {/* SECTION 1: COMPANY DETAILS */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">1</span>
                        Company Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. Company Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            1. Company Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Acme Technologies Pvt Ltd"
                            value={orgForm.companyName}
                            onChange={(e) => setOrgForm({ ...orgForm, companyName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>

                        {/* 2. Official Company Email */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            2. Official Company Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. contact@acme.com"
                            value={orgForm.officialCompanyEmail}
                            onChange={(e) => setOrgForm({ ...orgForm, officialCompanyEmail: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>

                        {/* 3. Company Website */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            3. Company Website <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://www.acme.com"
                            value={orgForm.companyWebsite}
                            onChange={(e) => setOrgForm({ ...orgForm, companyWebsite: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>

                        {/* 4. Industry */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            4. Industry <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={orgForm.industry}
                            onChange={(e) => setOrgForm({ ...orgForm, industry: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition bg-white"
                          >
                            <option value="Information Technology">Information Technology &amp; Software</option>
                            <option value="Financial Services">Financial Services &amp; Banking</option>
                            <option value="Healthcare">Healthcare &amp; Life Sciences</option>
                            <option value="E-Commerce & Retail">E-Commerce &amp; Retail</option>
                            <option value="Manufacturing & Engineering">Manufacturing &amp; Engineering</option>
                            <option value="Education & EdTech">Education &amp; EdTech</option>
                            <option value="Consulting & Services">Consulting &amp; Professional Services</option>
                            <option value="Telecommunications">Telecommunications</option>
                            <option value="Media & Entertainment">Media &amp; Entertainment</option>
                            <option value="Other">Other Industry</option>
                          </select>
                        </div>

                        {/* 5. Company Size */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            5. Company Size <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={orgForm.companySize}
                            onChange={(e) => setOrgForm({ ...orgForm, companySize: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition bg-white"
                          >
                            <option value="1-10">1-10 Employees (Seed / Early Stage)</option>
                            <option value="11-50">11-50 Employees (Small Business)</option>
                            <option value="51-200">51-200 Employees (Growth Scale)</option>
                            <option value="201-500">201-500 Employees (Mid-Market)</option>
                            <option value="500+">500+ Employees (Large Enterprise)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: VERIFICATION DOCUMENT */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">2</span>
                        Company Registration &amp; Verification Document
                      </h4>
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-700">
                          6. Company Registration / Verification Document <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Upload your Certificate of Incorporation, GST Registration, CIN document, or provide an official verification document link.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          {/* File Upload Button */}
                          <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                            <input
                              type="file"
                              id="verificationDocFile"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={handleDocUpload}
                              className="hidden"
                            />
                            <label
                              htmlFor="verificationDocFile"
                              className="cursor-pointer flex flex-col items-center gap-1.5"
                            >
                              <span className="text-xl">📎</span>
                              <span className="text-xs font-bold text-amber-700 hover:underline">
                                {orgForm.verificationDocumentName || "Choose Document File (PDF/Image)"}
                              </span>
                              <span className="text-[10px] text-slate-400">Max size 10MB</span>
                            </label>
                          </div>

                          {/* Or Document URL Input */}
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Or Provide Document URL
                            </span>
                            <input
                              type="url"
                              placeholder="https://drive.google.com/... or https://acme.com/doc.pdf"
                              value={orgForm.verificationDocument?.startsWith("data:") ? "" : orgForm.verificationDocument}
                              onChange={(e) => setOrgForm({ ...orgForm, verificationDocument: e.target.value, verificationDocumentName: "URL Linked" })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                            />
                          </div>
                        </div>

                        {orgForm.verificationDocument && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <span>✓</span> Verification Document Ready: {orgForm.verificationDocumentName || "Document Attached"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setOrgForm({ ...orgForm, verificationDocument: "", verificationDocumentName: "" })}
                              className="text-rose-600 hover:underline font-bold text-[11px]"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 3: REQUESTING EMPLOYEE CREDENTIALS */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">3</span>
                        Requesting Employee Credentials
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* 7. Requesting Employee Name */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            7. Requesting Employee Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={orgForm.requestingEmployeeName}
                            onChange={(e) => setOrgForm({ ...orgForm, requestingEmployeeName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>

                        {/* 8. Employee Designation */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            8. Employee Designation <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Lead Talent Acquisition"
                            value={orgForm.employeeDesignation}
                            onChange={(e) => setOrgForm({ ...orgForm, employeeDesignation: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>

                        {/* 9. Official Employee Email */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            9. Official Employee Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. recruiter@acme.com"
                            value={orgForm.officialEmployeeEmail}
                            onChange={(e) => setOrgForm({ ...orgForm, officialEmployeeEmail: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <span>🔒</span>
                        <span>Secure transmission directly to Super Admin Approval Queue</span>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {isEditingOrgRequest && (
                          <button
                            type="button"
                            onClick={() => setIsEditingOrgRequest(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer w-full sm:w-auto"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isOrgSubmitting}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#92400e] to-[#b45309] hover:from-[#78350f] hover:to-[#92400e] text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
                        >
                          {isOrgSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Submitting Connection Request...</span>
                            </>
                          ) : (
                            <>
                              <span>Connect Company with CareerConnect</span>
                              <span>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 10: EMPLOYEE DIRECTORY & TEAMS                       */}
          {/* ======================================================== */}
          {activeTab === "employees" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Staff Directory</h2>
                  <p className="text-xs text-slate-500">Manage internal employees, departments and teams</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
                >
                  + Add Employee
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employees.map((emp) => (
                  <div key={emp._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {emp.fullName?.[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{emp.fullName}</h4>
                        <p className="text-[11px] text-[#b45309] font-semibold">{emp.designation} · {emp.department}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{emp.email}</p>
                        {emp.skills?.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {emp.skills.map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp._id)}
                      className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                      title="Remove Employee"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 11: ASSIGN TRAINING                                  */}
          {/* ======================================================== */}
          {activeTab === "training" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Assigned Employee Training</h2>
                  <p className="text-xs text-slate-500">Deploy LMS courses to departments and track compliance</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignTrainingModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                >
                  + Assign Course
                </button>
              </div>

              <div className="space-y-3">
                {trainingAssignments.map((t) => (
                  <div key={t._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{t.courseId?.title || "Assigned LMS Course"}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assigned to: <span className="font-semibold text-slate-800">{t.employeeId?.fullName || t.departmentName || "Team"}</span> · Deadline: {t.deadline ? new Date(t.deadline).toLocaleDateString() : "30 Days"}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      t.status === "Completed" ? "bg-green-100 text-green-800" : "bg-blue-50 text-blue-700"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 12: SKILL GAP ANALYSIS                               */}
          {/* ======================================================== */}
          {activeTab === "skill-gaps" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Skill Gap Analysis</h2>
                <p className="text-xs text-slate-500">Department benchmarks vs current employee competencies</p>
              </div>

              <SkillGapMatrix
                skillGaps={skillGaps}
                on1ClickAssign={handle1ClickAssignGap}
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 13: HIRING & TRAINING ANALYTICS                      */}
          {/* ======================================================== */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hiring & Learning Analytics</h2>
                <p className="text-xs text-slate-500">Aggregate telemetry on hiring speed and employee learning hours</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HiringAnalyticsChart hiring={analyticsData?.hiring} />
                <LearningAnalyticsChart learning={analyticsData?.learning} />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 14: TEAM ROLES & SETTINGS                            */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team Roles & Permission Settings</h2>
                <p className="text-xs text-slate-500">Granular permissions for recruiters, hiring managers and trainers</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Authorized Team Roles</h3>
                <div className="space-y-3">
                  {[
                    { role: "Employer Admin", access: "Full system access to jobs, candidates, training & billing" },
                    { role: "Technical Recruiter", access: "Post jobs, screen applications & candidate talent pool" },
                    { role: "Hiring Manager", access: "Review shortlisted candidates & submit interview scorecards" },
                    { role: "Learning & Development Manager", access: "Assign courses, analyze skill gaps & view learning telemetry" },
                  ].map((r, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{r.role}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{r.access}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSave={handleSaveJob}
        jobToEdit={jobToEdit}
      />

      <InterviewScheduleModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        onSchedule={handleScheduleInterview}
        candidate={interviewCandidate}
        jobs={jobs}
      />

      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onCreateOffer={handleCreateOffer}
        application={offerApplication}
        jobs={jobs}
      />

      <AssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        onCreateAssessment={handleCreateAssessment}
        jobs={jobs}
      />

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onAdd={handleAddEmployee}
        departments={departments}
      />

      <AssignTrainingModal
        isOpen={isAssignTrainingModalOpen}
        onClose={() => setIsAssignTrainingModalOpen(false)}
        onAssign={handleAssignTraining}
        courses={courseCatalog}
        employees={employees}
        preselectedCourse={preselectedCourseForTraining}
      />
    </div>
  );
};

export default EmployerDashboard;
