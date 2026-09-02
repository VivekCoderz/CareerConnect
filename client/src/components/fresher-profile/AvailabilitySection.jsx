import { useState } from "react";

const AVAILABILITY_STATUSES = [
  "Immediately Available",
  "Available Soon (15-30 Days)",
  "Available After Notice Period",
  "Not Looking",
];

const EMPLOYMENT_STATUSES = [
  "Looking for Job",
  "Unemployed",
  "Intern",
  "Freelancing",
  "Other",
];

const AvailabilitySection = ({ availability = {}, workAuthorization = {}, onChange }) => {
  const [availStatus, setAvailStatus] = useState(availability?.status || "Immediately Available");
  const [joiningDate, setJoiningDate] = useState(
    availability?.expectedJoiningDate ? availability.expectedJoiningDate.split("T")[0] : ""
  );
  const [empStatus, setEmpStatus] = useState(availability?.currentEmploymentStatus || "Looking for Job");

  const [authStatus, setAuthStatus] = useState(workAuthorization?.status || "Authorized to work in India");
  const [relocate, setRelocate] = useState(workAuthorization?.willingToRelocate ?? true);
  const [remoteReady, setRemoteReady] = useState(workAuthorization?.willingToWorkRemote ?? true);

  const notify = (nextAvailStatus, nextJoiningDate, nextEmpStatus, nextAuthStatus, nextRelocate, nextRemote) => {
    onChange({
      availability: {
        status: nextAvailStatus,
        expectedJoiningDate: nextJoiningDate,
        currentEmploymentStatus: nextEmpStatus,
      },
      workAuthorization: {
        status: nextAuthStatus,
        willingToRelocate: nextRelocate,
        willingToWorkRemote: nextRemote,
      },
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
          ⏱️
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Joining Availability & Work Status</h2>
          <p className="text-xs text-slate-500">Notice period readiness, employment state, and relocation preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Availability Status <span className="text-rose-500">*</span>
          </label>
          <select
            value={availStatus}
            onChange={(e) => {
              setAvailStatus(e.target.value);
              notify(e.target.value, joiningDate, empStatus, authStatus, relocate, remoteReady);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500 font-medium"
          >
            {AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Earliest Joining Date (Optional)
          </label>
          <input
            type="date"
            value={joiningDate}
            onChange={(e) => {
              setJoiningDate(e.target.value);
              notify(availStatus, e.target.value, empStatus, authStatus, relocate, remoteReady);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Current Employment Status
          </label>
          <select
            value={empStatus}
            onChange={(e) => {
              setEmpStatus(e.target.value);
              notify(availStatus, joiningDate, e.target.value, authStatus, relocate, remoteReady);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-teal-500"
          >
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Work Authorization
          </label>
          <input
            type="text"
            value={authStatus}
            onChange={(e) => {
              setAuthStatus(e.target.value);
              notify(availStatus, joiningDate, empStatus, e.target.value, relocate, remoteReady);
            }}
            placeholder="e.g. Authorized to work in India"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Relocation & Remote Checkboxes */}
      <div className="pt-2 flex flex-col sm:flex-row gap-4 border-t border-slate-100">
        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex-1">
          <input
            type="checkbox"
            checked={relocate}
            onChange={(e) => {
              setRelocate(e.target.checked);
              notify(availStatus, joiningDate, empStatus, authStatus, e.target.checked, remoteReady);
            }}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
          />
          <span>✈️ Willing to relocate for the right opportunity</span>
        </label>

        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex-1">
          <input
            type="checkbox"
            checked={remoteReady}
            onChange={(e) => {
              setRemoteReady(e.target.checked);
              notify(availStatus, joiningDate, empStatus, authStatus, relocate, e.target.checked);
            }}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
          />
          <span>🏠 Equipped and eager for remote work</span>
        </label>
      </div>
    </div>
  );
};

export default AvailabilitySection;
