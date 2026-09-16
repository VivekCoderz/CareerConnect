import React from "react";
import { CheckCircle2, XCircle, ArrowRight, UserCheck, Clock, FileCheck } from "lucide-react";

const ApplicationFunnel = ({ applicationFunnel = {} }) => {
  const applied = applicationFunnel.applied || 0;
  const underReview = applicationFunnel.underReview || 0;
  const shortlisted = applicationFunnel.shortlisted || 0;
  const interview = applicationFunnel.interview || 0;
  const selected = applicationFunnel.selected || 0;
  const rejected = applicationFunnel.rejected || 0;
  const withdrawn = applicationFunnel.withdrawn || 0;

  const totalActivePipeline = applied + underReview + shortlisted + interview + selected;
  const totalAllApplications = totalActivePipeline + rejected + withdrawn;

  const stages = [
    {
      id: "applied",
      label: "Applied",
      count: applied,
      color: "from-blue-500 to-indigo-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      description: "Received submissions",
    },
    {
      id: "underReview",
      label: "Under Review",
      count: underReview,
      color: "from-indigo-500 to-violet-500",
      textColor: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      description: "Screening profiles",
    },
    {
      id: "shortlisted",
      label: "Shortlisted",
      count: shortlisted,
      color: "from-violet-500 to-purple-500",
      textColor: "text-violet-700",
      bgColor: "bg-violet-50 border-violet-200",
      description: "Qualified candidates",
    },
    {
      id: "interview",
      label: "Interview",
      count: interview,
      color: "from-purple-500 to-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-200",
      description: "Scheduled evaluations",
    },
    {
      id: "selected",
      label: "Selected / Hired",
      count: selected,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50 border-emerald-200",
      description: "Offers & placements",
    },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Application Funnel & Lifecycle</h3>
          <p className="text-xs text-slate-400">
            Real candidate progression from submission to final placement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-lg">
            {totalAllApplications.toLocaleString()} Total Applications
          </span>
        </div>
      </div>

      {/* Funnel Stage Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stages.map((stage, idx) => {
          const percentageOfTotal =
            totalAllApplications > 0
              ? Math.round((stage.count / totalAllApplications) * 100)
              : 0;

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border ${stage.bgColor} flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${stage.textColor}`}>{stage.label}</span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Step {idx + 1}
                </span>
              </div>

              <div>
                <span className="text-xl font-extrabold text-slate-900">
                  {stage.count.toLocaleString()}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">{stage.description}</p>
              </div>

              {/* Mini progress indicator */}
              <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500">
                <span>Share of volume</span>
                <span className="font-bold text-slate-700">{percentageOfTotal}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcomes Bar / Breakdown */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600 font-medium">Selected / Offers:</span>
            <span className="font-bold text-slate-900">{selected.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span className="text-slate-600 font-medium">Rejected:</span>
            <span className="font-bold text-slate-900">{rejected.toLocaleString()}</span>
          </div>

          {withdrawn > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-medium">Withdrawn:</span>
              <span className="font-bold text-slate-900">{withdrawn.toLocaleString()}</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Source of truth: CareerConnect MongoDB <code className="text-slate-600">Application</code> collection
        </p>
      </div>
    </div>
  );
};

export default ApplicationFunnel;
