import { useState, useRef, useEffect } from "react";
import { uploadResumeAPI } from "../../services/resumeService";

/**
 * Universal Resume Input Component
 * Supports both:
 * 1. "Upload Resume from Device" (PDF, DOC, DOCX <= 10MB) via Cloudinary API
 * 2. "Paste Resume URL" (valid http/https links)
 */
export default function ResumeUploadInput({
  value = "",
  onChange,
  label = "Resume",
  required = false,
  helperText,
  className = "",
}) {
  // Determine initial mode based on value
  const [mode, setMode] = useState("upload"); // 'upload' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState(value || "");
  const [isUrlValid, setIsUrlValid] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (value && value !== urlInput) {
      setUrlInput(value);
    }
  }, [value]);

  const isValidHttpUrl = (str) => {
    if (!str || !str.trim()) return false;
    try {
      const url = new URL(str.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validateFile = (file) => {
    if (!file) return "No file selected.";

    const originalName = (file.name || "").toLowerCase();
    const isAllowedExt =
      originalName.endsWith(".pdf") ||
      originalName.endsWith(".doc") ||
      originalName.endsWith(".docx");

    const isAllowedMime = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ].includes(file.type);

    if (!isAllowedExt && !isAllowedMime) {
      return "Invalid file format. Only PDF, DOC, and DOCX files are allowed.";
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return "File is too large. Maximum allowed size is 10 MB.";
    }

    return null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Automatically trigger upload to existing Cloudinary backend
    try {
      setUploading(true);
      setUploadProgress(true);
      const res = await uploadResumeAPI(file);
      if (res?.success && res?.resumeUrl) {
        onChange?.(res.resumeUrl, {
          fileName: res.resumeName || file.name,
          isFile: true,
          publicId: res.publicId,
        });
      } else {
        throw new Error(res?.message || "Failed to upload resume");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to upload file from device.");
    } finally {
      setUploading(false);
      setUploadProgress(false);
    }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrlInput(val);
    setError("");

    if (!val.trim()) {
      setIsUrlValid(true);
      onChange?.("", { isUrl: true });
      return;
    }

    const valid = isValidHttpUrl(val);
    setIsUrlValid(valid);

    if (valid) {
      onChange?.(val.trim(), { isUrl: true });
    }
  };

  const handleUrlBlur = () => {
    if (urlInput.trim() && !isValidHttpUrl(urlInput)) {
      setError("Please enter a valid URL starting with http:// or https://");
      setIsUrlValid(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setUrlInput("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.("", {});
  };

  const getFileExtensionLabel = (filename) => {
    if (!filename) return "DOC";
    const ext = filename.split(".").pop()?.toUpperCase();
    return ext || "PDF";
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Label & Active Mode Tag */}
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
          {mode === "upload" ? "📁 Local Device" : "🔗 Online URL"}
        </span>
      </div>

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode("upload");
            setError("");
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mode === "upload"
              ? "bg-white text-[#1e3a8a] shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>📁</span>
          <span>Upload from Device</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("url");
            setError("");
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mode === "url"
              ? "bg-white text-[#1e3a8a] shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>🔗</span>
          <span>Paste Resume URL</span>
        </button>
      </div>

      {/* Mode 1: Upload from Device */}
      {mode === "upload" && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            id="resume-device-file-input"
          />

          {!selectedFile && !value ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#1e3a8a] hover:bg-blue-50/20 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 flex flex-col items-center justify-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-lg mb-2 group-hover:scale-105 transition-transform text-[#1e3a8a]">
                📤
              </div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drop resume file
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supported formats: <strong className="text-slate-700">PDF, DOC, DOCX</strong> (Up to 10 MB)
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e3a8a] border border-blue-100 flex items-center justify-center font-black text-xs shrink-0">
                  {getFileExtensionLabel(selectedFile?.name || value)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {selectedFile?.name || "Attached Resume Document"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "Saved on profile"}
                    {uploading ? (
                      <span className="text-amber-600 font-semibold ml-2 inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        Uploading to secure storage...
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-bold ml-2">✓ Uploaded & Ready</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {value && (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-[11px] font-bold text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition"
                  >
                    View ↗
                  </a>
                )}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-200"
                >
                  Change
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleClearSelection}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Paste Resume URL */}
      {mode === "url" && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              required={required && !value}
              value={urlInput}
              onChange={handleUrlChange}
              onBlur={handleUrlBlur}
              placeholder="https://drive.google.com/... or https://..."
              className={`w-full h-10 pl-9 pr-3 rounded-xl border text-xs font-medium outline-none transition ${
                !isUrlValid
                  ? "border-rose-300 focus:ring-2 focus:ring-rose-500/10"
                  : "border-slate-200 focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
              }`}
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔗</span>
            {urlInput && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            For Google Drive or Dropbox links, make sure sharing is set to <strong className="text-slate-700">"Anyone with the link can view"</strong>.
          </p>
        </div>
      )}

      {/* Error Message Alert */}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 animate-fade-in">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Optional Helper Text */}
      {/* Hidden input for native HTML form validation */}
      {required && (
        <input
          type="text"
          value={value || ""}
          required={required}
          onChange={() => {}}
          className="sr-only pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
