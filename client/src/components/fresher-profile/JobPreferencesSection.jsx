import { useState } from "react";

const COMMON_ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Software Engineer",
  "Junior Web Developer",
  "Data Analyst",
  "QA Automation Engineer",
  "DevOps Engineer",
  "Mobile App Developer",
  "Cloud Associate",
];

const COMMON_LOCATIONS = [
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Delhi NCR",
  "Gurgaon",
  "Noida",
  "Mumbai",
  "Chennai",
  "Kolkata",
  "Remote",
];

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Internship",
  "Graduate Trainee",
  "Apprenticeship",
  "Contract",
  "Freelance",
];

const WORK_MODES = ["Remote", "Hybrid", "On-site", "Any"];

const JobPreferencesSection = ({ preferences = {}, onChange }) => {
  const [prefRoles, setPrefRoles] = useState(preferences?.preferredRoles || ["Full Stack Developer"]);
  const [empTypes, setEmpTypes] = useState(preferences?.employmentTypes || ["Full-time", "Internship"]);
  const [locations, setLocations] = useState(preferences?.preferredLocations || ["Bangalore", "Remote"]);
  const [workModes, setWorkModes] = useState(preferences?.workMode || ["Hybrid", "Remote"]);
  const [salary, setSalary] = useState(preferences?.expectedSalary || { min: 4.5, max: 8.5, currency: "INR (LPA)" });

  const [customRole, setCustomRole] = useState("");
  const [customLoc, setCustomLoc] = useState("");

  const notifyChange = (newRoles, newTypes, newLocs, newModes, newSalary) => {
    onChange({
      jobPreferences: {
        preferredRoles: newRoles,
        employmentTypes: newTypes,
        preferredLocations: newLocs,
        workMode: newModes,
        expectedSalary: newSalary,
      },
    });
  };

  const toggleRole = (role) => {
    const next = prefRoles.includes(role) ? prefRoles.filter((r) => r !== role) : [...prefRoles, role];
    setPrefRoles(next);
    notifyChange(next, empTypes, locations, workModes, salary);
  };

  const addCustomRole = () => {
    if (!customRole.trim() || prefRoles.includes(customRole.trim())) return;
    const next = [...prefRoles, customRole.trim()];
    setPrefRoles(next);
    setCustomRole("");
    notifyChange(next, empTypes, locations, workModes, salary);
  };

  const toggleEmpType = (type) => {
    const next = empTypes.includes(type) ? empTypes.filter((t) => t !== type) : [...empTypes, type];
    setEmpTypes(next);
    notifyChange(prefRoles, next, locations, workModes, salary);
  };

  const toggleLocation = (loc) => {
    const next = locations.includes(loc) ? locations.filter((l) => l !== loc) : [...locations, loc];
    setLocations(next);
    notifyChange(prefRoles, empTypes, next, workModes, salary);
  };

  const addCustomLocation = () => {
    if (!customLoc.trim() || locations.includes(customLoc.trim())) return;
    const next = [...locations, customLoc.trim()];
    setLocations(next);
    setCustomLoc("");
    notifyChange(prefRoles, empTypes, next, workModes, salary);
  };

  const toggleWorkMode = (mode) => {
    const next = workModes.includes(mode) ? workModes.filter((m) => m !== mode) : [...workModes, mode];
    setWorkModes(next);
    notifyChange(prefRoles, empTypes, locations, next, salary);
  };

  const handleSalaryChange = (field, val) => {
    const next = { ...salary, [field]: Number(val) };
    setSalary(next);
    notifyChange(prefRoles, empTypes, locations, workModes, next);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
          🎯
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Job & Career Preferences</h2>
          <p className="text-xs text-slate-500">Specify your ideal roles, locations, work modes, and expected salary</p>
        </div>
      </div>

      {/* Preferred Roles */}
      <div>
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Target Job Roles (Select Multiple)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_ROLES.map((role, idx) => {
            const isSelected = prefRoles.includes(role);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleRole(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {isSelected && "✓ "}
                {role}
              </button>
            );
          })}
        </div>

        {/* Custom Role Input */}
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Add custom role title..."
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomRole();
              }
            }}
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={addCustomRole}
            className="px-3 h-9 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
          >
            Add
          </button>
        </div>
      </div>

      {/* Employment Types & Work Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Employment Types
          </label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((type, idx) => {
              const isSelected = empTypes.includes(type);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleEmpType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isSelected && "✓ "}
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Work Mode Preferences
          </label>
          <div className="flex flex-wrap gap-2">
            {WORK_MODES.map((mode, idx) => {
              const isSelected = workModes.includes(mode);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWorkMode(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {isSelected && "✓ "}
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preferred Locations */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Preferred Job Locations
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_LOCATIONS.map((loc, idx) => {
            const isSelected = locations.includes(loc);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleLocation(loc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {isSelected && "✓ "}
                {loc}
              </button>
            );
          })}
        </div>

        {/* Custom Location Input */}
        <div className="flex gap-2 max-w-sm">
          <input
            type="text"
            placeholder="Add another city..."
            value={customLoc}
            onChange={(e) => setCustomLoc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomLocation();
              }
            }}
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={addCustomLocation}
            className="px-3 h-9 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
          >
            Add City
          </button>
        </div>
      </div>

      {/* Expected Salary Range */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          Expected CTC / Salary Range (INR in LPA)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Minimum (LPA)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={salary.min || 4.5}
                onChange={(e) => handleSalaryChange("min", e.target.value)}
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-200 text-xs outline-none font-semibold focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Maximum (LPA)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={salary.max || 8.5}
                onChange={(e) => handleSalaryChange("max", e.target.value)}
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-200 text-xs outline-none font-semibold focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          E.g. ₹{salary.min || 4.5} LPA – ₹{salary.max || 8.5} LPA. This is shared with recruiters during match filtering.
        </p>
      </div>
    </div>
  );
};

export default JobPreferencesSection;
