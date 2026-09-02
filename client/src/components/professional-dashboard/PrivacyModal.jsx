import { useState } from "react";

const PrivacyModal = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState("recruiter-only");
  const [hideCurrentEmployer, setHideCurrentEmployer] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Confidential Career Mode</h3>
            <p className="text-xs text-slate-500">Recruiter privacy and search preferences</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-purple-200 bg-purple-50/60 cursor-pointer">
            <input
              type="radio"
              name="privacy"
              checked={mode === "recruiter-only"}
              onChange={() => setMode("recruiter-only")}
              className="mt-0.5 accent-purple-600"
            />
            <div>
              <span className="font-bold text-slate-900 block">Verified Recruiters Only (Recommended)</span>
              <span className="text-slate-600">Your profile is only discoverable by vetted senior tech recruiters.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="privacy"
              checked={mode === "private"}
              onChange={() => setMode("private")}
              className="mt-0.5 accent-purple-600"
            />
            <div>
              <span className="font-bold text-slate-900 block">Strictly Private</span>
              <span className="text-slate-600">Profile hidden from search. Only visible when you apply directly.</span>
            </div>
          </label>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideCurrentEmployer}
                onChange={(e) => setHideCurrentEmployer(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 accent-purple-600"
              />
              <span className="font-semibold text-slate-700">
                Hide profile from current employer & affiliates
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (onSave) onSave({ mode, hideCurrentEmployer });
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
