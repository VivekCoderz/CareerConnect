import React from "react";
import { CheckCircle2, Clock, Award, Sparkles } from "lucide-react";

/**
 * CourseProgress
 * Visual progress bar and metrics component for CareerConnect LMS.
 * Supports completion badges, lesson counters, and responsive progress bars.
 */
const CourseProgress = ({
  progress = 0,
  completedCount = 0,
  totalCount = 0,
  status = "Enrolled",
  showText = true,
  size = "md",
  className = "",
}) => {
  // Ensure progress is clamped between 0 and 100
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress || 0)));
  const isComplete = normalizedProgress === 100 || status === "Completed";

  // Size variations
  const heightClasses = {
    sm: "h-2",
    md: "h-2.5",
    lg: "h-3.5",
  };

  const textClasses = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showText && (
        <div className="flex items-center justify-between font-medium">
          <div className="flex items-center gap-1.5 text-slate-700">
            {isComplete ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 size={15} />
                <span>Course Completed 🎉</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <Clock size={14} className="text-[#1e3a8a]" />
                <span>In Progress</span>
              </span>
            )}
            {totalCount > 0 && (
              <span className="text-slate-400 text-xs">
                ({completedCount}/{totalCount} lessons)
              </span>
            )}
          </div>

          <span
            className={`font-extrabold ${
              isComplete ? "text-emerald-600" : "text-[#1e3a8a]"
            } ${textClasses[size]}`}
          >
            {normalizedProgress}%
          </span>
        </div>
      )}

      {/* Progress Bar Container */}
      <div
        className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 ${heightClasses[size]}`}
      >
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isComplete
              ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"
              : "bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-indigo-600"
          }`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>

      {isComplete && (
        <div className="pt-0.5 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
          <Sparkles size={12} className="text-amber-500" />
          <span>Congratulations! You've mastered all learning modules in this course.</span>
        </div>
      )}
    </div>
  );
};

export default CourseProgress;
