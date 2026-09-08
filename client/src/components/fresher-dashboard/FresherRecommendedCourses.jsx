import { Link } from "react-router-dom";

const FresherRecommendedCourses = ({ courses = [], targetRole = "Full Stack Developer" }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recommended Learning</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] text-[11px] font-bold border border-blue-100">
              Personalized
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Targeted certifications and crash courses designed for <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/courses"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1"
        >
          Browse All Courses →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col justify-between overflow-hidden group"
          >
            <div>
              {/* Thumbnail */}
              <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
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
              <div className="p-4 space-y-2">
                <span className="inline-block text-[11px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded-md">
                  {course.skill}
                </span>

                <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#1e3a8a] transition">
                  {course.name}
                </h3>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                  <span>⏱ {course.duration}</span>
                  <span>📊 {course.difficulty}</span>
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="p-4 pt-0">
              <Link
                to={course.url || "/courses"}
                className="w-full py-2 rounded-xl bg-slate-50 hover:bg-[#1e3a8a] hover:text-white text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-200 hover:border-[#1e3a8a]"
              >
                View Course →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FresherRecommendedCourses;
