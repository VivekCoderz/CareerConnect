import { useState } from "react";

const PROJECT_TYPES = ["Personal", "Academic", "Hackathon", "Freelance", "Open Source"];

const ProjectsSection = ({ projects = [], onChange }) => {
  const [projectList, setProjectList] = useState(projects || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    title: "",
    projectType: "Personal",
    description: "",
    technologies: [],
    role: "Full Stack Developer",
    githubUrl: "",
    liveUrl: "",
    keyFeatures: [],
    challenges: "",
    achievements: "",
  });

  const [techInput, setTechInput] = useState("");
  const [featureInput, setFeatureInput] = useState("");

  const handleOpenAdd = () => {
    setCurrentForm({
      title: "",
      projectType: "Personal",
      description: "",
      technologies: ["React", "Node.js", "MongoDB"],
      role: "Full Stack Developer",
      githubUrl: "",
      liveUrl: "",
      keyFeatures: [],
      challenges: "",
      achievements: "",
    });
    setEditingIndex(null);
    setTechInput("");
    setFeatureInput("");
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    setCurrentForm({ ...projectList[index] });
    setEditingIndex(index);
    setTechInput("");
    setFeatureInput("");
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = projectList.filter((_, idx) => idx !== index);
    setProjectList(updated);
    onChange({ projects: updated });
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;
    if (currentForm.technologies.includes(techInput.trim())) return;
    setCurrentForm({
      ...currentForm,
      technologies: [...currentForm.technologies, techInput.trim()],
    });
    setTechInput("");
  };

  const handleRemoveTech = (techToRemove) => {
    setCurrentForm({
      ...currentForm,
      technologies: currentForm.technologies.filter((t) => t !== techToRemove),
    });
  };

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setCurrentForm({
      ...currentForm,
      keyFeatures: [...(currentForm.keyFeatures || []), featureInput.trim()],
    });
    setFeatureInput("");
  };

  const handleRemoveFeature = (featIndex) => {
    setCurrentForm({
      ...currentForm,
      keyFeatures: (currentForm.keyFeatures || []).filter((_, idx) => idx !== featIndex),
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.title || !currentForm.description) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...projectList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [...projectList, currentForm];
    }

    setProjectList(updatedList);
    onChange({ projects: updatedList });
    setShowModal(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
            🚀
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Featured Projects Portfolio</h2>
            <p className="text-xs text-slate-500">Showcase your technical depth with working applications</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Project
        </button>
      </div>

      {/* Projects List */}
      {projectList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto text-xl font-bold">
            💻
          </div>
          <h3 className="text-sm font-bold text-slate-800">You haven't added any projects yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Adding at least 2 real-world projects with GitHub repository links boosts your job readiness score significantly.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
          >
            Add Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projectList.map((proj, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-teal-200 hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold">
                    {proj.projectType || "Personal"}
                  </span>
                  {proj.role && (
                    <span className="text-[11px] font-semibold text-slate-500">{proj.role}</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{proj.title}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {proj.description}
                </p>

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(proj.technologies || []).map((t, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Key Features Bullet points */}
                {proj.keyFeatures && proj.keyFeatures.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[11px] text-slate-600 pl-3 border-l-2 border-teal-300">
                    {proj.keyFeatures.slice(0, 2).map((feat, fIdx) => (
                      <li key={fIdx}>• {feat}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Links */}
              <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-700 hover:text-teal-700 flex items-center gap-1"
                    >
                      <span>🐙</span> Code
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>🔗</span> Live Demo
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Project" : "Add Project"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI-Powered Resume Screener"
                    value={currentForm.title}
                    onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project Type
                  </label>
                  <select
                    value={currentForm.projectType}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, projectType: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-teal-500"
                  >
                    {PROJECT_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt} Project
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the application architecture, the core problem it solves, and how it works..."
                  value={currentForm.description}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, description: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                />
              </div>

              {/* Technologies Tag Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technologies Used
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. React, Redux Toolkit, MongoDB, Tailwind CSS"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTech}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
                  >
                    Add Tech
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(currentForm.technologies || []).map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-100"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="text-teal-500 hover:text-rose-600 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/project"
                    value={currentForm.githubUrl}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, githubUrl: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Live Demo / Deployment URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://myproject.vercel.app"
                    value={currentForm.liveUrl}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, liveUrl: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Key Features Bullet points */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Features / Highlights
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. JWT Auth with refresh tokens, WebSocket real-time alerts"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
                  >
                    Add Feature
                  </button>
                </div>

                <div className="space-y-1">
                  {(currentForm.keyFeatures || []).map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs text-slate-700 border border-slate-100"
                    >
                      <span>• {feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(fIdx)}
                        className="text-rose-500 hover:text-rose-700 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSection;
