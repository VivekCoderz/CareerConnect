const ProfileCompletion = ({ percentage = 0 }) => {
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="flex justify-between items-center text-xs font-bold text-slate-900 mb-2">
        <span className="flex items-center gap-1.5">
          <span>Profile Completion</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              percentage >= 80
                ? "bg-emerald-100 text-emerald-800"
                : percentage >= 50
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {percentage}%
          </span>
        </span>
        <span className="text-slate-400 font-medium">{percentage}/100</span>
      </div>

      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            percentage >= 80
              ? "bg-gradient-to-r from-blue-600 to-emerald-500"
              : percentage >= 50
              ? "bg-gradient-to-r from-blue-500 to-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage < 100 ? (
        <p className="text-xs text-slate-500">
          Complete your profile sections below to maximize your career and internship matching.
        </p>
      ) : (
        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
          <span>✓</span> Your profile is complete and ready for applications!
        </p>
      )}
    </div>
  );
};

export default ProfileCompletion;