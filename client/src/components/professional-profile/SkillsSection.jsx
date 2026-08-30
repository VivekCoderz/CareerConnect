import { useState } from "react";

const PRESET_SKILLS = {
  programmingLanguages: ["JavaScript", "TypeScript", "Python", "Java", "Go", "C++", "Rust", "C#"],
  frameworks: ["React", "Node.js", "Express", "Next.js", "Spring Boot", "FastAPI", "NestJS", "Django"],
  databases: ["PostgreSQL", "MongoDB", "Redis", "MySQL", "DynamoDB", "Elasticsearch", "Cassandra"],
  cloud: ["AWS (S3, EC2, ECS, Lambda)", "Google Cloud (GCP)", "Microsoft Azure", "Cloudflare", "Serverless"],
  devOps: ["Docker", "Kubernetes", "CI/CD (GitHub Actions)", "Terraform", "Jenkins", "Helm", "Prometheus"],
  tools: ["Git", "Postman", "Kafka", "RabbitMQ", "Datadog", "Grafana", "VS Code"],
  domain: ["FinTech & Payments", "SaaS Platforms", "High-Throughput Systems", "E-Commerce", "HealthTech"],
  management: ["System Architecture", "Technical Mentorship", "Agile / Scrum Sprint Leadership", "Cross-Functional Delivery"],
  softSkills: ["Stakeholder Management", "Strategic Communication", "Problem Solving", "Conflict Resolution"],
};

const CATEGORY_META = {
  cloud: { title: "Cloud Platforms & Infrastructure", icon: "☁️" },
  programmingLanguages: { title: "Programming Languages", icon: "💻" },
  frameworks: { title: "Frameworks & Libraries", icon: "⚛️" },
  databases: { title: "Databases & Caching", icon: "🗄️" },
  devOps: { title: "DevOps & Orchestration", icon: "🚢" },
  management: { title: "Architecture & Engineering Leadership", icon: "🏛️" },
  tools: { title: "Tools, Messaging & Monitoring", icon: "🛠️" },
  domain: { title: "Industry & Domain Specializations", icon: "🌐" },
  softSkills: { title: "Executive Soft Skills", icon: "🤝" },
};

const SkillsSection = ({ skills = {}, onChange }) => {
  const [skillsData, setSkillsData] = useState({
    cloud: skills?.cloud || [],
    programmingLanguages: skills?.programmingLanguages || [],
    frameworks: skills?.frameworks || [],
    databases: skills?.databases || [],
    devOps: skills?.devOps || [],
    management: skills?.management || [],
    tools: skills?.tools || [],
    domain: skills?.domain || [],
    softSkills: skills?.softSkills || [],
  });

  const [inputStates, setInputStates] = useState({
    cloud: { name: "", proficiency: "Advanced", yearsOfExperience: 3 },
    programmingLanguages: { name: "", proficiency: "Advanced", yearsOfExperience: 4 },
    frameworks: { name: "", proficiency: "Advanced", yearsOfExperience: 4 },
    databases: { name: "", proficiency: "Advanced", yearsOfExperience: 3 },
    devOps: { name: "", proficiency: "Intermediate", yearsOfExperience: 2 },
    management: { name: "", proficiency: "Advanced", yearsOfExperience: 3 },
    tools: { name: "", proficiency: "Advanced", yearsOfExperience: 4 },
    domain: { name: "", proficiency: "Advanced", yearsOfExperience: 3 },
    softSkills: { name: "", proficiency: "Advanced", yearsOfExperience: 4 },
  });

  const handleAddSkill = (category) => {
    const { name, proficiency, yearsOfExperience } = inputStates[category];
    if (!name.trim()) return;

    const currentList = skillsData[category] || [];
    if (currentList.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) return;

    const updatedList = [
      ...currentList,
      { name: name.trim(), proficiency, yearsOfExperience: Number(yearsOfExperience) || 1 },
    ];
    const updatedSkills = { ...skillsData, [category]: updatedList };

    setSkillsData(updatedSkills);
    setInputStates({
      ...inputStates,
      [category]: { name: "", proficiency: "Advanced", yearsOfExperience: 3 },
    });
    onChange({ skills: updatedSkills });
  };

  const handleQuickAdd = (category, skillName) => {
    const currentList = skillsData[category] || [];
    if (currentList.some((s) => s.name.toLowerCase() === skillName.toLowerCase())) return;

    const updatedList = [
      ...currentList,
      { name: skillName, proficiency: "Advanced", yearsOfExperience: 3 },
    ];
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

  const totalSkillCount = Object.values(skillsData).reduce(
    (acc, list) => acc + (list?.length || 0),
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Professional Competencies & Skills</h2>
            <p className="text-xs text-slate-500">Categorized expertise across cloud architecture, leadership, and backend engineering</p>
          </div>
        </div>

        <div className="px-3.5 py-1 bg-violet-50 text-violet-800 text-xs font-extrabold rounded-full self-start sm:self-center">
          {totalSkillCount} Skills Listed
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
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <h3 className="text-sm font-bold text-slate-800">{meta.title}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {currentList.length} skills
                  </span>
                </div>

                {/* Skill Pills */}
                {currentList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentList.map((skill, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs"
                      >
                        <span className="text-xs font-bold text-slate-800">{skill.name}</span>
                        <select
                          value={skill.proficiency || "Advanced"}
                          onChange={(e) =>
                            handleProficiencyChange(categoryKey, idx, e.target.value)
                          }
                          className={`text-[10px] font-extrabold px-1 py-0.5 rounded border-none bg-transparent outline-none cursor-pointer ${
                            skill.proficiency === "Expert"
                              ? "text-purple-700 font-black"
                              : skill.proficiency === "Advanced"
                              ? "text-emerald-700"
                              : "text-blue-600"
                          }`}
                        >
                          <option value="Expert">Expert</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Beginner">Beginner</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(categoryKey, idx)}
                          className="text-slate-300 hover:text-rose-500 font-bold ml-0.5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">No skills added yet.</p>
                )}

                {/* Presets */}
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
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-violet-50 hover:text-violet-700 font-medium transition"
                      >
                        + {preset}
                      </button>
                    ))}
                </div>
              </div>

              {/* Add Custom Row */}
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
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-violet-500"
                />

                <select
                  value={inputState.proficiency}
                  onChange={(e) =>
                    setInputStates({
                      ...inputStates,
                      [categoryKey]: { ...inputState, proficiency: e.target.value },
                    })
                  }
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none font-medium"
                >
                  <option value="Expert">Expert</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Beginner">Beginner</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleAddSkill(categoryKey)}
                  className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-2xs"
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
