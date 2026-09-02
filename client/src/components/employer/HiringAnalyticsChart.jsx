import React from "react";

const HiringAnalyticsChart = ({ hiring = {} }) => {
  const funnel = hiring.funnel || [
    { stage: "Applied", count: 148, percentage: 100 },
    { stage: "Screened", count: 110, percentage: 75 },
    { stage: "Shortlisted", count: 26, percentage: 18 },
    { stage: "Interviewed", count: 12, percentage: 8 },
    { stage: "Offered", count: 6, percentage: 4 },
    { stage: "Hired", count: 4, percentage: 3 },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Recruitment Funnel & Conversions</h3>
          <p className="text-xs text-slate-500">Applicant progression from application to hire</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-900">{hiring.averageTimeToHireDays || 18} Days</span>
          <p className="text-[10px] text-slate-400">Avg. Time to Hire</p>
        </div>
      </div>

      {/* Visual Conversion Funnel Bars */}
      <div className="space-y-3">
        {funnel.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">{item.stage}</span>
              <span className="text-slate-900">
                {item.count} Candidates <span className="text-slate-400 font-normal">({item.percentage}%)</span>
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-[#92400e] rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HiringAnalyticsChart;
