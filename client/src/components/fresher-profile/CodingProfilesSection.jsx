import { useState } from "react";

const PLATFORMS = [
  { name: "LeetCode", icon: "🟡", defaultUrl: "https://leetcode.com/u/" },
  { name: "HackerRank", icon: "🟢", defaultUrl: "https://hackerrank.com/profile/" },
  { name: "GeeksforGeeks", icon: "📗", defaultUrl: "https://auth.geeksforgeeks.org/user/" },
  { name: "CodeChef", icon: "🟤", defaultUrl: "https://codechef.com/users/" },
  { name: "Codeforces", icon: "🔵", defaultUrl: "https://codeforces.com/profile/" },
  { name: "GitHub", icon: "🐙", defaultUrl: "https://github.com/" },
];

const CodingProfilesSection = ({ codingProfiles = [], onChange }) => {
  const [profiles, setProfiles] = useState(codingProfiles || []);
  const [selectedPlatform, setSelectedPlatform] = useState("LeetCode");
  const [usernameInput, setUsernameInput] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const handleAdd = () => {
    if (!usernameInput.trim()) return;

    const platMeta = PLATFORMS.find((p) => p.name === selectedPlatform);
    const finalUrl = urlInput.trim() || (platMeta ? `${platMeta.defaultUrl}${usernameInput.trim()}` : "");

    // Check if already exists for this platform
    const existingIdx = profiles.findIndex((p) => p.platform === selectedPlatform);
    let updated;
    if (existingIdx >= 0) {
      updated = [...profiles];
      updated[existingIdx] = {
        platform: selectedPlatform,
        username: usernameInput.trim(),
        profileUrl: finalUrl,
      };
    } else {
      updated = [
        ...profiles,
        {
          platform: selectedPlatform,
          username: usernameInput.trim(),
          profileUrl: finalUrl,
        },
      ];
    }

    setProfiles(updated);
    onChange({ codingProfiles: updated });
    setUsernameInput("");
    setUrlInput("");
  };

  const handleRemove = (platformName) => {
    const updated = profiles.filter((p) => p.platform !== platformName);
    setProfiles(updated);
    onChange({ codingProfiles: updated });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg">
          🧩
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Coding Platform Handles</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
              Boosts Readiness +15%
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Showcase problem solving capabilities and competitive programming rankings
          </p>
        </div>
      </div>

      {/* Connected Profiles List */}
      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((cp, idx) => {
            const meta = PLATFORMS.find((p) => p.name === cp.platform);
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta?.icon || "💻"}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{cp.platform}</span>
                    <a
                      href={cp.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      @{cp.username} ↗
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(cp.platform)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center text-xs font-bold transition"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 text-xs text-orange-800">
          💡 Adding LeetCode or GeeksforGeeks handles helps tech recruiters quickly evaluate your Data Structures & problem-solving prowess.
        </div>
      )}

      {/* Add Handle Row */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
        <span className="text-xs font-bold text-slate-700 block">Connect a Platform:</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500"
            >
              {PLATFORMS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Username / Handle</label>
            <input
              type="text"
              placeholder="e.g. rahul_dev24"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Profile Link (Optional)</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Auto-generated if blank"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-4 h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs whitespace-nowrap"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingProfilesSection;
