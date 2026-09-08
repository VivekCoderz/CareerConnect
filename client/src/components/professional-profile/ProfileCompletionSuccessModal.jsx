import { Link } from "react-router-dom";

const ProfileCompletionSuccessModal = ({
  isOpen,
  onClose,
  profile,
  completion = 92,
  onGoToDashboard,
}) => {
  if (!isOpen) return null;

  const fullName = profile?.userId?.fullName || profile?.fullName || "Leader";
  const professionalIdentity =
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Senior Software Engineer";
  const careerGoal =
    profile?.careerGoal?.targetRole ||
    "Engineering Lead / Staff Engineer";

  // Collect top 3-4 skills
  const topSkills = [];
  const categories = ["programmingLanguages", "frameworks", "databases", "cloud", "management"];
  categories.forEach((cat) => {
    (profile?.skills?.[cat] || []).forEach((s) => {
      if (topSkills.length < 4 && !topSkills.includes(s.name)) {
        topSkills.push(s.name);
      }
    });
  });

  const displaySkills =
    topSkills.length > 0
      ? topSkills.join(" · ")
      : "Java · AWS · System Design · Leadership";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-2xl font-bold mx-auto shadow-sm shadow-purple-600/10">
          ✨
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Your Professional Profile is Ready
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Your executive credentials have been updated and synchronized with your dashboard and recruiter matching engine.
          </p>
        </div>

        {/* Compact Summary Card */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3.5">
          {/* Profile Strength */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Profile Strength
            </span>
            <span className="text-sm font-extrabold text-purple-900 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-200">
              {completion}%
            </span>
          </div>

          {/* Professional Identity */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Professional Identity</span>
            <span className="font-bold text-slate-900">{professionalIdentity}</span>
          </div>

          {/* Career Goal */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Career Goal</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              {careerGoal}
            </span>
          </div>

          {/* Top Skills */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Top Skills</span>
            <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
              {displaySkills}
            </span>
          </div>

          {/* Resume */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/70">
            <span className="text-slate-500 font-medium">Resume</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ATS Optimized
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-2"
          >
            <span>Go to Dashboard</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionSuccessModal;
