import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchLiveResumeAPI, setLiveResumeSharingAPI } from "../../services/resumeService";
import ResumePreview from "../../components/resume-builder/ResumePreview";
import BrandLogo from "../../components/common/BrandLogo";
import JourneyLoader from "../../components/common/JourneyLoader";
import { openResume } from "../../utils/resumeAccess";
import {
  Printer,
  Copy,
  Check,
  Edit3,
  Sparkles,
  Download,
  AlertCircle,
} from "lucide-react";

const TEMPLATES = [
  { id: "classic", name: "Classic", badge: "ATS Standard" },
  { id: "modern", name: "Modern", badge: "Tech & Product" },
  { id: "minimal", name: "Minimal", badge: "Clean & Elegant" },
  { id: "executive", name: "Executive", badge: "Leadership" },
  { id: "compact", name: "Compact", badge: "Developer" },
  { id: "bold", name: "Bold", badge: "Creative" },
];

const LiveResume = () => {
  const { id } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);

  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [copied, setCopied] = useState(false);
  // Only the owner's own page (/live-resume) can turn the public link on or off.
  const isOwnerView = !id;
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadLiveResume = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchLiveResumeAPI(id || null);
        if (res?.success && res?.resume) {
          if (isMounted) {
            setResumeData(res.resume);
            setShared(Boolean(res.shared));
            if (res.resume.selectedTemplate) {
              setSelectedTemplate(res.resume.selectedTemplate);
            }
          }
        } else {
          if (isMounted) {
            setError(res?.message || "Live resume could not be found.");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Live resume fetch error:", err);
          setError(
            err.response?.data?.message ||
              "Could not load live resume. Please ensure the link is valid or log in to view your resume."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLiveResume();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCopyLink = async () => {
    const resumeId = String(resumeData?._id || id || "");
    const cleanId = resumeId.startsWith("profile_") ? resumeId.replace("profile_", "") : resumeId;
    const shareUrl = `${window.location.origin}/live-resume/${cleanId}`;

    // The link only works for others once sharing is on, so the owner turns it on here.
    if (isOwnerView && !shared) {
      try {
        await setLiveResumeSharingAPI(true);
        setShared(true);
        setShareError("");
      } catch (err) {
        setShareError(err.response?.data?.message || "Could not turn on sharing. Please try again.");
        return;
      }
    }

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleStopSharing = async () => {
    try {
      await setLiveResumeSharingAPI(false);
      setShared(false);
      setShareError("");
    } catch (err) {
      setShareError(err.response?.data?.message || "Could not turn off sharing. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Check if current logged-in user owns this resume
  const isOwner =
    currentUser &&
    resumeData?.user &&
    (currentUser._id === resumeData.user._id || currentUser.id === resumeData.user._id);

  // Normalize display payload for ResumePreview
  const renderPayload =
    resumeData?.generatedData ||
    resumeData?.rawData ||
    (resumeData
      ? {
          personal: resumeData.personal || {
            fullName: resumeData.user?.fullName || "Candidate",
            email: resumeData.user?.email || "",
          },
        }
      : null);

  const candidateName =
    renderPayload?.personal?.fullName ||
    resumeData?.user?.fullName ||
    "Professional Candidate";

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-sans antialiased flex flex-col">
      {/* ── Top Floating Action Bar (Hidden on Print) ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="shrink-0 flex items-center gap-2">
              <BrandLogo markOnly className="h-7 w-8 sm:hidden" />
              <BrandLogo className="hidden h-7 w-40 sm:block" />
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Live Resume
              </span>
              {resumeData && (
                <span className="text-xs font-semibold text-slate-700 truncate hidden lg:block">
                  {candidateName}
                </span>
              )}
            </div>
          </div>

          {/* Template picker and actions only once a resume is loaded. */}
          {resumeData && (
            <>
          {/* Center: Template Picker */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            {TEMPLATES.slice(0, 4).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedTemplate === t.id
                    ? "bg-white text-indigo-600 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
                title={t.badge}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
              title="Copy public link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Share Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {resumeData?.resumeUrl && (
              <button
                type="button"
                onClick={() => openResume(resumeData.resumeUrl)}
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
                title="Download original uploaded PDF"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>PDF</span>
              </button>
            )}

            {isOwner && (
              <Link
                to="/resume-builder"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Edit in Resume Studio"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Edit Resume</span>
              </Link>
            )}
          </div>
            </>
          )}
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 no-print">
            <JourneyLoader variant="resume" size="lg" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">Rendering Live Resume...</p>
              <p className="text-xs text-slate-400 mt-0.5">Fetching verified profile & formatted layout</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-16 max-w-md mx-auto text-center space-y-4 no-print">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Resume Not Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/resume-builder"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
              >
                Create a Resume
              </Link>
              <Link
                to="/"
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* Live Resume Content */}
        {resumeData && !loading && (
          <>
            {/* Top Info Banner (Hidden on Print) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  📄
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900">{candidateName}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {resumeData.title || "Professional Live Resume"} · Real-time web rendering
                  </p>
                </div>
              </div>

              {/* Mobile Template Selector */}
              <div className="sm:hidden flex items-center gap-1 overflow-x-auto pb-1">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${
                      selectedTemplate === t.id
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume Sheet Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-10 lg:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none">
              <ResumePreview
                data={renderPayload}
                templateId={selectedTemplate}
              />
            </div>

            {/* Footer Attribution (Hidden on Print) */}
            <div className="text-center py-4 text-xs text-slate-400 space-y-1 no-print">
              <p>
                Live resume on{" "}
                <Link to="/" className="font-semibold text-slate-600 hover:text-indigo-600 transition">
                  E2Job
                </Link>
              </p>
              {isOwnerView && (
                <p className="text-[11px] text-slate-400">
                  {shared
                    ? "Sharing is on: anyone with your link can see this resume, including your email and phone."
                    : "Sharing is off: only you can see this page. Share Link turns it on."}
                  {shared && (
                    <button type="button" onClick={handleStopSharing} className="ml-2 font-semibold text-rose-600 hover:underline">
                      Stop sharing
                    </button>
                  )}
                </p>
              )}
              {shareError && <p className="text-[11px] text-rose-600">{shareError}</p>}
            </div>
          </>
        )}
      </main>

      {/* ── Print Stylesheet ── */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body, html {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveResume;
