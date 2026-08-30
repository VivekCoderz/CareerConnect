import React from "react";

const LearningAnalyticsChart = ({ learning = {} }) => {
  const skills = learning.topSkillsTrained || [
    { skill: "React & Next.js", learnersCount: 8, progress: 84 },
    { skill: "Node.js & Express", learnersCount: 6, progress: 76 },
    { skill: "Data Analytics & SQL", learnersCount: 5, progress: 92 },
    { skill: "UI/UX Design Systems", learnersCount: 4, progress: 68 },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Employee Training & Skill Growth</h3>
          <p className="text-xs text-slate-500">LMS course progression and competencies</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-emerald-600">{learning.completionRate || 82}%</span>
          <p className="text-[10px] text-slate-400">Course Completion Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <p className="text-xl font-bold text-slate-900">{learning.totalEmployees || 18}</p>
          <p className="text-[10.5px] font-semibold text-slate-500">Total Staff</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <p className="text-xl font-bold text-[#b45309]">{learning.activeLearners || 12}</p>
          <p className="text-[10.5px] font-semibold text-slate-500">Active Learners</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <p className="text-xl font-bold text-blue-600">{learning.totalLearningHours || 148} hrs</p>
          <p className="text-[10.5px] font-semibold text-slate-500">Training Hours</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-center">
          <p className="text-xl font-bold text-purple-600">{learning.certificatesEarned || 8}</p>
          <p className="text-[10.5px] font-semibold text-slate-500">Certs Earned</p>
        </div>
      </div>

      {/* Top Skill Progress Bars */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Top Skill Benchmarks</h4>
        {skills.map((s, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">{s.skill}</span>
              <span className="text-slate-900">
                {s.progress}% <span className="text-slate-400 font-normal">({s.learnersCount} Learners)</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                style={{ width: `${s.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningAnalyticsChart;
