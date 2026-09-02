import { useState } from "react";

const ProjectsSection = ({ projects = [], onChange }) => {
  const [projectList, setProjectList] = useState(projects || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    name: "",
    organization: "",
    role: "Lead Architect",
    description: "",
    technologies: [],
    responsibilities: "",
    businessImpact: "",
    githubUrl: "",
    liveUrl: "",
  });

  const [techInput, setTechInput] = useState("");

  const handleOpenAdd = () => {
    setCurrentForm({
      name: "",
      organization: "",
      role: "Lead Engineer / Architect",
      description: "",
      technologies: ["Node.js", "AWS", "PostgreSQL", "Docker"],
      responsibilities: "",
      businessImpact: "",
      githubUrl: "",
      liveUrl: "",
    });
    setEditingIndex(null);
    setTechInput("");
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    setCurrentForm({ ...projectList[index] });
    setEditingIndex(index);
    setTechInput("");
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = projectList.filter((_, idx) => idx !== index);
    setProjectList(updated);
    onChange({ projects: updated });
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;
    if (currentForm.technologies?.includes(techInput.trim())) return;
    setCurrentForm({
      ...currentForm,
      technologies: [...(currentForm.technologies || []), techInput.trim()],
    });
    setTechInput("");
  };

  const handleRemoveTech = (t) => {
    setCurrentForm({
      ...currentForm,
      technologies: (currentForm.technologies || []).filter((item) => item !== t),
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.name || !currentForm.description) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...projectList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [currentForm, ...projectList];
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
            <h2 className="text-lg font-bold text-slate-900">High-Impact Technical Projects</h2>
            <p className="text-xs text-slate-500">Enterprise systems, open source architectures, and key platform deliverables</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition flex items-center gap-1"
        >
          <span>+</span> Add Project
        </button>
      </div>

      {projectList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚡
          </div>
          <h3 className="text-sm font-bold text-slate-800">No projects added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Adding high-scale projects with architecture overviews and business impact metrics significantly increases recruiter outreach.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
          >
            + Add Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectList.map((proj, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-200 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-teal-700">{proj.organization || "Enterprise"}</span>
                  {proj.role && (
                    <span className="text-[11px] font-semibold text-slate-500">{proj.role}</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-1.5">{proj.name}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">{proj.description}</p>

                {proj.businessImpact && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-teal-100 text-xs text-teal-950 font-medium">
                    <span className="font-bold text-teal-800 block mb-0.5">Business & Scalability Impact:</span>
                    {proj.businessImpact}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(proj.technologies || []).map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-700 hover:text-teal-700"
                    >
                      Repository ↗
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-600 hover:text-teal-800"
                    >
                      Live Architecture ↗
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 transition"
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
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Payment Gateway & Settlement Engine"
                    value={currentForm.name}
                    onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization / Company
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe / Internal Platform"
                    value={currentForm.organization}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, organization: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Description & Architecture <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Architected an event-driven reconciliation pipeline with Kafka and Redis caching..."
                  value={currentForm.description}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, description: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Measurable Business & Scalability Impact
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Processed 2.5M daily webhook transactions with 99.99% uptime, reduced latency from 450ms to 85ms..."
                  value={currentForm.businessImpact}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, businessImpact: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
                />
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technologies Used
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Node.js, AWS ECS, Kafka, PostgreSQL"
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
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(currentForm.technologies || []).map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-100"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(t)}
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
                    Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={currentForm.githubUrl}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, githubUrl: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Live Demo / Documentation Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={currentForm.liveUrl}
                    onChange={(e) => setCurrentForm({ ...currentForm, liveUrl: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
                  />
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
