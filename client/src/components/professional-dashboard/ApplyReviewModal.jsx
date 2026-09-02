import { useState } from "react";

const ApplyReviewModal = ({
  isOpen,
  onClose,
  opportunity,
  user,
  profile,
  onSubmitDirect,
  onContinueExternal,
}) => {
  const [coverNote, setCoverNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !opportunity) return null;

  const candidateName = user?.fullName || profile?.userId?.fullName || profile?.fullName || "Imran";
  const professionalHeadline =
    profile?.currentEmployment?.jobTitle ||
    profile?.professionalHeadline ||
    "Senior Software Engineer";
  const experienceYears = profile?.totalExperienceYears ? `${profile.totalExperienceYears}+ Years` : "4+ Years";

  const isExternal = opportunity.isExternal || opportunity.applyType === "external" || opportunity.url?.startsWith("http");
  const companyName = opportunity.company || opportunity.companyName || "Technology Enterprise";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isExternal) {
      if (onContinueExternal) {
        onContinueExternal(opportunity, coverNote);
      }
    } else {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSubmitDirect) {
          onSubmitDirect(opportunity, coverNote);
        }
      }, 400);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isExternal
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isExternal ? "🔵 Apply on Company Website" : "🟢 Direct Apply via CareerConnect"}
              </span>
              <span className="text-xs text-slate-400">· {opportunity.location || "Remote"}</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {opportunity.title}
            </h2>
            <p className="text-sm font-bold text-purple-700 mt-0.5">
              {companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Application Review Details */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Snapshot */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Candidate Profile
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{candidateName}</p>
                <p className="text-xs text-slate-600 font-medium">
                  {professionalHeadline} · {experienceYears} Experience
                </p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                {opportunity.matchPercentage || 92}% Match
              </span>
            </div>
          </div>

          {/* Attached Resume */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                📄
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {candidateName.replace(/\s+/g, "_")}_Executive_Resume.pdf
                </span>
                <span className="text-[11px] text-purple-800 font-semibold flex items-center gap-1">
                  <span>✓</span> ATS Optimized & Verified
                </span>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-purple-700">Auto-Attached</span>
          </div>

          {/* Optional Cover Note */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Leadership & Impact Note <span className="text-slate-400 font-normal">(Optional)</span></span>
              <span className="text-[10px] text-slate-400">Sent directly to hiring manager</span>
            </label>
            <textarea
              rows={3}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Highlight any relevant architectural decisions, scale handled, or leadership accomplishments..."
              className="w-full p-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-xs outline-none transition placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                isExternal
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  : "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : isExternal ? (
                <>
                  <span>Continue to Company Website</span>
                  <span>↗</span>
                </>
              ) : (
                <>
                  <span>Submit Application</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyReviewModal;
