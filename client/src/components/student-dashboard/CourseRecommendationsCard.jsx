import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles, Clock, ArrowRight } from "lucide-react";

/**
 * CourseRecommendationsCard
 * Dashboard widget displaying top AI recommended courses matching the student profile.
 */
const CourseRecommendationsCard = ({
  courses = [],
  onViewAll,
  onSelectCourse,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Recommended Courses</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {courses.length} Available
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            High-impact curriculum to bridge your career skill gaps
          </p>
        </div>

        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Explore All Courses</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <Link
            to="/courses"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
          >
            <span>Explore All Courses</span>
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((crs) => {
            const courseId = crs._id || crs.id;
            return (
              <div
                key={courseId}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                      {crs.level || "Beginner"}
                    </span>
                    {crs.isFree !== false && (!crs.price || crs.price === 0) ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        FREE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        ₹{crs.price}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {crs.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {crs.description || `${crs.provider || "CareerConnect"} • ${crs.duration || "Self-Paced"}`}
                  </p>

                  {(crs.skillsCovered || crs.skills) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(crs.skillsCovered || crs.skills).slice(0, 3).map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-white text-slate-600 text-[10px] font-medium rounded border border-slate-200"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Clock size={12} className="text-[#1e3a8a]" />
                    {crs.duration || "4 Weeks"}
                  </span>

                  {onSelectCourse ? (
                    <button
                      type="button"
                      onClick={() => onSelectCourse(courseId)}
                      className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      View Course
                    </button>
                  ) : (
                    <Link
                      to={`/courses/${courseId}`}
                      className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
                    >
                      View Course
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <BookOpen size={28} className="mx-auto text-slate-300" />
          <p className="text-xs text-slate-500">No recommended courses available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendationsCard;
