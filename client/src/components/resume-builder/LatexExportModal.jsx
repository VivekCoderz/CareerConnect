import React, { useState, useMemo } from "react";
import {
  generateLatexCode,
  downloadLatexFile,
  copyLatexToClipboard,
} from "../../utils/latexResumeGenerator";

const LatexExportModal = ({ isOpen, onClose, resumeData, resumeTitle = "resume" }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const latexCode = useMemo(() => {
    if (!resumeData) return "";
    return generateLatexCode(resumeData);
  }, [resumeData]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyLatexToClipboard(latexCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    const safeTitle = (resumeTitle || "resume")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_");
    const filename = `${safeTitle}.tex`;
    const success = downloadLatexFile(resumeData, filename);
    if (success) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2200);
    }
  };

  const handleOpenOverleaf = () => {
    window.open("https://www.overleaf.com/project", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-base shadow-sm">
              T<sub className="text-[10px] -ml-0.5">E</sub>X
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">LaTeX Resume Export</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  100% ATS Safe
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard single-page format ready for Overleaf, TeX Live, or MiKTeX
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer text-lg font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 text-xs text-blue-900 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>
              <strong>Pro-Tip:</strong> Overleaf par <strong>New Project &gt; Blank Project</strong> bana kar is code ko paste karein aur instant PDF download karein.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenOverleaf}
            className="text-blue-700 hover:text-blue-900 font-bold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Open Overleaf</span>
            <span>↗</span>
          </button>
        </div>

        {/* Code Preview Area */}
        <div className="p-6 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-400 relative selection:bg-blue-600 selection:text-white">
          <div className="absolute top-3 right-5 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>

          <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11.5px] font-mono text-slate-200 pr-28">
            {latexCode || "% No resume content available."}
          </pre>
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Single column layout · Harvard / FAANG standard</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "Copied to Clipboard" : "Copy LaTeX"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ${
                downloaded
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-98 text-white"
              }`}
            >
              <span>{downloaded ? "✓" : "📥"}</span>
              <span>{downloaded ? "Downloaded!" : "Download .tex"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LatexExportModal;
