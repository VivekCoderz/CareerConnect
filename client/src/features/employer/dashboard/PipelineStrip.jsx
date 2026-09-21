import React from "react";
import { ChevronRight } from "lucide-react";
import { STAGE_BADGE_STYLES, STAGE_DISPLAY_NAMES } from "./constants";

const PipelineStrip = ({ pipeline = [], loading = false, onStageClick }) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs animate-pulse space-y-3">
        <div className="w-32 h-4 bg-slate-100 rounded" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 min-w-[120px] h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate total count across pipeline
  const totalInPipeline = pipeline.reduce((sum, item) => sum + (item.count || 0), 0);

  // If total is 0, do not render a 0-count funnel (per section 6 requirement)
  if (totalInPipeline === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs text-center py-6">
        <p className="text-xs font-semibold text-slate-700">No applications in pipeline yet</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Stages will activate as candidates apply and move through your ATS pipeline.
        </p>
      </div>
    );
  }

  const stages = [
    { key: "applied", label: STAGE_DISPLAY_NAMES.applied },
    { key: "shortlisted", label: STAGE_DISPLAY_NAMES.shortlisted },
    { key: "assessment", label: STAGE_DISPLAY_NAMES.assessment },
    { key: "interview", label: STAGE_DISPLAY_NAMES.interview },
    { key: "offer", label: STAGE_DISPLAY_NAMES.offer },
    { key: "hired", label: STAGE_DISPLAY_NAMES.hired },
  ];

  const getStageCount = (stageKey) => {
    const item = pipeline.find((p) => p.stage?.toLowerCase() === stageKey);
    return item?.count ?? 0;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">ATS Recruitment Pipeline</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {totalInPipeline} active
          </span>
        </div>
        <button
          type="button"
          onClick={() => onStageClick && onStageClick("all")}
          className="text-xs font-bold text-[#b45309] hover:text-[#92400e] transition flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full ATS</span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Horizontal scrolling chevron pipeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {stages.map((stage, idx) => {
          const count = getStageCount(stage.key);
          const badgeStyle = STAGE_BADGE_STYLES[stage.key] || "bg-slate-50 text-slate-700 border-slate-200";

          return (
            <button
              key={stage.key}
              id={`pipeline-stage-${stage.key}`}
              type="button"
              onClick={() => onStageClick && onStageClick(stage.key)}
              className={`flex-1 min-w-[130px] p-3 rounded-xl border text-left transition group hover:border-amber-300 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer ${
                count > 0 ? "bg-white border-slate-200/90" : "bg-slate-50/60 border-slate-200/50 opacity-75"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span className="group-hover:text-slate-900 transition">{stage.label}</span>
                <span className="text-[10px] font-semibold text-slate-400">0{idx + 1}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {count}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeStyle}`}>
                  {count > 0 ? `${Math.round((count / totalInPipeline) * 100)}%` : "0%"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStrip;
