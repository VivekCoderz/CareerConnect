const CourseRecommendationsCard = ({ courses = [] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Recommended Courses</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
              {courses.length} Courses
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">High-impact modules to bridge your skill gaps</p>
        </div>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((crs) => (
            <div
              key={crs.id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-violet-300 hover:shadow-xs transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    {crs.level}
                  </span>
                  {crs.isFree ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      FREE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                      PREMIUM
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{crs.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{crs.provider} • {crs.duration}</p>

                {crs.skillsCovered && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {crs.skillsCovered.slice(0, 3).map((sk, idx) => (
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
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  ★ {crs.rating}
                </span>
                <button
                  onClick={() => alert(`Enrolling in ${crs.title}`)}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  View Course
                </button>
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
