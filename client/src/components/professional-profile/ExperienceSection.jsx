import { useState } from "react";

const WORK_MODES = ["Hybrid", "Remote", "On-site"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Consultant", "Co-founder"];

const calculateExperienceSummary = (records = []) => {
  let totalMonths = 0;
  const now = new Date();

  records.forEach((r) => {
    if (!r.startDate) return;
    const start = new Date(r.startDate);
    const end = r.currentlyWorking || !r.endDate ? now : new Date(r.endDate);
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) totalMonths += diff;
  });

  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;
  return `${yrs} Year${yrs !== 1 ? "s" : ""} ${mos} Month${mos !== 1 ? "s" : ""}`;
};

const ExperienceSection = ({ experience = [], onChange }) => {
  const [expList, setExpList] = useState(experience || []);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [currentForm, setCurrentForm] = useState({
    companyName: "",
    jobTitle: "",
    department: "Engineering",
    employmentType: "Full-time",
    location: "Bangalore",
    workMode: "Hybrid",
    startDate: "",
    endDate: "",
    currentlyWorking: false,
    description: "",
    responsibilities: "",
    achievements: "",
    technologiesUsed: [],
    teamSize: 0,
    managerialRole: false,
  });

  const [techInput, setTechInput] = useState("");

  const handleOpenAdd = () => {
    setCurrentForm({
      companyName: "",
      jobTitle: "",
      department: "Engineering",
      employmentType: "Full-time",
      location: "",
      workMode: "Hybrid",
      startDate: "",
      endDate: "",
      currentlyWorking: false,
      description: "",
      responsibilities: "",
      achievements: "",
      technologiesUsed: [],
      teamSize: 0,
      managerialRole: false,
    });
    setEditingIndex(null);
    setTechInput("");
    setShowModal(true);
  };

  const handleOpenEdit = (index) => {
    const item = expList[index];
    setCurrentForm({
      ...item,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
    });
    setEditingIndex(index);
    setTechInput("");
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = expList.filter((_, idx) => idx !== index);
    setExpList(updated);
    onChange({ experience: updated });
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;
    if (currentForm.technologiesUsed?.includes(techInput.trim())) return;
    setCurrentForm({
      ...currentForm,
      technologiesUsed: [...(currentForm.technologiesUsed || []), techInput.trim()],
    });
    setTechInput("");
  };

  const handleRemoveTech = (tToRemove) => {
    setCurrentForm({
      ...currentForm,
      technologiesUsed: (currentForm.technologiesUsed || []).filter((t) => t !== tToRemove),
    });
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!currentForm.companyName || !currentForm.jobTitle || !currentForm.startDate) return;

    let updatedList;
    if (editingIndex !== null) {
      updatedList = [...expList];
      updatedList[editingIndex] = currentForm;
    } else {
      updatedList = [currentForm, ...expList];
    }

    setExpList(updatedList);
    onChange({ experience: updatedList });
    setShowModal(false);
  };

  const totalExperienceString = calculateExperienceSummary(expList);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            ⏳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Career History & Work Experience</h2>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {totalExperienceString}
              </span>
            </div>
            <p className="text-xs text-slate-500">Chronological history of your roles, technologies, and achievements</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-1 self-start sm:self-center"
        >
          <span>+</span> Add Employment Record
        </button>
      </div>

      {/* Experience History List */}
      {expList.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
            💼
          </div>
          <h3 className="text-sm font-bold text-slate-800">No work experience added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add current and previous positions to showcase your career progression and total experience duration.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
          >
            + Add First Position
          </button>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {expList.map((exp, idx) => (
            <div key={idx} className="relative group">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white ${
                  exp.currentlyWorking ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-blue-600"
                }`}
              />

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-200 hover:shadow-xs transition">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{exp.jobTitle}</span>
                      {exp.currentlyWorking && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Current Role
                        </span>
                      )}
                      {exp.managerialRole && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                          Leadership
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-blue-700 mt-0.5">
                      {exp.companyName}{" "}
                      <span className="text-slate-400 font-normal">
                        • {exp.location || "Remote"} ({exp.workMode})
                      </span>
                    </p>
                  </div>

                  <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 whitespace-nowrap">
                    {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Start"} —{" "}
                    {exp.currentlyWorking
                      ? "Present"
                      : exp.endDate
                      ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "Present"}
                  </div>
                </div>

                {exp.description && (
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{exp.description}</p>
                )}

                {exp.responsibilities && (
                  <div className="mt-2.5 text-xs text-slate-700 bg-white/70 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-800 block mb-1">Responsibilities:</span>
                    <p className="leading-relaxed">{exp.responsibilities}</p>
                  </div>
                )}

                {exp.achievements && (
                  <div className="mt-2 text-xs text-emerald-900 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-800 block mb-1">Impact & Achievements:</span>
                    <p className="leading-relaxed">{exp.achievements}</p>
                  </div>
                )}

                {/* Tech Stack Pills */}
                {exp.technologiesUsed && exp.technologiesUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {exp.technologiesUsed.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 bg-white text-slate-700 text-[10px] font-semibold rounded border border-slate-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(idx)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 transition px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Experience Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingIndex !== null ? "Edit Work Experience" : "Add Work Experience"}
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
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, Microsoft, Google"
                    value={currentForm.companyName}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, companyName: e.target.value })
                    }
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title / Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer"
                    value={currentForm.jobTitle}
                    onChange={(e) => setCurrentForm({ ...currentForm, jobTitle: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={currentForm.employmentType}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, employmentType: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-blue-500"
                  >
                    {EMPLOYMENT_TYPES.map((et) => (
                      <option key={et} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={currentForm.workMode}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, workMode: e.target.value })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-blue-500"
                  >
                    {WORK_MODES.map((wm) => (
                      <option key={wm} value={wm}>
                        {wm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={currentForm.location}
                    onChange={(e) => setCurrentForm({ ...currentForm, location: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={currentForm.startDate}
                    onChange={(e) => setCurrentForm({ ...currentForm, startDate: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    disabled={currentForm.currentlyWorking}
                    value={currentForm.endDate}
                    onChange={(e) => setCurrentForm({ ...currentForm, endDate: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentForm.currentlyWorking}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, currentlyWorking: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>I currently work in this role</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-purple-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentForm.managerialRole}
                    onChange={(e) =>
                      setCurrentForm({ ...currentForm, managerialRole: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>This was a Lead / Managerial Role</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Core Responsibilities & Deliverables
                </label>
                <textarea
                  rows={2}
                  placeholder="Architected billing services, collaborated with product managers, reviewed PRs..."
                  value={currentForm.responsibilities}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, responsibilities: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Measurable Impact & Achievements
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Reduced API latency by 35%, migrated 12 services to AWS ECS, saving $25K/month..."
                  value={currentForm.achievements}
                  onChange={(e) =>
                    setCurrentForm({ ...currentForm, achievements: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
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
                    placeholder="e.g. Node.js, React, AWS, Docker"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-blue-500"
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
                  {(currentForm.technologiesUsed || []).map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-100"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(t)}
                        className="text-blue-500 hover:text-rose-600 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceSection;
