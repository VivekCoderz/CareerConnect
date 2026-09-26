import React, { useState, useEffect, useCallback } from "react";
import {
  getAssessments,
  deleteAssessment,
  scheduleAssessmentRound,
} from "../../services/recruitmentService";
import AssessmentBuilder from "./AssessmentBuilder";
import AssessmentScoreboard from "./AssessmentScoreboard";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Code2,
  FileText,
  Mic,
  Briefcase,
  Users,
  Award,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Trash2,
  Edit3,
  BarChart3,
  Sparkles,
  RefreshCw,
  X,
  Layers,
  HelpCircle,
} from "lucide-react";

// ─── Assessment Type Styling Configurations ─────────────────────────────────
const TYPE_CONFIG = {
  MCQ: {
    label: "MCQ Test",
    badgeBg: "bg-indigo-50 border-indigo-200 text-indigo-700",
    iconBg: "bg-indigo-100 text-indigo-600",
    borderLeft: "border-l-indigo-600",
    Icon: FileText,
    accent: "indigo",
  },
  Coding: {
    label: "Coding Test",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-600",
    borderLeft: "border-l-emerald-600",
    Icon: Code2,
    accent: "emerald",
  },
  Communication: {
    label: "Communication",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
    borderLeft: "border-l-amber-500",
    Icon: Mic,
    accent: "amber",
  },
};

const STATUS_CONFIG = {
  Active: { label: "Active", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Scheduled: { label: "Scheduled", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  Draft: { label: "Draft", bg: "bg-slate-100 text-slate-600 border-slate-200" },
  Completed: { label: "Completed", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  Archived: { label: "Archived", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

// ─── Schedule Modal Component ────────────────────────────────────────────────
const ScheduleModal = ({ assessment, onClose, onSave }) => {
  const [scheduledAt, setScheduledAt] = useState(
    assessment.scheduledAt ? new Date(assessment.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const [deadline, setDeadline] = useState(
    assessment.deadline ? new Date(assessment.deadline).toISOString().slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!scheduledAt) {
      setError("Please set a start date & time.");
      return;
    }
    setSaving(true);
    try {
      await onSave(assessment._id, { scheduledAt, deadline: deadline || undefined });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to schedule assessment round");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-scale-up">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Schedule Round {assessment.round}
              </h3>
              <p className="text-xs text-slate-500">Set start window & deadline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <p className="font-semibold text-slate-800">{assessment.title}</p>
            <p className="text-slate-500 mt-0.5">
              Round {assessment.round} · {assessment.assessmentType} Test
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assessment Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">Candidates can start from this time</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Submission Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">Test will close after this date & time</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 disabled:opacity-60 transition"
            >
              {saving ? "Scheduling..." : "Confirm Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modern Round Card Component ─────────────────────────────────────────────
const RoundCard = ({ assessment, onEdit, onDelete, onSchedule, onViewScores, isDeleting }) => {
  const typeCfg = TYPE_CONFIG[assessment.assessmentType] || TYPE_CONFIG.MCQ;
  const TypeIcon = typeCfg.Icon;
  const statusCfg = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.Active;

  const submissions = assessment.submissionStats?.total || 0;
  const passed = assessment.submissionStats?.passed || 0;
  const passRate = submissions > 0 ? Math.round((passed / submissions) * 100) : 0;

  const itemCount =
    assessment.assessmentType === "MCQ"
      ? assessment.questions?.length || 0
      : assessment.assessmentType === "Coding"
      ? assessment.codingProblems?.length || 0
      : assessment.communicationPrompts?.length || 0;

  const itemLabel =
    assessment.assessmentType === "MCQ"
      ? "questions"
      : assessment.assessmentType === "Coding"
      ? "coding problems"
      : "prompts";

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col border-l-4 ${typeCfg.borderLeft}`}>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Row: Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold tracking-tight">
                Round {assessment.round}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${typeCfg.badgeBg}`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {typeCfg.label}
              </span>
              {assessment.roundLabel && (
                <span className="text-xs font-semibold text-slate-500">
                  · {assessment.roundLabel}
                </span>
              )}
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.bg}`}>
              {statusCfg.label}
            </span>
          </div>

          {/* Title & Description */}
          <h4 className="text-base font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition cursor-pointer" onClick={() => onEdit(assessment)}>
            {assessment.title}
          </h4>

          {assessment.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {assessment.description}
            </p>
          )}

          {/* Job & Meta Details Strip */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
            {assessment.jobId?.title ? (
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>{assessment.jobId.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open for all candidates</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{assessment.timeLimitMinutes || 30} mins</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              <span>Pass: {assessment.passingScorePercentage || 70}%</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 font-medium">
              <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{itemCount} {itemLabel}</span>
            </div>
          </div>
        </div>

        {/* Submissions & Performance Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {submissions} {submissions === 1 ? "Candidate" : "Candidates"}
            </span>
            {submissions > 0 && (
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {passRate}% Pass Rate
              </span>
            )}
          </div>

          {assessment.scheduledAt && (
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              <Calendar className="w-3 h-3" />
              <span>{new Date(assessment.scheduledAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewScores(assessment._id)}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Candidate Results ({submissions})</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSchedule(assessment)}
            title="Schedule window"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition flex items-center gap-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(assessment)}
            title="Edit round details"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(assessment._id)}
            disabled={isDeleting}
            title="Delete round"
            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main AssessmentHub Component ───────────────────────────────────────────
const AssessmentHub = ({ jobs = [], initialJobId = "all", onToast }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || "all");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // View state: "list" | "builder" | "scoreboard"
  const [view, setView] = useState("list");
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [scoreboardAssessmentId, setScoreboardAssessmentId] = useState(null);
  const [schedulingAssessment, setSchedulingAssessment] = useState(null);

  // Sync initialJobId prop changes
  useEffect(() => {
    if (initialJobId) {
      setSelectedJobId(initialJobId);
    }
  }, [initialJobId]);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedJobId && selectedJobId !== "all") params.jobId = selectedJobId;
      if (filterType !== "All") params.assessmentType = filterType;
      const res = await getAssessments(params);
      setAssessments(res.assessments || []);
    } catch {
      onToast?.("Failed to load assessments", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, filterType, onToast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assessment round? All candidate results will also be deleted.")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteAssessment(id);
      setAssessments((prev) => prev.filter((a) => a._id !== id));
      onToast?.("Assessment round deleted", "success");
    } catch {
      onToast?.("Failed to delete assessment", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleScheduleSave = async (id, scheduleData) => {
    const res = await scheduleAssessmentRound(id, scheduleData);
    setAssessments((prev) =>
      prev.map((a) => (a._id === id ? { ...a, ...res.assessment, status: "Scheduled" } : a))
    );
    onToast?.("Assessment round scheduled successfully", "success");
  };

  // Aggregated Stats
  const totalRounds = assessments.length;
  const totalSubmissions = assessments.reduce(
    (acc, a) => acc + (a.submissionStats?.total || 0),
    0
  );
  const totalPassed = assessments.reduce(
    (acc, a) => acc + (a.submissionStats?.passed || 0),
    0
  );
  const overallPassRate =
    totalSubmissions > 0 ? Math.round((totalPassed / totalSubmissions) * 100) : 0;
  const scheduledCount = assessments.filter(
    (a) => a.status === "Scheduled" || a.scheduledAt
  ).length;

  // Selected Job metadata
  const selectedJob = jobs.find((j) => j._id === selectedJobId);

  // Filtered assessment cards by search and status
  const displayedAssessments = assessments.filter((a) => {
    if (filterStatus !== "All" && a.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      const matchJob = a.jobId?.title?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchJob) return false;
    }
    return true;
  });

  // If in Builder view
  if (view === "builder") {
    return (
      <AssessmentBuilder
        jobs={jobs}
        editData={
          editingAssessment
            ? editingAssessment
            : selectedJobId !== "all"
            ? { jobId: selectedJobId }
            : null
        }
        onCancel={() => {
          setView("list");
          setEditingAssessment(null);
        }}
        onSaved={() => {
          setView("list");
          setEditingAssessment(null);
          fetchAssessments();
          onToast?.("Assessment round saved successfully!", "success");
        }}
        onToast={onToast}
      />
    );
  }

  // If in Scoreboard view
  if (view === "scoreboard") {
    return (
      <AssessmentScoreboard
        assessmentId={scoreboardAssessmentId}
        onBack={() => {
          setView("list");
          setScoreboardAssessmentId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ── Top Header Strip ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Recruitment Assessment Suite
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Multi-Round Assessment Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create, schedule, and grade MCQ, Coding, and Communication rounds for your jobs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAssessments}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh assessments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAssessment(null);
              setView("builder");
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 flex items-center gap-2 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment Round</span>
          </button>
        </div>
      </div>

      {/* ── Contextual Job Banner (if a job is pre-selected) ──────────────── */}
      {selectedJob && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Job:
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {selectedJob.title}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold">
                  {selectedJob.employmentType || "Full-time"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-bold">
                  {selectedJob.status || "Published"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing assessment rounds configured specifically for this role.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingAssessment({ jobId: selectedJob._id });
                setView("builder");
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Round for this Job</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedJobId("all")}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
            >
              View All Jobs
            </button>
          </div>
        </div>
      )}

      {/* ── Modern Overview Metric Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {totalRounds}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total Rounds</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {totalSubmissions}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Submissions</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {overallPassRate}%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Avg Pass Rate</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 leading-none">
              {scheduledCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Scheduled</div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Control Bar ───────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rounds or jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
            />
          </div>

          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Jobs ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessment Type Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "MCQ", "Coding", "Communication"].map((type) => {
            const isSelected = filterType === type;
            const Icon =
              type === "MCQ"
                ? FileText
                : type === "Coding"
                ? Code2
                : type === "Communication"
                ? Mic
                : Layers;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{type === "All" ? "All Types" : type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Round Cards Grid / Content ────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading assessment rounds...</p>
        </div>
      ) : displayedAssessments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {selectedJobId !== "all"
              ? `No assessments created yet for "${selectedJob?.title || "this job"}"`
              : "No Assessment Rounds Found"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Create multi-round technical assessments (MCQ screening, algorithmic coding, or communication prompts) to evaluate your applicants automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setEditingAssessment(
                  selectedJobId !== "all"
                    ? { jobId: selectedJobId, assessmentType: "MCQ" }
                    : { assessmentType: "MCQ" }
                );
                setView("builder");
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <FileText className="w-4 h-4" />
              <span>+ Create MCQ Test</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAssessment(
                  selectedJobId !== "all"
                    ? { jobId: selectedJobId, assessmentType: "Coding" }
                    : { assessmentType: "Coding" }
                );
                setView("builder");
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Code2 className="w-4 h-4" />
              <span>+ Create Coding Challenge</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAssessment(
                  selectedJobId !== "all"
                    ? { jobId: selectedJobId, assessmentType: "Communication" }
                    : { assessmentType: "Communication" }
                );
                setView("builder");
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Mic className="w-4 h-4" />
              <span>+ Create Communication Round</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedAssessments.map((a) => (
            <RoundCard
              key={a._id}
              assessment={a}
              onEdit={(data) => {
                setEditingAssessment(data);
                setView("builder");
              }}
              onDelete={handleDelete}
              onSchedule={(item) => setSchedulingAssessment(item)}
              onViewScores={(id) => {
                setScoreboardAssessmentId(id);
                setView("scoreboard");
              }}
              isDeleting={deletingId === a._id}
            />
          ))}
        </div>
      )}

      {/* ── Schedule Modal ─────────────────────────────────────────────────── */}
      {schedulingAssessment && (
        <ScheduleModal
          assessment={schedulingAssessment}
          onClose={() => setSchedulingAssessment(null)}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  );
};

export default AssessmentHub;
