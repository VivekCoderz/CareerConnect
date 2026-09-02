import { Link } from "react-router-dom";

const SkillsSectionCard = ({ technicalSkills = [], softSkills = [] }) => {
  const totalSkills = technicalSkills.length + softSkills.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Your Skills Portfolio</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {totalSkills} Skills
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Used for job matching, course recommendations & resume generation</p>
        </div>

        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          Manage Skills →
        </Link>
      </div>

      {totalSkills > 0 ? (
        <div className="space-y-4">
          {/* Technical */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Technical Skills ({technicalSkills.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {technicalSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200/70 transition"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Soft Skills */}
          {softSkills.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Soft Skills ({softSkills.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {softSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-100 transition"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500 mb-3">Add your skills to improve your career recommendations.</p>
          <Link
            to="/student/profile"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
          >
            + Add Your Skills
          </Link>
        </div>
      )}
    </div>
  );
};

export default SkillsSectionCard;
