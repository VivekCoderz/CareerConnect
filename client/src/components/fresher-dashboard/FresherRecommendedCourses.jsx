import { Link } from "react-router-dom";

const FresherRecommendedCourses = ({ courses = [], targetRole = "Full Stack Developer" }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Trending & Recommended Course</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
              Top #1 Pick
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Top trending certification or crash course designed for <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/courses"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1"
        >
          Browse All Courses →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {courses.slice(0, 1).map((course) => (
          <div
            key={course.id}
            className="rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col md:flex-row justify-between overflow-hidden group"
          >
            <div className="flex flex-col md:flex-row flex-1">
              {/* Thumbnail */}
              <div className="h-44 md:h-auto md:w-56 bg-slate-100 relative overflow-hidden shrink-0">
                <img
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold backdrop-blur-xs">
                  {course.platform}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      🔥 Trending Now
                    </span>
                    <span className="inline-block text-[11px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded-md">
                      {course.skill}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#1e3a8a] transition mt-2">
                    {course.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                  <span>⏱ {course.duration}</span>
                  <span>📊 {course.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="p-5 md:flex md:items-center md:border-l md:border-slate-100 shrink-0">
              <Link
                to={course.url || "/courses"}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>View Course</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FresherRecommendedCourses;
