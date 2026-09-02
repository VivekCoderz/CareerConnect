import { Link } from "react-router-dom";

const ProfileCompletionCard = ({ profile, user, completion = 0 }) => {
  const sections = [
    {
      id: "basic",
      label: "Basic Information",
      completed: !!(user?.fullName && user?.email && user?.phone),
    },
    {
      id: "education",
      label: "Education Details",
      completed: !!(profile?.education && profile.education.length > 0),
    },
    {
      id: "skills",
      label: "Technical & Soft Skills",
      completed: !!(
        (profile?.technicalSkills && profile.technicalSkills.length >= 3) ||
        (profile?.softSkills && profile.softSkills.length >= 2)
      ),
    },
    {
      id: "projects",
      label: "Projects & Portfolio",
      completed: !!(profile?.projects && profile.projects.length > 0),
    },
    {
      id: "resume",
      label: "Resume Upload / Creation",
      completed: !!(profile?.resume?.resumeName || profile?.resume?.resumeUrl),
    },
    {
      id: "certifications",
      label: "Certifications & Credentials",
      completed: !!(profile?.certifications && profile.certifications.length > 0),
    },
  ];

  const pendingCount = sections.filter((s) => !s.completed).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Profile Completion</h2>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                completion >= 80
                  ? "bg-emerald-100 text-emerald-800"
                  : completion >= 50
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {completion}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {pendingCount === 0
              ? "All key profile sections are complete! Your profile has maximum visibility."
              : `${pendingCount} section${pendingCount > 1 ? "s" : ""} pending to reach 100% profile strength.`}
          </p>
        </div>

        <Link
          to="/student/profile"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
        >
          Complete Profile →
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6 p-0.5 border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            completion >= 80
              ? "bg-gradient-to-r from-blue-600 to-emerald-500"
              : completion >= 50
              ? "bg-gradient-to-r from-blue-500 to-amber-500"
              : "bg-rose-500"
          }`}
          style={{ width: `${completion}%` }}
        />
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition ${
              section.completed
                ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                : "bg-slate-50 border-slate-100 text-slate-600"
            }`}
          >
            {section.completed ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] shrink-0" />
            )}
            <span className="truncate">{section.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileCompletionCard;
