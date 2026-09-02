import { Link } from "react-router-dom";

const CareerSnapshotCard = ({
  currentRole = "Senior Software Engineer",
  experience = "4+ Years",
  targetRole = "Engineering Lead / Staff Engineer",
  onUpdateProfile,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Career Snapshot</h2>
            <p className="text-xs text-slate-500 mt-0.5">High-level overview of your professional standing</p>
          </div>

          <Link
            to="/professional/profile"
            onClick={onUpdateProfile}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition shrink-0"
          >
            Update Profile
          </Link>
        </div>

        {/* Three Compact Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Role */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Current Role
            </span>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {currentRole}
            </p>
          </div>

          {/* Experience */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Experience
            </span>
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {experience}
            </p>
          </div>

          {/* Target Role */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="block text-[11px] font-semibold text-purple-600 uppercase tracking-wider mb-1">
              Target Role
            </span>
            <p className="text-sm font-bold text-purple-950 leading-snug">
              {targetRole}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerSnapshotCard;
