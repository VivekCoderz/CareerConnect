import { useState } from "react";

const CONTACT_METHODS = ["Email", "LinkedIn", "Phone", "Platform Chat"];
const VISIBILITY_OPTIONS = [
  {
    id: "recruiter-only",
    title: "Recruiters Only (Confidential)",
    desc: "Only verified corporate recruiters and talent partners can view your profile.",
  },
  {
    id: "public",
    title: "Public Profile",
    desc: "Accessible to anyone with your profile link, listed in community directories.",
  },
  {
    id: "private",
    title: "Private Profile",
    desc: "Completely hidden from all searches and external recruiter discovery.",
  },
];

const RecruiterPreferencesSection = ({
  recruiterPreferences = {},
  profileVisibility = "recruiter-only",
  onChange,
}) => {
  const [allowContact, setAllowContact] = useState(
    recruiterPreferences?.allowContact ?? true
  );
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    recruiterPreferences?.preferredContactMethod || "Email"
  );
  const [visibility, setVisibility] = useState(profileVisibility);

  const notify = (allow, method, vis) => {
    onChange({
      recruiterPreferences: {
        allowContact: allow,
        preferredContactMethod: method,
      },
      profileVisibility: vis,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg">
          🛡️
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recruiter Discovery & Privacy Settings</h2>
          <p className="text-xs text-slate-500">Manage who can view your profile and preferred outreach channels</p>
        </div>
      </div>

      {/* Visibility Options Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Profile Visibility Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map((opt) => (
            <div
              key={opt.id}
              onClick={() => {
                setVisibility(opt.id);
                notify(allowContact, preferredContactMethod, opt.id);
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                visibility === opt.id
                  ? "bg-violet-50/70 border-violet-500 ring-2 ring-violet-500/20"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{opt.title}</span>
                  <input
                    type="radio"
                    checked={visibility === opt.id}
                    onChange={() => {}}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recruiter Outreach Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Recruiter Outreach Permission
          </label>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="allowContact"
                checked={allowContact === true}
                onChange={() => {
                  setAllowContact(true);
                  notify(true, preferredContactMethod, visibility);
                }}
                className="text-violet-600 focus:ring-violet-500"
              />
              <span>Allow Direct Recruiter Outreach</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="allowContact"
                checked={allowContact === false}
                onChange={() => {
                  setAllowContact(false);
                  notify(false, preferredContactMethod, visibility);
                }}
                className="text-violet-600 focus:ring-violet-500"
              />
              <span>Pause Outreach</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Preferred Communication Channel
          </label>
          <select
            value={preferredContactMethod}
            onChange={(e) => {
              setPreferredContactMethod(e.target.value);
              notify(allowContact, e.target.value, visibility);
            }}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-violet-500 font-medium"
          >
            {CONTACT_METHODS.map((cm) => (
              <option key={cm} value={cm}>
                {cm}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default RecruiterPreferencesSection;
