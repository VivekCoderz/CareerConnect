import React from "react";
import { Briefcase, Users, Calendar, Award, UserCheck } from "lucide-react";

const KpiRow = ({ kpis = {}, loading = false, onNavigate }) => {
  if (loading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
        aria-label="Loading key performance indicators"
      >
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
              <div className="w-12 h-4 rounded-full bg-slate-100" />
            </div>
            <div className="space-y-1.5">
              <div className="w-12 h-7 rounded bg-slate-100" />
              <div className="w-20 h-3 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      id: "kpi-active-jobs",
      label: "Active Jobs",
      count: kpis.activeJobs ?? 0,
      icon: Briefcase,
      accentColor: "text-amber-600 bg-amber-50 border-amber-200/80",
      path: "/jobs?status=active",
      trendLabel: null,
    },
    {
      id: "kpi-new-applications",
      label: "New Applications",
      count: kpis.newApplications ?? 0,
      icon: Users,
      accentColor: "text-blue-600 bg-blue-50 border-blue-200/80",
      path: "/ats?status=applied",
      trendLabel:
        typeof kpis.newToday === "number" && kpis.newToday > 0
          ? `${kpis.newToday} today`
          : typeof kpis.applicationsThisWeek === "number" && kpis.applicationsThisWeek > 0
          ? `${kpis.applicationsThisWeek} this wk`
          : null,
      trendType: "positive",
    },
    {
      id: "kpi-upcoming-interviews",
      label: "Upcoming Interviews",
      count: kpis.upcomingInterviews ?? 0,
      icon: Calendar,
      accentColor: "text-indigo-600 bg-indigo-50 border-indigo-200/80",
      path: "/interviews",
      trendLabel:
        typeof kpis.interviewsToday === "number" && kpis.interviewsToday > 0
          ? `${kpis.interviewsToday} today`
          : null,
      trendType: "neutral",
    },
    {
      id: "kpi-offers-pending",
      label: "Offers Pending",
      count: kpis.offersPending ?? 0,
      icon: Award,
      accentColor: "text-teal-600 bg-teal-50 border-teal-200/80",
      path: "/offers?status=pending",
      trendLabel: null,
    },
    {
      id: "kpi-team-members",
      label: "Team Members",
      count: kpis.teamMembers ?? 0,
      icon: UserCheck,
      accentColor: "text-slate-600 bg-slate-100 border-slate-200",
      path: "/team",
      trendLabel: null,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
      role="region"
      aria-label="Key Performance Indicators"
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            id={item.id}
            type="button"
            onClick={() => onNavigate && onNavigate(item.path)}
            className="group text-left bg-white border border-slate-200/80 hover:border-amber-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${item.accentColor}`}
              >
                <IconComponent className="w-4 h-4" aria-hidden="true" />
              </div>
              {item.trendLabel ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {item.trendLabel}
                </span>
              ) : null}
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-slate-900 tracking-tight">
                {item.count}
              </span>
              <span className="block text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition">
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default KpiRow;
