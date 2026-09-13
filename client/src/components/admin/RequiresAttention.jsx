import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Briefcase,
  GraduationCap,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const RequiresAttention = ({ attention = [] }) => {
  const attentionList = Array.isArray(attention)
    ? attention
    : typeof attention === "object" && attention !== null
    ? Object.entries(attention).map(([key, val], idx) => ({
        id: `att-${idx}`,
        title: `${key}: ${val}`,
        category: "System",
        severity: "medium",
        link: "/admin/reports",
      }))
    : [];

  const getIcon = (category) => {
    switch (category) {
      case "Jobs":
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case "Internships":
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case "Employers":
        return <Building2 className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            Action Required
          </span>
        );
      case "medium":
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Requires Attention</h3>
          {attentionList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {attentionList.length} Item{attentionList.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">High priority administrative queue</p>
      </div>

      {/* Items list or Clean empty state */}
      {attentionList.length === 0 ? (
        <div className="p-8 rounded-xl bg-emerald-50/50 border border-emerald-200/60 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">Everything is up to date</h4>
            <p className="text-xs text-emerald-700/80 mt-0.5">
              No jobs, internships, or employer registrations are pending administrative review.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {attentionList.map((item) => (
            <Link
              key={item.id}
              to={item.link || "#"}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 hover:border-slate-300 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {getIcon(item.category)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400">{item.category} Queue</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getSeverityBadge(item.severity)}
                <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  {item.actionText || "Review"}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequiresAttention;
