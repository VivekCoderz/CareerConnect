import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Services
import { getEmployerDashboard } from "../../services/employerService";
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
import OfferModal from "../../components/employer/OfferModal";
import AddEmployeeModal from "../../components/employer/AddEmployeeModal";
import AssignTrainingModal from "../../components/employer/AssignTrainingModal";
import SkillGapMatrix from "../../components/employer/SkillGapMatrix";
import HiringAnalyticsChart from "../../components/employer/HiringAnalyticsChart";
import MyInternships from "./MyInternships";
import PostInternship from "./PostInternship";
import EditInternship from "./EditInternship";
import LearningAnalyticsChart from "../../components/employer/LearningAnalyticsChart";

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

  // Search & Filter States
  const [candidateSearchSkill, setCandidateSearchSkill] = useState("");
  const [candidateUserType, setCandidateUserType] = useState("All");
  const [courseDomainFilter, setCourseDomainFilter] = useState("All");

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

  // Job Actions
  const handleSaveJob = async (jobPayload) => {
    if (jobToEdit) {
      const res = await jobService.updateJob(jobToEdit._id, jobPayload);
      if (res?.success) {
        setJobs((prev) => prev.map((j) => (j._id === jobToEdit._id ? res.job : j)));
        showToast("Job opportunity updated successfully!");
      }
    } else {
      const res = await jobService.createJob(jobPayload);
      if (res?.success) {
        setJobs((prev) => [res.job, ...prev]);
        showToast("New job posted to Geeta University talent portal!");
      }
    }
  };

  const handleToggleJobStatus = async (jobId, newStatus) => {
    const res = await jobService.updateJobStatus(jobId, newStatus);
    if (res?.success) {
      setJobs((prev) => prev.map((j) => (j._id === jobId ? res.job : j)));
      showToast(`Job status changed to ${newStatus}`);
    }
  };

  const handleDuplicateJob = async (jobId) => {
    const res = await jobService.duplicateJob(jobId);
    if (res?.success) {
      setJobs((prev) => [res.job, ...prev]);
      showToast("Job duplicated as draft!");
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;
    const res = await jobService.deleteJob(jobId);
    if (res?.success) {
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
      showToast("Job deleted successfully");
    }
  };

  // ATS Stage Action
  const handleUpdateAppStage = async (appId, newStage) => {
    const res = await recruitmentService.updateApplicationStage(appId, newStage);
    if (res?.success) {
      setApplications((prev) => prev.map((a) => (a._id === appId ? res.application : a)));
      showToast(`Applicant moved to ${newStage}`);
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
    }
  };

  // Job Offer
  const handleCreateOffer = async (offerPayload) => {
    const res = await recruitmentService.createOffer(offerPayload);
    if (res?.success) {
      setOffers((prev) => [res.offer, ...prev]);
      showToast("Formal offer letter sent to candidate!");
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
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm("Remove employee from organization?")) return;
    const res = await organizationService.deleteEmployee(empId);
    if (res?.success) {
      setEmployees((prev) => prev.filter((e) => e._id !== empId));
      showToast("Employee removed");
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

  const stats = {
    activeJobs: jobs.filter((j) => j.status === "Published").length || 4,
    applications: applications.length || 148,
    shortlisted: applications.filter((a) => a.status === "Shortlisted").length || 26,
    interviews: interviews.length || 8,
    employees: employees.length || 18,
    coursesCount: courseCatalog.length || 12,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#f59e0b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">
          Loading Employer Workspace & Learning Hub...
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
            <div className="space-y-6 animate-fade-in">
              {/* Company Branding Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#92400e] via-[#b45309] to-[#78350f] text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#fbbf24]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile.logo ? (
                        <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl font-bold text-[#92400e]">
                          {profile.companyName?.[0] || "GU"}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                          {profile.companyName || "Your Company Name"}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-[#fde68a] border border-white/20">
                          {profile.isPublished ? "✓ Verified Employer" : "📝 Draft Profile"}
                        </span>
                      </div>
                      <p className="text-xs text-amber-100/90 mt-1">
                        {profile.industry || "Information Technology"} ·{" "}
                        {profile.headquarters?.city || "Gurugram, India"} ·{" "}
                        {employees.length || 18} Employees
                      </p>
                    </div>
                  </div>

                  {/* Profile Strength */}
                  <div className="bg-black/25 border border-white/20 rounded-2xl p-4 backdrop-blur-md min-w-[220px]">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-100 mb-1.5">
                      <span>Profile Strength</span>
                      <span className="text-[#fde68a] font-bold text-sm">{completion}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#fde68a] to-[#fbbf24] rounded-full"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <Link
                      to="/employer/profile"
                      className="text-[11px] font-bold text-white hover:text-[#fde68a] flex items-center justify-between"
                    >
                      <span>Complete setup</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* 6 High Level Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div
                  onClick={() => setActiveTab("jobs")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">💼</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.activeJobs}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">Active Jobs</p>
                </div>

                <div
                  onClick={() => setActiveTab("ats")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">📑</span>
                  <p className="text-2xl font-bold text-[#b45309] mt-1">{stats.applications}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">Applications</p>
                </div>

                <div
                  onClick={() => setActiveTab("candidates")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">⚡</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{candidates.length}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">Talent Pool</p>
                </div>

                <div
                  onClick={() => setActiveTab("interviews")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">📅</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.interviews}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">Interviews</p>
                </div>

                <div
                  onClick={() => setActiveTab("learning")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">🎓</span>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{courseCatalog.length}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">LMS Courses</p>
                </div>

                <div
                  onClick={() => setActiveTab("employees")}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs cursor-pointer transition"
                >
                  <span className="text-xl">👥</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stats.employees}</p>
                  <p className="text-[11.5px] font-semibold text-slate-500">Team Staff</p>
                </div>
              </div>

              {/* Active Openings & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Active Job Listings</h3>
                      <p className="text-xs text-slate-400">Open roles visible to Geeta University talent</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("internships");
                          setInternshipView("new");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition inline-flex items-center"
                      >
                        + Post Internship
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJobToEdit(null);
                          setIsJobModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition"
                      >
                        + Post Job
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {jobs.slice(0, 4).map((job) => (
                      <div
                        key={job._id}
                        className="p-4 rounded-2xl border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/20 transition flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-[#92400e] text-[10.5px] font-bold">
                              {job.employmentType}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                              {job.workMode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            📍 {job.location} · {job.department}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">{job.applicantsCount || 0}</span>
                            <p className="text-[10px] text-slate-400">Applicants</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setJobToEdit(job);
                              setIsJobModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                    {jobs.length === 0 && (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl">
                        <p className="text-xs text-slate-500">No jobs posted yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Shortcuts & Upgrades */}
                <div className="space-y-4">
                  <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setJobToEdit(null);
                          setIsJobModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>➕</span> Post Job Listing</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("internships");
                          setInternshipView("new");
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>💼</span> Post Internship</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("internships");
                          setInternshipView("list");
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>📁</span> Manage Internships</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("candidates")}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>🔍</span> Search Talent Pool</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAssignTrainingModalOpen(true)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>🎓</span> Assign LMS Training</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddEmployeeModalOpen(true)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-xs font-semibold text-slate-700 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-2"><span>👥</span> Add Team Employee</span>
                        <span className="text-amber-600 font-bold">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Geeta University Campus Connect Card */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white shadow-xs space-y-2">
                    <span className="text-xl">🏛️</span>
                    <h4 className="text-xs font-bold text-blue-100 uppercase tracking-wide">University Campus Drives</h4>
                    <p className="text-[11.5px] text-blue-200/90 leading-relaxed">
                      Connect directly with Department Placement Cells for campus hackathons and pooled placement drives.
                    </p>
                  </div>
                </div>
              </div>

              {/* Analytics Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HiringAnalyticsChart hiring={analyticsData?.hiring} />
                <LearningAnalyticsChart learning={analyticsData?.learning} />
              </div>
            </div>
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
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Applicant Tracking System (ATS)</h2>
                <p className="text-xs text-slate-500">Manage candidate pipeline, scorecards and review applications</p>
              </div>

              <ATSPipelineView
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
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Geeta University Talent Pool</h2>
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
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interview Scheduling & Scorecards</h2>
                  <p className="text-xs text-slate-500">Upcoming interview slots and feedback evaluations</p>
                </div>
              </div>

              <div className="space-y-3">
                {interviews.map((item) => (
                  <div key={item._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{item.candidateId?.fullName || "Candidate"}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {item.interviewType}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {item.meetingMode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        📅 {item.scheduledDate} at <span className="font-bold">{item.scheduledTime}</span> ({item.durationMinutes} mins)
                      </p>
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs font-bold text-blue-600 hover:underline mt-1"
                        >
                          Join Video Call →
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                        item.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: JOB OFFERS                                        */}
          {/* ======================================================== */}
          {activeTab === "offers" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Offer Letter Management</h2>
                <p className="text-xs text-slate-500">Track dispatched formal offers and candidate acceptance</p>
              </div>

              <div className="space-y-3">
                {offers.map((off) => (
                  <div key={off._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{off.candidateId?.fullName || "Candidate"}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {off.designation}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Compensation: <span className="font-bold text-slate-900">₹{off.salary?.toLocaleString()} {off.salaryPeriod}</span> · Joining: {off.joiningDate ? new Date(off.joiningDate).toLocaleDateString() : "Immediate"}
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      off.status === "Accepted"
                        ? "bg-green-100 text-green-800"
                        : off.status === "Rejected"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}>
                      {off.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: EMPLOYER AS LEARNER (COURSE CATALOG)              */}
          {/* ======================================================== */}
          {activeTab === "learning" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Geeta University Course Catalog</h2>
                  <p className="text-xs text-slate-500">Browse and enroll in industry accredited courses</p>
                </div>
              </div>

              {/* Course Domain Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {["All", "Full Stack Development", "Data Science & AI", "Cloud & DevOps", "Management & HR"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCourseDomainFilter(d)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                      courseDomainFilter === d
                        ? "bg-[#b45309] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {courseCatalog.map((course) => (
                  <div key={course._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-[#92400e] text-[10px] font-bold">
                        {course.domain}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-2">{course.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{course.description}</p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-2">
                        ⏱️ {course.duration} {course.durationUnit} · {course.level}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEnrollCourse(course._id)}
                      className="w-full py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
                    >
                      Enroll in Course →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 9: MY LEARNING & CERTIFICATES                        */}
          {/* ======================================================== */}
          {activeTab === "my-learning" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Active Learning & Certificates</h2>
                <p className="text-xs text-slate-500">Track lesson progress, quizzes and earn verifiable certifications</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(myLearning.enrollments || []).map((enroll) => (
                  <div key={enroll._id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{enroll.courseId?.title || "Master Course"}</h4>
                        <p className="text-xs text-slate-500">{enroll.courseId?.domain}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {enroll.progressPercentage}% Complete
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                        style={{ width: `${enroll.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleUpdateLearningProgress(enroll._id, Math.min(100, (enroll.progressPercentage || 0) + 25))}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                      >
                        + Complete Next Lesson
                      </button>
                      {enroll.progressPercentage >= 100 && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <span>🏆</span> Verified Certificate Issued
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
