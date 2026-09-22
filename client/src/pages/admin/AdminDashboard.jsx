import JourneyLoader from "../../components/common/JourneyLoader";
import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminKPICards from "../../components/admin/AdminKPICard";
import UserGrowthChart from "../../components/admin/UserGrowthChart";
import OpportunityOverview from "../../components/admin/OpportunityOverview";
import ApplicationFunnel from "../../components/admin/ApplicationFunnel";
import RequiresAttention from "../../components/admin/RequiresAttention";
import RecentActivity from "../../components/admin/RecentActivity";
import { getAdminDashboard } from "../../services/adminService";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");

  const loadDashboard = useCallback(async (range = timeRange, isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await getAdminDashboard(range);
      if (res?.success) {
        setData(res.data);
      } else {
        setError(res?.message || "Failed to retrieve dashboard metrics.");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data. Please verify network and administrative access."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboard(timeRange, false);
  }, [timeRange]);

  const handleRangeChange = (newRange) => {
    setTimeRange(newRange);
  };

  const handleManualRefresh = () => {
    loadDashboard(timeRange, true);
  };

  return (
    <AdminLayout onRefresh={handleManualRefresh} isRefreshing={refreshing}>
      {/* Loading State */}
      {loading && !data && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <JourneyLoader variant="admin" size="hero" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">Loading CareerConnect Admin...</p>
            <p className="text-xs text-slate-400 mt-1">Aggregating platform database metrics</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load dashboard data</h3>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard(timeRange, false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Main Dashboard Content */}
      {data && (
        <div className="space-y-6">
          {/* Welcome Banner / Overview Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Platform Overview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time operational intelligence across students, employers, opportunities, and applications.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry
              </span>
            </div>
          </div>

          {/* 1. 6 Summary KPI Cards */}
          <div id="overview">
            <AdminKPICards
              overview={data.overview}
              users={data.users}
              opportunities={data.opportunities}
              applicationFunnel={data.applicationFunnel}
            />
          </div>

          {/* 2. Main Analytics: User Growth & Opportunity Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div id="users" className="lg:col-span-2 scroll-mt-20">
              <UserGrowthChart
                data={data.userGrowth}
                currentRange={timeRange}
                onRangeChange={handleRangeChange}
                usersBreakdown={data.users}
              />
            </div>
            <div id="employers" className="lg:col-span-1 scroll-mt-20">
              <OpportunityOverview opportunities={data.opportunities} />
            </div>
          </div>

          {/* 3. Application Funnel */}
          <div id="applications" className="scroll-mt-20">
            <ApplicationFunnel applicationFunnel={data.applicationFunnel} />
          </div>

          {/* 4. Requires Attention & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="reports" className="scroll-mt-20">
              <RequiresAttention attention={data.attention} />
            </div>
            <div id="interviews" className="scroll-mt-20">
              <RecentActivity activities={data.recentActivity} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
