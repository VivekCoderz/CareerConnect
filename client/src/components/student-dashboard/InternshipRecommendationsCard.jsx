const InternshipRecommendationsCard = ({
  internships = [],
  onSave,
  onApply,
  savedIds = [],
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Recommended Internships</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {internships.length} Matched
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Internships tailored to your engineering branch, year, and skill proficiencies
          </p>
        </div>
      </div>

      {internships && internships.length > 0 ? (
        <div className="space-y-4">
          {internships.map((int) => {
            const isSaved = savedIds.includes(int.id);
            return (
              <div
                key={int.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{int.title}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      {int.workMode}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-600">
                    <span className="font-semibold text-slate-800">{int.company}</span> • {int.location}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {int.stipend}
                    </span>
                    <span>• Duration: {int.duration}</span>
                    {int.deadline && <span>• Apply before: {int.deadline}</span>}
                  </div>

                  {int.skillsRequired && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {int.skillsRequired.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    onClick={() => onSave(int)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSaved
                        ? "bg-amber-50 border-amber-300 text-amber-600"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    title={isSaved ? "Saved" : "Save Internship"}
                  >
                    {isSaved ? "★ Saved" : "☆ Save"}
                  </button>

                  <button
                    onClick={() => onApply(int)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    Quick Apply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500">No internship matches right now. Add more skills to unlock new matches.</p>
        </div>
      )}
    </div>
  );
};

export default InternshipRecommendationsCard;
