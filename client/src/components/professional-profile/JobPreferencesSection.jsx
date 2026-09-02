import { useState } from "react";

const POPULAR_ROLES = [
  "Engineering Lead",
  "Staff Software Engineer",
  "Senior Backend Architect",
  "Principal Engineer",
  "Full Stack Tech Lead",
  "Engineering Manager",
];

const POPULAR_LOCATIONS = [
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Delhi NCR",
  "Mumbai",
  "Remote (India)",
  "Remote (Global)",
];

const WORK_MODES = ["Remote", "Hybrid", "On-site", "Any"];
const EMPLOYMENT_TYPES = ["Full-time", "Contract", "Freelance", "Consultant"];

const JobPreferencesSection = ({ jobPreferences = {}, onChange }) => {
  const [preferredRoles, setPreferredRoles] = useState(
    jobPreferences?.preferredRoles || ["Engineering Lead", "Staff Software Engineer"]
  );
  const [preferredLocations, setPreferredLocations] = useState(
    jobPreferences?.locations || ["Bangalore", "Remote (India)"]
  );
  const [workModes, setWorkModes] = useState(jobPreferences?.workModes || ["Hybrid", "Remote"]);
  const [employmentTypes, setEmploymentTypes] = useState(
    jobPreferences?.employmentTypes || ["Full-time"]
  );

  const [roleInput, setRoleInput] = useState("");
  const [locInput, setLocInput] = useState("");

  const notifyChange = (roles, locs, wms, types) => {
    onChange({
      jobPreferences: {
        preferredRoles: roles,
        locations: locs,
        workModes: wms,
        employmentTypes: types,
      },
    });
  };

  const handleToggleRole = (role) => {
    const next = preferredRoles.includes(role)
      ? preferredRoles.filter((r) => r !== role)
      : [...preferredRoles, role];
    setPreferredRoles(next);
    notifyChange(next, preferredLocations, workModes, employmentTypes);
  };

  const handleAddCustomRole = () => {
    if (!roleInput.trim()) return;
    if (preferredRoles.includes(roleInput.trim())) return;
    const next = [...preferredRoles, roleInput.trim()];
    setPreferredRoles(next);
    setRoleInput("");
    notifyChange(next, preferredLocations, workModes, employmentTypes);
  };

  const handleToggleLocation = (loc) => {
    const next = preferredLocations.includes(loc)
      ? preferredLocations.filter((l) => l !== loc)
      : [...preferredLocations, loc];
    setPreferredLocations(next);
    notifyChange(preferredRoles, next, workModes, employmentTypes);
  };

  const handleAddCustomLocation = () => {
    if (!locInput.trim()) return;
    if (preferredLocations.includes(locInput.trim())) return;
    const next = [...preferredLocations, locInput.trim()];
    setPreferredLocations(next);
    setLocInput("");
    notifyChange(preferredRoles, next, workModes, employmentTypes);
  };

  const handleToggleWorkMode = (wm) => {
    const next = workModes.includes(wm)
      ? workModes.filter((m) => m !== wm)
      : [...workModes, wm];
    setWorkModes(next);
    notifyChange(preferredRoles, preferredLocations, next, employmentTypes);
  };

  const handleToggleEmpType = (type) => {
    const next = employmentTypes.includes(type)
      ? employmentTypes.filter((t) => t !== type)
      : [...employmentTypes, type];
    setEmploymentTypes(next);
    notifyChange(preferredRoles, preferredLocations, workModes, next);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
          🔍
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Job Search & Role Preferences</h2>
          <p className="text-xs text-slate-500">Target roles, locations, employment arrangements, and work modes</p>
        </div>
      </div>

      {/* Target Roles */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Target Executive & Engineering Roles
        </label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleToggleRole(role)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                preferredRoles.includes(role)
                  ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {preferredRoles.includes(role) ? "✓ " : "+ "}
              {role}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Add other target role..."
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomRole();
              }
            }}
            className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={handleAddCustomRole}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
          >
            Add
          </button>
        </div>
      </div>

      {/* Target Locations */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700">
          Preferred Job Locations
        </label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleToggleLocation(loc)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                preferredLocations.includes(loc)
                  ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {preferredLocations.includes(loc) ? "✓ " : "+ "}
              {loc}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Add another preferred city..."
            value={locInput}
            onChange={(e) => setLocInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomLocation();
              }
            }}
            className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={handleAddCustomLocation}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
          >
            Add
          </button>
        </div>
      </div>

      {/* Work Modes & Employment Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Work Modes</label>
          <div className="flex flex-wrap gap-2">
            {WORK_MODES.map((wm) => (
              <button
                key={wm}
                type="button"
                onClick={() => handleToggleWorkMode(wm)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  workModes.includes(wm)
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {workModes.includes(wm) ? "✓ " : ""}
                {wm}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Employment Types
          </label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleToggleEmpType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  employmentTypes.includes(type)
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {employmentTypes.includes(type) ? "✓ " : ""}
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobPreferencesSection;
