import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getEmployerDashboard } from "../../../services/employerService";

import KpiRow from "./KpiRow";
import PipelineStrip from "./PipelineStrip";
import QuickActions from "./QuickActions";
import UpcomingInterviews from "./UpcomingInterviews";
import RecentApplications from "./RecentApplications";
import ActiveJobs from "./ActiveJobs";

const STALE_TIME_MS = 30000; // 30 seconds staleTime per Section 5

const DashboardPage = ({
  data = null,
  onPostJob,
  onPostInternship,
  onViewApplications,
  onScheduleInterview,
  onViewPipeline,
  onCandidateClick,
  onJobClick,
  onViewAllJobs,
  onNavigate,
  onRescheduleInterview,
  onCancelInterview,
}) => {
  const { user } = useSelector((state) => state.auth);

  const [dashboardData, setDashboardData] = useState(data);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const lastFetchTimeRef = useRef(0);

  const fetchDashboard = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && lastFetchTimeRef.current && now - lastFetchTimeRef.current < STALE_TIME_MS) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getEmployerDashboard();
      if (res && (res.success || res.kpis)) {
        setDashboardData(res);
        lastFetchTimeRef.current = Date.now();
      } else {
        throw new Error(res?.message || "Failed to load employer dashboard");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (data && (data.success || data.kpis)) {
      setDashboardData(data);
      setLoading(false);
      lastFetchTimeRef.current = Date.now();
    } else {
      fetchDashboard();
    }
  }, [data, fetchDashboard]);

  // Greeting dynamic calculation based on real Date() and auth user
  const getGreeting = () => {
    const hour = new Date().getHours();
    const displayName = user?.fullName || user?.firstName || "Employer";
    if (hour < 12) return `Good morning, ${displayName}`;
    if (hour < 17) return `Good afternoon, ${displayName}`;
    return `Good evening, ${displayName}`;
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Page-level error state with Retry
  if (error && !dashboardData) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 shadow-xs text-center max-w-md mx-auto my-12 space-y-3.5">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Dashboard Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white transition shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};
  const pipeline = dashboardData?.pipeline || [];
  const upcomingInterviews = dashboardData?.upcomingInterviews || [];
  const recentApplications = dashboardData?.recentApplications || [];
  const activeJobs = dashboardData?.activeJobs || [];
  const activity = dashboardData?.activity || [];

  return (
    <div className="space-y-6 animate-fade-in" role="main" aria-label="Employer Hub Dashboard">
      {/* Page Header: Dynamic Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs font-semibold text-slate-500">{formattedDate}</p>
        </div>

        <QuickActions
          onPostJob={onPostJob}
          onPostInternship={onPostInternship}
          onViewApplications={onViewApplications}
          onScheduleInterview={onScheduleInterview}
          onViewPipeline={onViewPipeline}
        />
      </div>

      {/* KPI Row (5 KPI cards) */}
      <KpiRow kpis={kpis} loading={loading} onNavigate={onNavigate} />

      {/* Main 2-Column Responsive Layout */}
      {/* ≥1100px: 2 columns (~60% left, ~40% right); 780-1100px: 1 column; <780px: responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Approx 60%: 7 cols out of 12) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ATS Pipeline Strip */}
          <PipelineStrip
            pipeline={pipeline}
            loading={loading}
            onStageClick={(stage) =>
              stage === "all" ? onViewPipeline?.() : onNavigate?.(`/ats?stage=${stage}`)
            }
          />

          {/* Recent Applications */}
          <RecentApplications
            applications={recentApplications}
            loading={loading}
            onCandidateClick={onCandidateClick}
            onJobClick={onJobClick}
            onViewAll={onViewApplications}
          />
        </div>

        {/* Right Column (Approx 40%: 5 cols out of 12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Interviews */}
          <UpcomingInterviews
            interviews={upcomingInterviews}
            loading={loading}
            onReschedule={onRescheduleInterview}
            onCancel={onCancelInterview}
          />

          {/* Active Job Openings */}
          <ActiveJobs
            jobs={activeJobs}
            loading={loading}
            onPostJob={onPostJob}
            onViewJob={onJobClick}
            onViewJobApplications={(jobId) => onNavigate?.(`/jobs/${jobId}/applications`)}
            onViewAllJobs={onViewAllJobs}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
