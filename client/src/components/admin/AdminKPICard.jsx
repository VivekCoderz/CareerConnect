import React from "react";
import {
  Users,
  Building2,
  Briefcase,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

const AdminKPICards = ({ overview = {}, users = {}, opportunities = {}, applicationFunnel = {} }) => {
  const cards = [
    {
      title: "Total Users",
      value: overview.totalUsers ?? 0,
      icon: Users,
      color: "blue",
      breakdown: [
        { label: "Students", val: users.students ?? 0 },
        { label: "Freshers", val: users.freshers ?? 0 },
        { label: "Pros", val: users.professionals ?? 0 },
        { label: "Employers", val: users.employers ?? 0 },
      ],
    },
    {
      title: "Active Employers",
      value: overview.activeEmployers ?? 0,
      icon: Building2,
      color: "amber",
      subtext: `${overview.totalEmployers ?? 0} registered total`,
      breakdown: [
        { label: "Verified/Active", val: overview.activeEmployers ?? 0 },
        { label: "Pending", val: Math.max(0, (overview.totalEmployers ?? 0) - (overview.activeEmployers ?? 0)) },
      ],
    },
    {
      title: "Active Opportunities",
      value: overview.activeOpportunities ?? 0,
      icon: Briefcase,
      color: "emerald",
      breakdown: [
        { label: "Jobs", val: opportunities.jobs?.published ?? 0 },
        { label: "Internships", val: opportunities.internships?.published ?? 0 },
      ],
    },
    {
      title: "Total Applications",
      value: overview.totalApplications ?? 0,
      icon: FileSpreadsheet,
      color: "indigo",
      breakdown: [
        { label: "Job Apps", val: applicationFunnel.byType?.jobs ?? 0 },
        { label: "Internship Apps", val: applicationFunnel.byType?.internships ?? 0 },
      ],
    },
    {
      title: "Upcoming Interviews",
      value: overview.upcomingInterviews ?? 0,
      icon: Calendar,
      color: "purple",
      subtext: "Scheduled & active rounds",
      breakdown: [
        { label: "Completed", val: overview.completedInterviews ?? 0 },
        { label: "Cancelled", val: overview.cancelledInterviews ?? 0 },
      ],
    },
    {
      title: "Pending Reviews",
      value: overview.pendingReviews ?? 0,
      icon: AlertCircle,
      color: "rose",
      isAlert: (overview.pendingReviews ?? 0) > 0,
      subtext: "Requires admin attention",
      breakdown: [
        { label: "Jobs", val: opportunities.jobs?.pendingApproval ?? 0 },
        { label: "Internships", val: opportunities.internships?.pendingApproval ?? 0 },
      ],
    },
  ];

  const colorStyles = {
    blue: {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-600 text-white",
    },
    amber: {
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-600 text-white",
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-600 text-white",
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-600 text-white",
    },
    purple: {
      bg: "bg-purple-50 text-purple-700 border-purple-200",
      iconBg: "bg-purple-600 text-white",
    },
    rose: {
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      iconBg: "bg-rose-600 text-white",
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const color = colorStyles[card.color] || colorStyles.blue;

        return (
          <div
            key={card.title}
            className={`p-4 rounded-2xl bg-white border transition-all ${
              card.isAlert
                ? "border-rose-300 ring-2 ring-rose-500/10 shadow-xs"
                : "border-slate-200/90 shadow-2xs hover:border-slate-300"
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-xl ${color.iconBg} flex items-center justify-center shadow-xs`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Primary Value */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {card.value.toLocaleString()}
              </span>
              {card.isAlert && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                  Action
                </span>
              )}
            </div>

            {/* Breakdown or Subtext */}
            {card.breakdown && card.breakdown.length > 0 ? (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                {card.breakdown.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-[10px] text-slate-600 font-medium"
                  >
                    <span className="text-slate-400">{item.label}:</span>
                    <span className="font-bold text-slate-800">{item.val.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            ) : card.subtext ? (
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">{card.subtext}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default AdminKPICards;
