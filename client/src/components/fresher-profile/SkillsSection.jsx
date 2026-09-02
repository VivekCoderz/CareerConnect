import { useState } from "react";

const PRESET_SKILLS = {
  programmingLanguages: ["JavaScript", "Python", "Java", "C++", "TypeScript", "C", "Go", "PHP"],
  frameworks: ["React", "Node.js", "Express", "Next.js", "Tailwind CSS", "Spring Boot", "Django", "Redux"],
  databases: ["MongoDB", "MySQL", "PostgreSQL", "Redis", "Firebase", "SQLite"],
  tools: ["Git", "GitHub", "Postman", "Docker", "VS Code", "Linux", "AWS", "Figma", "Jira"],
  softSkills: ["Problem Solving", "Communication", "Teamwork", "Time Management", "Adaptability", "Critical Thinking"],
  technical: ["REST API", "Data Structures & Algorithms", "Object-Oriented Programming (OOP)", "System Design Basics", "CI/CD Basics"],
};

const CATEGORY_META = {
  programmingLanguages: { title: "Programming Languages", icon: "💻", color: "blue" },
  frameworks: { title: "Frameworks & Libraries", icon: "⚛️", color: "emerald" },
  databases: { title: "Databases & Storage", icon: "🗄️", color: "amber" },
  tools: { title: "Developer Tools & DevOps", icon: "🛠️", color: "purple" },
  softSkills: { title: "Soft Skills & Leadership", icon: "🤝", color: "rose" },
  technical: { title: "Technical Specializations", icon: "⚡", color: "teal" },
};

const SkillsSection = ({ skills = {}, onChange }) => {
  const [skillsData, setSkillsData] = useState({
    programmingLanguages: skills?.programmingLanguages || [],
    frameworks: skills?.frameworks || [],
    databases: skills?.databases || [],
    tools: skills?.tools || [],
    softSkills: skills?.softSkills || [],
    technical: skills?.technical || [],
  });

  const [inputStates, setInputStates] = useState({
    programmingLanguages: { name: "", proficiency: "Intermediate" },
    frameworks: { name: "", proficiency: "Intermediate" },
    databases: { name: "", proficiency: "Intermediate" },
    tools: { name: "", proficiency: "Intermediate" },
    softSkills: { name: "", proficiency: "Intermediate" },
    technical: { name: "", proficiency: "Intermediate" },
  });

  const handleAddSkill = (category) => {
    const { name, proficiency } = inputStates[category];
    if (!name.trim()) return;

    const currentList = skillsData[category] || [];
    if (currentList.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) return;

    const updatedList = [...currentList, { name: name.trim(), proficiency }];
    const updatedSkills = { ...skillsData, [category]: updatedList };

    setSkillsData(updatedSkills);
    setInputStates({
      ...inputStates,
      [category]: { name: "", proficiency: "Intermediate" },
    });
    onChange({ skills: updatedSkills });
  };

  const handleQuickAdd = (category, skillName) => {
    const currentList = skillsData[category] || [];
    if (currentList.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) return;

    const updatedList = [...currentList, { name: skillName, proficiency: "Intermediate" }];
    const updatedSkills = { ...skillsData, [category]: updatedList };

    setSkillsData(updatedSkills);
    onChange({ skills: updatedSkills });
  };

  const handleRemoveSkill = (category, skillIndex) => {
    const updatedList = (skillsData[category] || []).filter((_, idx) => idx !== skillIndex);
    const updatedSkills = { ...skillsData, [category]: updatedList };

    setSkillsData(updatedSkills);
    onChange({ skills: updatedSkills });
  };

  const handleProficiencyChange = (category, skillIndex, newProficiency) => {
    const updatedList = [...(skillsData[category] || [])];
    updatedList[skillIndex] = {
      ...updatedList[skillIndex],
      proficiency: newProficiency,
    };
    const updatedSkills = { ...skillsData, [category]: updatedList };

    setSkillsData(updatedSkills);
    onChange({ skills: updatedSkills });
  };

  const totalSkillCount = Object.values(skillsData).reduce((acc, list) => acc + (list?.length || 0), 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Skills & Proficiencies</h2>
            <p className="text-xs text-slate-500">Categorize your technical and interpersonal competencies</p>
          </div>
        </div>

        <div className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full self-start sm:self-center">
          {totalSkillCount} Skills Added
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(CATEGORY_META).map((categoryKey) => {
          const meta = CATEGORY_META[categoryKey];
          const currentList = skillsData[categoryKey] || [];
          const inputState = inputStates[categoryKey];
          const presets = PRESET_SKILLS[categoryKey] || [];

          return (
            <div
              key={categoryKey}
              className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <h3 className="text-sm font-bold text-slate-800">{meta.title}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {currentList.length} added
                  </span>
                </div>

                {/* Skill Pills */}
                {currentList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentList.map((skill, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs group"
                      >
                        <span className="text-xs font-bold text-slate-800">{skill.name}</span>
                        <select
                          value={skill.proficiency || "Intermediate"}
                          onChange={(e) =>
                            handleProficiencyChange(categoryKey, idx, e.target.value)
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border-none bg-transparent outline-none cursor-pointer ${
                            skill.proficiency === "Advanced"
                              ? "text-emerald-700 font-extrabold"
                              : skill.proficiency === "Intermediate"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(categoryKey, idx)}
                          className="text-slate-300 hover:text-rose-500 transition text-xs font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">No skills added in this category yet.</p>
                )}

                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {presets
                    .filter(
                      (p) => !currentList.some((s) => s.name.toLowerCase() === p.toLowerCase())
                    )
                    .slice(0, 4)
                    .map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleQuickAdd(categoryKey, preset)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition font-medium"
                      >
                        + {preset}
                      </button>
                    ))}
                </div>
              </div>

              {/* Add Custom Skill Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50">
                <input
                  type="text"
                  placeholder={`Add ${meta.title}...`}
                  value={inputState.name}
                  onChange={(e) =>
                    setInputStates({
                      ...inputStates,
                      [categoryKey]: { ...inputState, name: e.target.value },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(categoryKey);
                    }
                  }}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500"
                />

                <select
                  value={inputState.proficiency}
                  onChange={(e) =>
                    setInputStates({
                      ...inputStates,
                      [categoryKey]: { ...inputState, proficiency: e.target.value },
                    })
                  }
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleAddSkill(categoryKey)}
                  className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs"
                >
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsSection;
