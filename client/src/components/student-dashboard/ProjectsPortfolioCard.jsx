import { Link } from "react-router-dom";

const ProjectsPortfolioCard = ({ projects = [] }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Featured Projects & Portfolio</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {projects.length} Projects
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Showcase your practical engineering applications and codebases</p>
        </div>

        <Link
          to="/student/profile"
          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
        >
          + Add Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((proj, idx) => (
            <div
              key={proj._id || idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{proj.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>

                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {proj.technologies.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold">
                {proj.githubUrl && (
                  <a
                    href={proj.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    <span>GitHub ↗</span>
                  </a>
                )}
                {proj.liveUrl && (
                  <a
                    href={proj.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <span>Live Demo ↗</span>
                  </a>
                )}
                <Link
                  to="/student/profile"
                  className="text-slate-400 hover:text-slate-600 ml-auto"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-xs text-slate-600 font-medium mb-1">No projects added to your portfolio yet.</p>
          <p className="text-[11px] text-slate-400 mb-4">
            Adding projects increases recruiter response rates by over 300%.
          </p>
          <Link
            to="/student/profile"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
          >
            + Showcase Your First Project
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectsPortfolioCard;
