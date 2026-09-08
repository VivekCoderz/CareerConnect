import { Link } from "react-router-dom";

const FresherHeader = ({ user, careerTarget, profileCompletion = 80 }) => {
  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "Graduate";
  const targetRole = careerTarget?.targetRole || "Full Stack Developer";
  const jobType = careerTarget?.jobType || "Full-time opportunities";
  const workMode = careerTarget?.workMode || "Remote / Hybrid";

  return (
    <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#172554] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-950/10">
      {/* Background ambient elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#f59e0b]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-blue-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Fresher Career Hub
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            Hi, {firstName} 👋
          </h1>
          <p className="text-blue-100/90 text-sm max-w-xl leading-relaxed">
            Take the next step toward your career. Your tailored jobs, skill benchmarks, and active recommendations are ready.
          </p>

          {/* User's Career Target Pill */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-blue-200">Target Role:</span>
              <span className="font-bold text-white">{targetRole}</span>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-blue-200">Looking for:</span>
              <span className="font-semibold text-white">{jobType}</span>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="text-blue-200">Preferred:</span>
              <span className="font-semibold text-white">{workMode}</span>
            </div>
          </div>
        </div>

        {/* Right CTA Button */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3 shrink-0">
          <Link
            to="/fresher/profile?step=5"
            className="px-5 py-2.5 rounded-xl bg-white text-[#1e3a8a] hover:bg-blue-50 font-bold text-xs transition shadow-md shadow-black/10 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Preferences
          </Link>

          <Link
            to="/fresher/profile"
            className="text-xs text-blue-100 hover:text-white underline font-semibold flex items-center gap-1"
          >
            Profile Completion: {profileCompletion}% →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FresherHeader;
