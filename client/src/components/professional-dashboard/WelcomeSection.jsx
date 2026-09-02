import { Link } from "react-router-dom";

const WelcomeSection = ({
  fullName = "Arya",
  currentRole = "Senior Software Engineer",
  profileStrength = 92,
  careerStrength = 82,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Heading & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {fullName}!
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {currentRole}
          </p>
        </div>

        {/* Right: Two subtle compact metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Profile Strength */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-purple-50/70 border border-purple-100">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ✓
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Profile Strength
              </span>
              <span className="text-sm font-extrabold text-purple-900">
                {profileStrength}% Complete
              </span>
            </div>
          </div>

          {/* Career Strength */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ★
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Career Strength
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {careerStrength} / 100
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;
