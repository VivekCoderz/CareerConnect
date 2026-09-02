import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const emptyProject = {
  title: "",
  description: "",
  technologies: [],
  role: "",
  startDate: "",
  endDate: "",
  githubUrl: "",
  liveUrl: "",
  projectImage: "",
};

const ProjectsSection = ({ projects = [], setProfile }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProject);
  const [technologyInput, setTechnologyInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const addTechnology = () => {
    const value = technologyInput.trim();
    if (!value) return;
    if (form.technologies.includes(value)) return;

    setForm({
      ...form,
      technologies: [...form.technologies, value],
    });
    setTechnologyInput("");
  };

  const removeTechnology = (technology) => {
    setForm({
      ...form,
      technologies: form.technologies.filter((item) => item !== technology),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      let updatedProjects;

      if (editingId) {
        updatedProjects = projects.map((item) =>
          item._id === editingId ? { ...form, _id: editingId } : item
        );
      } else {
        updatedProjects = [...projects, form];
      }

      const response = await updateStudentProfile({
        projects: updatedProjects,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }

      setForm(emptyProject);
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const editProject = (project) => {
    setForm({
      title: project.title || "",
      description: project.description || "",
      technologies: project.technologies || [],
      role: project.role || "",
      startDate: project.startDate ? project.startDate.substring(0, 10) : "",
      endDate: project.endDate ? project.endDate.substring(0, 10) : "",
      githubUrl: project.githubUrl || "",
      liveUrl: project.liveUrl || "",
      projectImage: project.projectImage || "",
    });

    setEditingId(project._id);
    setShowForm(true);
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;

    try {
      const updatedProjects = projects.filter((item) => item._id !== id);
      const response = await updateStudentProfile({
        projects: updatedProjects,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert("Failed to delete project");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Projects & Portfolio</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showcase your technical projects and live apps</p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyProject);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold transition"
          >
            + Add Project
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            {editingId ? "Edit Project" : "Add Project"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title *</label>
              <input
                name="title"
                placeholder="e.g. E-Commerce Platform"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
              <textarea
                name="description"
                placeholder="Key features, problems solved, and architecture..."
                rows={3}
                value={form.description}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role in Project</label>
              <input
                name="role"
                placeholder="e.g. Full Stack Developer"
                value={form.role}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
              />
            </div>

            {/* Technologies */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Technologies Used</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={technologyInput}
                  onChange={(e) => setTechnologyInput(e.target.value)}
                  placeholder="e.g. React"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTechnology();
                    }
                  }}
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={addTechnology}
                  className="px-4 h-10 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
                >
                  Add Tech
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-6">
                {form.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 shadow-2xs"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTechnology(tech)}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GitHub Repository URL</label>
                <input
                  name="githubUrl"
                  placeholder="https://github.com/..."
                  value={form.githubUrl}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Live Demo URL</label>
                <input
                  name="liveUrl"
                  placeholder="https://..."
                  value={form.liveUrl}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {saving ? "Saving..." : "Save Project"}
            </button>
          </div>
        </form>
      )}

      {/* Projects List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project._id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{project.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {project.role && (
                  <p className="text-[11px] text-blue-600 font-medium mt-2">
                    Role: {project.role}
                  </p>
                )}

                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.technologies.map((technology) => (
                      <span
                        key={technology}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 text-xs">
                <div className="flex items-center gap-3 font-semibold">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-700 hover:text-slate-900"
                    >
                      GitHub ↗
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Live Demo ↗
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editProject(project)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(project._id)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 font-semibold rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          !showForm && (
            <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center sm:col-span-2">
              <p className="text-xs text-slate-500">No projects added yet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;