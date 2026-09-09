import { Link } from "react-router-dom";

const CourseRecommendationsCard = ({ courses = [], limit = 1 }) => {
  const displayedCourses = limit ? courses.slice(0, limit) : courses;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold text-slate-900">Trending & Recommended Course</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Top #1 Pick
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Top trending skill module to bridge your engineering skill gaps
          </p>
        </div>
        <Link
          to="/courses"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition whitespace-nowrap self-start sm:self-center"
        >
          <span>Explore All Courses</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {displayedCourses && displayedCourses.length > 0 ? (
        <div className="space-y-4">
          {displayedCourses.map((crs) => (
            <div
              key={crs.id || crs._id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    🔥 Trending Now
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {crs.level || "All Levels"}
                  </span>
                  {crs.isFree ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      FREE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      PREMIUM
                    </span>
                  )}
                  {crs.rating && (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50/70 px-2 py-0.5 rounded-md border border-amber-200/60">
                      ★ {crs.rating}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{crs.title}</h3>
                <p className="text-xs font-medium text-slate-600">
                  <span className="font-semibold text-slate-800">{crs.provider || "Geeta University Academy"}</span> • {crs.duration || "4-6 Weeks"}
                </p>

                {crs.skillsCovered && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {crs.skillsCovered.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <Link
                  to={crs.id || crs._id ? `/courses/${crs.id || crs._id}` : "/courses"}
                  className="px-5 py-2.5 bg-[#1e3a8a] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <span>View Course</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">No courses to display right now.</p>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendationsCard;
