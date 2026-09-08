import React from "react";
import {
  BookOpen,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  ChevronRight,
  Tag,
} from "lucide-react";
import CourseProgress from "./CourseProgress";

/**
 * Reusable CourseCard Component
 * 
 * Props:
 * - course: Course object
 * - mode: "catalog" | "enrolled" | "compact"
 * - isApplied: boolean (for catalog mode)
 * - isApplying: boolean (loading state for enroll action)
 * - progress: number (0-100, for enrolled mode)
 * - status: string ("Applied" | "Enrolled" | "Completed" | "Rejected")
 * - onViewDetails: (courseId) => void
 * - onEnroll: (courseId) => void
 * - onContinueLearning: (courseItem) => void
 */
const CourseCard = ({
  course = {},
  mode = "catalog",
  isApplied = false,
  isApplying = false,
  progress = 0,
  status = "Enrolled",
  onViewDetails,
  onEnroll,
  onContinueLearning,
}) => {
  const courseId = course._id || course.id;
  const isCompleted = progress === 100 || status === "Completed";

  // ENROLLED MODE
  if (mode === "enrolled") {
    return (
      <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md">
        <div className="space-y-3">
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] text-[11px] font-bold border border-blue-200/80">
              {course.category || course.domain || "Course"}
            </span>

            {isCompleted ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                In Progress
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-2">
            {course.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <CourseProgress progress={progress} status={status} size="sm" />

          <button
            type="button"
            onClick={() => onContinueLearning && onContinueLearning(course)}
            className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Continue Learning</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  // CATALOG / DEFAULT MODE
  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Thumbnail Header */}
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] p-4 flex flex-col justify-between text-white">
            <BookOpen size={24} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {course.domain || "Course"}
              </p>
              <p className="text-xs font-bold line-clamp-1">{course.title}</p>
            </div>
          </div>
        )}

        {/* AI Recommendation Badge */}
        {course.recommendation && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[10.5px] font-bold shadow-xs flex items-center gap-1">
            <Sparkles size={12} /> {course.recommendation}
          </span>
        )}

        {/* Duration / Level Pill */}
        {course.duration && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
            <Clock size={11} /> {course.duration} {course.durationUnit || "hrs"}
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="text-[#1e3a8a] font-bold">
              {course.category || course.domain || "Technology"}
            </span>
            <span className="capitalize">{course.level || "Beginner"}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-2">
            {course.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* Matched Skills */}
        {course.matchedSkills && course.matchedSkills.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-slate-400">Matches:</span>
            {course.matchedSkills.slice(0, 3).map((sk, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200/60"
              >
                {sk}
              </span>
            ))}
          </div>
        )}

        {/* Footer Stats & Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">
            {course.price > 0 ? `₹${course.price}` : "Free Access"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewDetails && onViewDetails(courseId)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Details
            </button>

            {onEnroll && (
              <button
                type="button"
                onClick={() => onEnroll(courseId)}
                disabled={isApplied || isApplying}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isApplied
                    ? "bg-emerald-100 text-emerald-800 cursor-default"
                    : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs"
                }`}
              >
                {isApplied ? "Enrolled ✓" : isApplying ? "Enrolling..." : "Enroll"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
