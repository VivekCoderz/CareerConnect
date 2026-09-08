import React from "react";
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowRight,
  User,
  ShieldCheck,
} from "lucide-react";

/**
 * CourseCard Component
 * Modern card displaying course information with application status awareness.
 * Dynamically switches CTAs:
 * - No Application -> Apply Now
 * - Applied / Pending -> Application Pending (Disabled)
 * - Enrolled -> Continue Learning
 * - Completed -> Completed
 * - Rejected -> Application Rejected
 */
const CourseCard = ({
  course = {},
  onViewDetails,
  onApply,
  onContinueLearning,
  isApplying = false,
  applicationStatus = null, // "Applied" | "Pending" | "Enrolled" | "In Progress" | "Completed" | "Rejected" | null
  matchedSkills = [],
}) => {
  const {
    _id,
    title = "Untitled Course",
    description = "No course description available.",
    thumbnail,
    domain = "Technology",
    category = "General",
    level = "beginner",
    duration = 0,
    durationUnit = "hours",
    skills = [],
    price = 0,
    recommendation,
    createdBy,
  } = course;

  // Determine actual backend status
  const finalStatus = applicationStatus || course.applicationStatus || course.status;
  const isPending = finalStatus === "Applied" || finalStatus === "Pending";
  const isEnrolled = finalStatus === "Enrolled" || finalStatus === "In Progress";
  const isCompleted = finalStatus === "Completed";
  const isRejected = finalStatus === "Rejected";

  const instructorName =
    typeof createdBy === "object" && createdBy !== null
      ? createdBy.fullName || createdBy.name || createdBy.username
      : null;

  return (
    <div className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Top Thumbnail / Banner */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-indigo-900 p-5 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10.5px] font-bold uppercase tracking-wider backdrop-blur-xs border border-white/20">
                {domain}
              </span>
              <BookOpen size={20} className="text-amber-300 opacity-90" />
            </div>

            <div className="z-10 space-y-1">
              <span className="text-[10px] font-semibold text-blue-200/90 uppercase tracking-widest">
                {category}
              </span>
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {title}
              </h4>
            </div>
          </div>
        )}

        {/* Recommendation Badge */}
        {recommendation && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10.5px] font-extrabold shadow-md flex items-center gap-1">
            <Sparkles size={13} className="fill-slate-950" />
            <span>{recommendation}</span>
          </div>
        )}

        {/* Status Badge Over Thumbnail */}
        {finalStatus && finalStatus !== "Published" && (
          <div className="absolute top-3 right-3">
            {isPending && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                <Clock3 size={12} /> Application Pending
              </span>
            )}
            {isEnrolled && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                <ShieldCheck size={12} /> Enrolled
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-1 rounded-full bg-teal-600 text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
            {isRejected && (
              <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1">
                <AlertCircle size={12} /> Rejected
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="text-[#1e3a8a] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]" />
              {category}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock size={12} className="text-slate-400" />
              {duration} {durationUnit}
            </span>
            <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
              {level}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1e3a8a] transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Instructor info if available */}
          {instructorName && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-600 pt-1">
              <User size={13} className="text-slate-400" />
              <span>Instructor: <strong className="text-slate-800">{instructorName}</strong></span>
            </div>
          )}

          {/* Matched Skills / Skills covered */}
          {(matchedSkills.length > 0 || skills.length > 0) && (
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {matchedSkills.length > 0 ? "Matched Skills:" : "Skills:"}
              </span>
              {(matchedSkills.length > 0 ? matchedSkills : skills).slice(0, 3).map((sk, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${
                    matchedSkills.length > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {sk}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          {/* Price */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Course Fee
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {price > 0 ? `₹${price}` : "Free"}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(_id)}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Details
              </button>
            )}

            {/* Dynamic Status-Based CTA Button */}
            {isCompleted ? (
              <button
                type="button"
                onClick={() => onContinueLearning && onContinueLearning(course)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
              >
                <span>Completed</span>
                <CheckCircle2 size={14} />
              </button>
            ) : isEnrolled ? (
              <button
                type="button"
                onClick={() => onContinueLearning && onContinueLearning(course)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
              >
                <span>Continue Learning</span>
                <ArrowRight size={14} />
              </button>
            ) : isPending ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300/80 cursor-not-allowed flex items-center gap-1"
              >
                <Clock3 size={13} />
                <span>Application Pending</span>
              </button>
            ) : isRejected ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 cursor-not-allowed flex items-center gap-1"
              >
                <AlertCircle size={13} />
                <span>Application Rejected</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onApply && onApply(course)}
                disabled={isApplying}
                className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs hover:shadow-md flex items-center gap-1 transition-all disabled:opacity-50"
              >
                <span>{isApplying ? "Submitting..." : "Apply Now"}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
