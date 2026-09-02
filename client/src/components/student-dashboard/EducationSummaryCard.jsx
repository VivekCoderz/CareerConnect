import { Link } from "react-router-dom";

const EducationSummaryCard = ({ education = [] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Background</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your formal education & university milestones</p>
        </div>
        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Manage Education →
        </Link>
      </div>

      {education && education.length > 0 ? (
        <div className="space-y-3">
          {education.map((edu, idx) => (
            <div
              key={edu._id || idx}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  🎓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{edu.institution}</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                  </p>
                  {edu.grade && (
                    <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1.5 border border-emerald-100">
                      Score: {edu.grade}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-500 sm:text-right shrink-0">
                {edu.startYear} - {edu.currentlyStudying ? "Present" : edu.endYear}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-500 mb-3">No education details added yet.</p>
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
          >
            + Add Education Information
          </Link>
        </div>
      )}
    </div>
  );
};

export default EducationSummaryCard;
