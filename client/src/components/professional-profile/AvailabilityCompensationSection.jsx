import { useState } from "react";

const SEARCH_STATUSES = [
  "Open to Opportunities",
  "Actively Looking",
  "Employed (Passive / Open)",
  "Serving Notice Period",
  "Available Immediately",
  "Not Looking",
];

const NOTICE_PERIODS = [
  "Immediate",
  "7 Days",
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
  "90 Days",
  "Other",
];

const RELOCATION_OPTIONS = ["Depends on Opportunity", "Yes", "No"];

const AvailabilityCompensationSection = ({
  availability = {},
  compensation = {},
  relocation = {},
  jobSearchStatus = "Open to Opportunities",
  onChange,
}) => {
  const [availState, setAvailState] = useState({
    status: availability?.status || "Employed (Passive / Open)",
    noticePeriod: availability?.noticePeriod || "30 Days",
    expectedJoiningDate: availability?.expectedJoiningDate
      ? availability.expectedJoiningDate.split("T")[0]
      : "",
  });

  const [compState, setCompState] = useState({
    currentSalary: compensation?.currentSalary || 24,
    expectedMinSalary: compensation?.expectedMinSalary || 32,
    expectedMaxSalary: compensation?.expectedMaxSalary || 45,
    currency: compensation?.currency || "INR (LPA)",
    isCurrentSalaryConfidential: compensation?.isCurrentSalaryConfidential ?? true,
  });

  const [relocState, setRelocState] = useState({
    willingToRelocate: relocation?.willingToRelocate || "Depends on Opportunity",
    preferredCities: relocation?.preferredCities || [],
  });

  const [searchStatus, setSearchStatus] = useState(jobSearchStatus);

  const notify = (av, co, rel, st) => {
    onChange({
      availability: av,
      compensation: co,
      relocation: rel,
      jobSearchStatus: st,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
          💰
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Availability, Notice Period & Compensation</h2>
          <p className="text-xs text-slate-500">Notice period parameters and confidential compensation range</p>
        </div>
      </div>

      {/* Search Status & Notice Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Job Search Status <span className="text-rose-500">*</span>
          </label>
          <select
            value={searchStatus}
            onChange={(e) => {
              setSearchStatus(e.target.value);
              notify(availState, compState, relocState, e.target.value);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 font-medium"
          >
            {SEARCH_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Official Notice Period <span className="text-rose-500">*</span>
          </label>
          <select
            value={availState.noticePeriod}
            onChange={(e) => {
              const updated = { ...availState, noticePeriod: e.target.value };
              setAvailState(updated);
              notify(updated, compState, relocState, searchStatus);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 font-medium"
          >
            {NOTICE_PERIODS.map((np) => (
              <option key={np} value={np}>
                {np}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compensation Box */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Compensation Package</h3>
            <p className="text-xs text-slate-500">All figures are annual fixed + variable packages</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={compState.isCurrentSalaryConfidential}
              onChange={(e) => {
                const updated = {
                  ...compState,
                  isCurrentSalaryConfidential: e.target.checked,
                };
                setCompState(updated);
                notify(availState, updated, relocState, searchStatus);
              }}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Keep current salary confidential</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current CTC ({compState.currency})
            </label>
            <input
              type="number"
              step="0.5"
              value={compState.currentSalary}
              onChange={(e) => {
                const updated = { ...compState, currentSalary: Number(e.target.value) };
                setCompState(updated);
                notify(availState, updated, relocState, searchStatus);
              }}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Min CTC ({compState.currency})
            </label>
            <input
              type="number"
              step="0.5"
              value={compState.expectedMinSalary}
              onChange={(e) => {
                const updated = { ...compState, expectedMinSalary: Number(e.target.value) };
                setCompState(updated);
                notify(availState, updated, relocState, searchStatus);
              }}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expected Max CTC ({compState.currency})
            </label>
            <input
              type="number"
              step="0.5"
              value={compState.expectedMaxSalary}
              onChange={(e) => {
                const updated = { ...compState, expectedMaxSalary: Number(e.target.value) };
                setCompState(updated);
                notify(availState, updated, relocState, searchStatus);
              }}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 font-bold text-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* Relocation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Willing to Relocate
          </label>
          <select
            value={relocState.willingToRelocate}
            onChange={(e) => {
              const updated = { ...relocState, willingToRelocate: e.target.value };
              setRelocState(updated);
              notify(availState, compState, updated, searchStatus);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500"
          >
            {RELOCATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Target Joining Date
          </label>
          <input
            type="date"
            value={availState.expectedJoiningDate}
            onChange={(e) => {
              const updated = { ...availState, expectedJoiningDate: e.target.value };
              setAvailState(updated);
              notify(updated, compState, relocState, searchStatus);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCompensationSection;
