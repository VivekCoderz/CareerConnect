import React, { useState, useRef } from "react";
import {
  Video,
  FileText,
  BookOpen,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  Play,
  Download,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  RotateCcw,
  Gauge,
  Maximize2,
} from "lucide-react";

/**
 * Helper to ensure Cloudinary video URLs have .mp4 for native browser playback
 */
const getCleanVideoUrl = (rawUrl) => {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  if (url.includes("res.cloudinary.com") && url.includes("/video/upload/")) {
    if (!url.match(/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i)) {
      const parts = url.split("?");
      url = `${parts[0]}.mp4${parts[1] ? "?" + parts[1] : ""}`;
    }
  }
  return url;
};

/**
 * Helper to detect YouTube / Vimeo / Drive / Direct Video format
 */
const parseVideoUrl = (rawUrl, contentId) => {
  if (!rawUrl) return { type: "unknown", embedUrl: "", url: "" };
  const url = rawUrl.trim();
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverBase = apiBase.replace(/\/api\/?$/, "");

  // 1. YouTube match
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&controls=1&rel=0`,
      url,
    };
  }

  // 2. Vimeo match
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      url,
    };
  }

  // 3. Google Drive match
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return {
      type: "drive",
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      url,
    };
  }

  // 4. Local file path in uploads/ (e.g. /uploads/courses/xyz.mp4 or uploads/courses/xyz.mp4)
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    if (contentId) {
      return {
        type: "direct",
        embedUrl: `${apiBase}/course-content/${contentId}/view-video`,
        url: `${apiBase}/course-content/${contentId}/view-video`,
      };
    }
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return {
      type: "direct",
      embedUrl: `${serverBase}${cleanPath}`,
      url: `${serverBase}${cleanPath}`,
    };
  }

  // 5. Cloudinary video stream URL
  if (url.includes("res.cloudinary.com") && url.includes("/video/upload/")) {
    let cleanCloudinary = url;
    if (!cleanCloudinary.match(/\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i)) {
      const parts = cleanCloudinary.split("?");
      cleanCloudinary = `${parts[0]}.mp4${parts[1] ? "?" + parts[1] : ""}`;
    }
    return {
      type: "direct",
      embedUrl: cleanCloudinary,
      url: cleanCloudinary,
    };
  }

  // 6. Generic direct video fallback
  const fallbackUrl = contentId
    ? `${apiBase}/course-content/${contentId}/view-video`
    : url;

  return {
    type: "direct",
    embedUrl: fallbackUrl,
    url,
  };
};

/**
 * ContentCard Component
 * Displays individual course content item (Video, PDF notes, Text lesson)
 * Supports:
 * - Direct inline video playback with full native controls (Play/Pause, Seek, Volume, Fullscreen, Speed)
 * - YouTube, Vimeo, Google Drive & Cloudinary video auto-detection
 * - 401-safe PDF viewing & inline document preview via backend viewer
 * - Rich notes viewer
 * - Student completion toggling & Employer edit/delete
 */
const ContentCard = ({
  item,
  index,
  isEmployee = false,
  isStudent = true,
  isCompleted = false,
  isLocked = false,
  onEdit,
  onDelete,
  onMarkComplete,
}) => {
  const [isExpandedNotes, setIsExpandedNotes] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const videoRef = useRef(null);

  if (!item) return null;

  const {
    _id,
    type = "notes",
    title = "Untitled Lesson",
    description,
    url,
    content,
    duration = 0,
    section = "General",
    order = 1,
  } = item;

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const pdfViewUrl = _id ? `${apiBase}/course-content/${_id}/view-pdf` : url;
  const videoInfo = type === "video" ? parseVideoUrl(url, _id) : null;

  // Icon & Type styling
  const getTypeBadge = () => {
    switch (type) {
      case "video":
        return {
          icon: <Video size={18} className="text-[#1e3a8a]" />,
          bg: "bg-blue-50 border-blue-200 text-[#1e3a8a]",
          label: "Video Lecture",
        };
      case "pdf":
        return {
          icon: <FileText size={18} className="text-rose-700" />,
          bg: "bg-rose-50 border-rose-200 text-rose-700",
          label: "PDF Resource",
        };
      case "notes":
      default:
        return {
          icon: <BookOpen size={18} className="text-amber-800" />,
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          label: "Text Notes",
        };
    }
  };

  const typeConfig = getTypeBadge();

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleRestartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 shadow-xs hover:shadow-md ${
        isLocked
          ? "border-slate-200 bg-slate-50/70 opacity-80"
          : isCompleted
          ? "border-emerald-200 bg-emerald-50/20"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Icon & Main Metadata */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${
              isLocked ? "bg-slate-100 border-slate-200 text-slate-400" : typeConfig.bg
            }`}
          >
            {isLocked ? <Lock size={18} className="text-slate-400" /> : typeConfig.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold text-slate-400">
                #{order || index + 1}
              </span>

              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                  isLocked ? "bg-slate-100 text-slate-500 border-slate-200" : typeConfig.bg
                }`}
              >
                {typeConfig.label}
              </span>

              {section && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
                  {section}
                </span>
              )}

              {duration > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Clock size={12} />
                  {duration} mins
                </span>
              )}

              {isCompleted && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Completed
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
              <span>{title}</span>
              {isLocked && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  🔒 Locked (Enroll to Access)
                </span>
              )}
            </h4>

            {description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {!isLocked && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* Video Action: Show / Hide Video */}
            {type === "video" && url && (
              <button
                type="button"
                onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  isPlayingVideo
                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                    : "bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border-blue-200"
                }`}
              >
                <Play size={13} className={isPlayingVideo ? "fill-white" : "fill-[#1e3a8a]"} />
                <span>{isPlayingVideo ? "Hide Video" : "Show Video"}</span>
              </button>
            )}

            {/* PDF Actions: Direct View & Inline Preview Toggle */}
            {type === "pdf" && url && (
              <div className="flex items-center gap-1.5">
                <a
                  href={pdfViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200 shadow-xs"
                  title="Open PDF in new tab"
                >
                  <Download size={13} />
                  <span>View PDF</span>
                  <ExternalLink size={11} />
                </a>

                <button
                  type="button"
                  onClick={() => setIsPreviewingPdf(!isPreviewingPdf)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border ${
                    isPreviewingPdf
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                  title="Toggle inline document reader"
                >
                  <Eye size={13} />
                  <span>{isPreviewingPdf ? "Hide Preview" : "Preview"}</span>
                </button>
              </div>
            )}

            {/* Notes Content Expand Toggle */}
            {type === "notes" && content && (
              <button
                type="button"
                onClick={() => setIsExpandedNotes(!isExpandedNotes)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 transition-colors border border-amber-200/70"
              >
                <Eye size={13} />
                <span>{isExpandedNotes ? "Hide Notes" : "Read Notes"}</span>
                {isExpandedNotes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            {/* Student Complete Action */}
            {isStudent && (
              <button
                type="button"
                onClick={() => onMarkComplete && onMarkComplete(_id)}
                disabled={isCompleted}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default"
                    : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs"
                }`}
              >
                <CheckCircle2 size={14} />
                <span>{isCompleted ? "Completed ✓" : "Mark Complete"}</span>
              </button>
            )}

            {/* Employee Edit / Delete Actions */}
            {isEmployee && (
              <div className="flex items-center gap-1 ml-1 border-l pl-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(item)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 transition-colors"
                  title="Edit Content"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete && onDelete(_id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Delete Content"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── VIDEO INLINE PLAYER CONTAINER WITH ALL CONTROLLERS ── */}
      {!isLocked && isPlayingVideo && type === "video" && url && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
          {/* Header Bar above Video */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <Video size={14} className="text-[#1e3a8a]" />
              <span className="truncate">{title}</span>
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Playback Speed Controls for Direct HTML5 Video */}
              {videoInfo?.type === "direct" && (
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  <Gauge size={12} className="text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 mr-1">Speed:</span>
                  {[1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded transition-colors ${
                        playbackSpeed === s
                          ? "bg-[#1e3a8a] text-white"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}

              {videoInfo?.type === "direct" && (
                <button
                  type="button"
                  onClick={handleRestartVideo}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Replay from beginning"
                >
                  <RotateCcw size={14} />
                </button>
              )}

              <a
                href={videoInfo?.embedUrl || url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#1e3a8a] hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Full Tab</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Video Display Area */}
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-md flex items-center justify-center border border-slate-800">
            {videoInfo?.type === "youtube" ? (
              <iframe
                src={videoInfo.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : videoInfo?.type === "vimeo" ? (
              <iframe
                src={videoInfo.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : videoInfo?.type === "drive" ? (
              <iframe
                src={videoInfo.embedUrl}
                title={title}
                className="w-full h-full border-0"
                allow="autoplay"
                allowFullScreen
              />
            ) : (
              // HTML5 Direct Video Player (MP4 / Cloudinary Stream / WebM)
              <video
                ref={videoRef}
                key={videoInfo?.embedUrl || url}
                src={videoInfo?.embedUrl || url}
                controls
                playsInline
                preload="auto"
                controlsList="nodownload"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* ── INLINE PDF PREVIEW CONTAINER ── */}
      {!isLocked && isPreviewingPdf && type === "pdf" && url && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText size={14} className="text-rose-600" />
              <span>{title} (PDF Document)</span>
            </span>
            <a
              href={pdfViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-rose-700 hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Open in New Tab</span>
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="w-full h-96 sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
            <iframe
              src={pdfViewUrl}
              title={title}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* ── EXPANDED NOTES BODY ── */}
      {!isLocked && isExpandedNotes && type === "notes" && content && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen size={14} className="text-amber-700" />
              <span>Lesson Notes</span>
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(content);
                alert("Notes copied to clipboard!");
              }}
              className="text-[11px] font-bold text-amber-800 hover:underline"
            >
              Copy Text
            </button>
          </div>
          <div className="text-xs text-slate-800 leading-relaxed bg-amber-50/60 p-4 rounded-2xl whitespace-pre-wrap font-sans border border-amber-200/70 shadow-inner">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentCard;
