import React, { useState } from "react";
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
} from "lucide-react";

/**
 * ContentCard
 * Displays individual course content item (Video, PDF notes, Text lesson)
 * for Employee (management) and Student (learning view).
 */
const ContentCard = ({
  item,
  index,
  isEmployee = true,
  isStudent = false,
  isCompleted = false,
  onEdit,
  onDelete,
  onMarkComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  if (!item) return null;

  const {
    _id,
    type = "notes",
    title = "Untitled Lesson",
    description,
    url,
    content,
    duration,
    section = "General",
    order = 1,
  } = item;

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

  return (
    <div
      className={`p-4 rounded-2xl bg-white border transition-all duration-200 shadow-xs hover:shadow-md ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/20"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Icon & Main Metadata */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${typeConfig.bg}`}
          >
            {typeConfig.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold text-slate-400">
                #{order}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${typeConfig.bg}`}
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
            </div>

            <h4 className="text-sm font-bold text-slate-900 truncate">
              {title}
            </h4>

            {description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* View / Open Resource */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {type === "video" ? <Play size={13} /> : <Download size={13} />}
              <span>{type === "video" ? "Watch Video" : "Download PDF"}</span>
            </a>
          )}

          {/* Notes Content Expand Toggle */}
          {type === "notes" && content && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 transition-colors border border-amber-200/70"
            >
              <Eye size={13} />
              <span>{isExpanded ? "Hide Notes" : "Read Notes"}</span>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          {/* Student Complete Action */}
          {isStudent && (
            <button
              type="button"
              onClick={() => onMarkComplete && onMarkComplete(_id)}
              disabled={isCompleted}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800 cursor-default"
                  : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>{isCompleted ? "Completed" : "Mark Complete"}</span>
            </button>
          )}

          {/* Employee Edit / Delete Actions */}
          {isEmployee && (
            <div className="flex items-center gap-1">
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
      </div>

      {/* Expanded Notes Body */}
      {isExpanded && type === "notes" && content && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 leading-relaxed bg-amber-50/40 p-3.5 rounded-xl whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
};

export default ContentCard;
