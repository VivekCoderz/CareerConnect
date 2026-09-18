import { Link } from "react-router-dom";

const SAMPLE_COURSES = [
  {
    id: "c1",
    name: "The Complete React Developer Course (Hooks, Context, Redux)",
    platform: "Udemy",
    skill: "React.js",
    duration: "32 hours",
    difficulty: "Intermediate",
    thumbnail: null,
    url: "/courses",
    rating: 4.7,
    enrolled: "125K+",
  },
  {
    id: "c2",
    name: "Full Stack Web Development with Node.js & MongoDB",
    platform: "Coursera",
    skill: "Full Stack",
    duration: "40 hours",
    difficulty: "Beginner",
    thumbnail: null,
    url: "/courses",
    rating: 4.5,
    enrolled: "80K+",
  },
];

const PLATFORM_COLORS = {
  Udemy: "bg-orange-600",
  Coursera: "bg-blue-700",
  LinkedIn: "bg-blue-600",
  edX: "bg-red-700",
  "YouTube": "bg-red-500",
};

const FresherRecommendedCourses = ({ courses = [], targetRole = "Full Stack Developer" }) => {
  const displayCourses = courses.length > 0 ? courses : SAMPLE_COURSES;
  const isStaticData = courses.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🎓</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Recommended Courses
            </h2>
            {isStaticData && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
                Trending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Top certifications and crash courses designed for{" "}
            <span className="font-semibold text-slate-700">{targetRole}</span>
          </p>
        </div>

        <Link
          to="/courses"
          className="text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] transition inline-flex items-center gap-1 shrink-0"
        >
          Browse All Courses →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayCourses.slice(0, 2).map((course) => (
          <div
            key={course.id}
            className="rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col overflow-hidden group"
          >
            {/* Thumbnail */}
            <div className="h-36 bg-gradient-to-br from-[#1e3a8a] to-blue-600 relative overflow-hidden shrink-0 flex items-center justify-center">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="text-white text-center px-4">
                  <div className="text-4xl mb-1">🎓</div>
                  <p className="text-xs font-bold text-blue-100">{course.skill || targetRole}</p>
                </div>
              )}
              <span
                className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-white text-[10px] font-bold ${
                  PLATFORM_COLORS[course.platform] || "bg-slate-900/75"
                }`}
              >
                {course.platform || "Online"}
              </span>
              {course.rating && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-amber-900 text-[10px] font-bold">
                  ★ {course.rating}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    🔥 Trending
                  </span>
                  <span className="text-[11px] font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded-md">
                    {course.skill || "Development"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#1e3a8a] transition line-clamp-2">
                  {course.name}
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>⏱ {course.duration}</span>
                  <span>📊 {course.difficulty}</span>
                  {course.enrolled && <span>👥 {course.enrolled}</span>}
                </div>

                <Link
                  to={course.url || "/courses"}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition shadow-sm"
                >
                  View Course →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Browse more */}
      <div className="text-center pt-1">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:text-[#1e40af] hover:underline transition"
        >
          Explore all courses on CareerConnect →
        </Link>
      </div>
    </div>
  );
};

export default FresherRecommendedCourses;
