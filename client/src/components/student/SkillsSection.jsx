import { useState } from "react";
import { updateStudentProfile } from "../../services/studentProfileService";

const SkillsSection = ({
  technicalSkills = [],
  softSkills = [],
  setProfile,
}) => {
  const [technicalInput, setTechnicalInput] = useState("");
  const [softInput, setSoftInput] = useState("");
  const [saving, setSaving] = useState(false);

  const saveSkills = async (newTechnical, newSoft) => {
    try {
      setSaving(true);
      const response = await updateStudentProfile({
        technicalSkills: newTechnical,
        softSkills: newSoft,
      });

      if (response?.profile) {
        setProfile(response.profile);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update skills");
    } finally {
      setSaving(false);
    }
  };

  const addTechnicalSkill = async () => {
    const skill = technicalInput.trim();
    if (!skill) return;

    if (technicalSkills.includes(skill)) {
      setTechnicalInput("");
      return;
    }

    await saveSkills([...technicalSkills, skill], softSkills);
    setTechnicalInput("");
  };

  const addSoftSkill = async () => {
    const skill = softInput.trim();
    if (!skill) return;

    if (softSkills.includes(skill)) {
      setSoftInput("");
      return;
    }

    await saveSkills(technicalSkills, [...softSkills, skill]);
    setSoftInput("");
  };

  const removeTechnicalSkill = async (skill) => {
    await saveSkills(
      technicalSkills.filter((item) => item !== skill),
      softSkills
    );
  };

  const removeSoftSkill = async (skill) => {
    await saveSkills(
      technicalSkills,
      softSkills.filter((item) => item !== skill)
    );
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Skills Portfolio</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage your core engineering and interpersonal competencies</p>
      </div>

      {/* Technical Skills */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Technical Skills</h3>

        <div className="flex flex-wrap gap-2 min-h-8">
          {technicalSkills.length > 0 ? (
            technicalSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeTechnicalSkill(skill)}
                  className="w-4 h-4 rounded-full hover:bg-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">No technical skills added yet.</span>
          )}
        </div>

        <div className="flex gap-2 max-w-md">
          <input
            value={technicalInput}
            onChange={(e) => setTechnicalInput(e.target.value)}
            placeholder="e.g. React, Node.js, Python"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTechnicalSkill();
              }
            }}
            className="flex-1 h-10 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
          />
          <button
            type="button"
            onClick={addTechnicalSkill}
            disabled={saving || !technicalInput.trim()}
            className="px-4 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            Add
          </button>
        </div>
      </div>

      {/* Soft Skills */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Soft Skills</h3>

        <div className="flex flex-wrap gap-2 min-h-8">
          {softSkills.length > 0 ? (
            softSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-100"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSoftSkill(skill)}
                  className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center text-blue-500 hover:text-blue-800 text-xs"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">No soft skills added yet.</span>
          )}
        </div>

        <div className="flex gap-2 max-w-md">
          <input
            value={softInput}
            onChange={(e) => setSoftInput(e.target.value)}
            placeholder="e.g. Teamwork, Communication"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSoftSkill();
              }
            }}
            className="flex-1 h-10 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs outline-none"
          />
          <button
            type="button"
            onClick={addSoftSkill}
            disabled={saving || !softInput.trim()}
            className="px-4 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;