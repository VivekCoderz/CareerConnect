import { Link } from "react-router-dom";

const FresherExperienceSection = ({ experienceSummary = {}, profile = {} }) => {
  const projectsCount = experienceSummary.projectsCount ?? profile?.projects?.length ?? 0;
  const internshipsCount = experienceSummary.internshipsCount ?? profile?.internships?.length ?? 0;
  const certificationsCount = experienceSummary.certificationsCount ?? profile?.certifications?.length ?? 0;
  const skillsCount = experienceSummary.skillsCount ?? 8;

  const latestProject = experienceSummary.latestProject || profile?.projects?.[0];
  const latestInternship = experienceSummary.latestInternship || profile?.internships?.[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Experience</h2>
          <p className="text-xs text-slate-500 mt-0.5">Summary of your project portfolio, internships, and verified credentials</p>
        </div>

        <Link
          to="/fresher/profile?step=3"
          className="px-4 py-2 rounded-xl bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 font-bold text-xs transition border border-blue-200 inline-flex items-center gap-1.5 shrink-0"
        >
          Manage Experience →
        </Link>
      </div>

      {/* 4 Summary Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <p className="text-2xl font-bold text-[#1e3a8a]">{projectsCount}</p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">Projects</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <p className="text-2xl font-bold text-blue-600">{internshipsCount}</p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">Internships</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <p className="text-2xl font-bold text-amber-600">{certificationsCount}</p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">Certifications</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <p className="text-2xl font-bold text-emerald-600">{skillsCount}</p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">Skills</p>
        </div>
      </div>

      {/* Latest Project or Internship Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Project Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Latest Project</span>
            <Link to="/fresher/profile?step=3" className="text-[11px] font-bold text-[#1e3a8a] hover:underline">
              {latestProject ? "Edit" : "+ Add"}
            </Link>
          </div>

          {latestProject ? (
            <div>
              <h4 className="text-xs font-bold text-slate-900">{latestProject.title}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{latestProject.description}</p>
              {latestProject.technologies && latestProject.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {latestProject.technologies.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-[10px] rounded-md font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500">Showcase your skills by adding your first project.</p>
              <Link
                to="/fresher/profile?step=3"
                className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 hover:border-[#1e3a8a] text-[#1e3a8a] text-xs font-bold rounded-lg transition"
              >
                + Add Project
              </Link>
            </div>
          )}
        </div>

        {/* Internship Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Latest Internship</span>
            <Link to="/fresher/profile?step=2" className="text-[11px] font-bold text-[#1e3a8a] hover:underline">
              {latestInternship ? "Edit" : "+ Add"}
            </Link>
          </div>

          {latestInternship ? (
            <div>
              <h4 className="text-xs font-bold text-slate-900">{latestInternship.role}</h4>
              <p className="text-xs text-slate-700 font-medium">{latestInternship.companyName}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{latestInternship.description}</p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-slate-500">No internship experience added.</p>
              <Link
                to="/fresher/profile?step=2"
                className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 hover:border-[#1e3a8a] text-[#1e3a8a] text-xs font-bold rounded-lg transition"
              >
                + Add Internship
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FresherExperienceSection;
