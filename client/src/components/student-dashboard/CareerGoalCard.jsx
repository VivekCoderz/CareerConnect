import { Link } from "react-router-dom";

const CareerGoalCard = ({ careerGoal, preferences }) => {
  const targetRole = careerGoal || "Full Stack Developer";
  const preferredRoles = preferences?.preferredRoles?.length
    ? preferences.preferredRoles.join(", ")
    : "Frontend Developer, Software Engineer";
  const preferredLocations = preferences?.preferredLocations?.length
    ? preferences.preferredLocations.join(", ")
    : "Bangalore, Gurgaon, Remote";
  const remote = preferences?.remote !== false;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Career Aspirations & Target</h2>
          <p className="text-xs text-slate-500 mt-0.5">Used by our recommendation engine to filter relevant opportunities</p>
        </div>
        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          Edit Goals →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-400 font-medium block mb-1">Target Primary Role</span>
          <p className="font-bold text-slate-900 text-sm">{targetRole}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-400 font-medium block mb-1">Preferred Secondary Roles</span>
          <p className="font-semibold text-slate-800">{preferredRoles}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-400 font-medium block mb-1">Preferred Work Locations</span>
          <p className="font-semibold text-slate-800">{preferredLocations}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-400 font-medium block mb-1">Work Mode Flexibility</span>
          <p className="font-semibold text-emerald-700">
            {remote ? "✓ Open to Remote & Hybrid Roles" : "On-site only"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CareerGoalCard;
