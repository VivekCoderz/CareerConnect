import { useState } from "react";
import { getCaptchaToken } from "../../utils/captcha";

export default function ReCaptchaCheckbox({ onChange, onExpired, error }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleChange = async () => {
    if (checked) {
      setChecked(false);
      onExpired?.();
      return;
    }
    setLoading(true);
    setLocalError("");
    try {
      const token = await getCaptchaToken("human_check");
      if (!token && import.meta.env.PROD) {
        setLocalError("Human verification is unavailable. Please try again.");
        return;
      }
      setChecked(true);
      onChange?.(token || "development-check");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <label className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={handleChange} disabled={loading}
          className="h-5 w-5 accent-blue-600" />
        <span>{loading ? "Checking…" : "Verify before continuing"}</span>
      </label>
      <p className="mt-1 text-xs text-slate-500">Protected by Google reCAPTCHA v3.</p>
      {(error || localError) && <p className="mt-1 text-xs text-red-600">{error || localError}</p>}
    </div>
  );
}
