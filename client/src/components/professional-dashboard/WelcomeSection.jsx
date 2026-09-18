import { Link } from "react-router-dom";

const WelcomeSection = ({
  name = "Professional",
  fullName,
  currentRole = "Senior Software Engineer",
  profileStrength = 92,
  careerStrength = 82,
}) => {
  // Support both "name" and "fullName" props for backward compatibility
  const displayName = name || fullName || "Professional";

  return (
    <div className="bg-gradient-to-r from-[#1e3a8a] via-purple-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-purple-900/20">
      {/* Background ambient elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-purple-300/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Heading & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-purple-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Professional Career Hub
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-purple-100/90 text-sm max-w-xl leading-relaxed">
            {currentRole} · Your curated opportunities, career insights, and application pipeline are ready.
          </p>
        </div>

        {/* Right: Two subtle compact metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          {/* Profile Strength */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15">
            <div className="w-8 h-8 rounded-xl bg-white text-purple-700 flex items-center justify-center font-bold text-xs shadow-xs">
              ✓
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-purple-200 uppercase tracking-wider">
                Profile Strength
              </span>
              <span className="text-sm font-extrabold text-white">
                {profileStrength}% Complete
              </span>
            </div>
          </div>

          {/* Career Strength */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15">
            <div className="w-8 h-8 rounded-xl bg-white text-indigo-700 flex items-center justify-center font-bold text-xs shadow-xs">
              ★
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-purple-200 uppercase tracking-wider">
                Career Strength
              </span>
              <span className="text-sm font-extrabold text-white">
                {careerStrength} / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Row */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/professional/profile"
          className="px-4 py-2 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs transition shadow-md shadow-black/10 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </Link>
        <Link
          to="/resume-builder"
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Executive Resume
        </Link>
      </div>
    </div>
  );
};

export default WelcomeSection;
