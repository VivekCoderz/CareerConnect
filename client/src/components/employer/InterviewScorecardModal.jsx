import React, { useState, useEffect } from "react";

const ScoreCriteriaRow = ({ label, description, icon, value, onChange }) => {
  return (
    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{label}</h4>
            <p className="text-[10.5px] text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
            {value > 0 ? `${value} / 5` : "Unrated"}
          </span>
        </div>
      </div>

      {/* 5-Star / Point selector */}
      <div className="flex items-center gap-1.5 pt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
              value >= star
                ? "bg-amber-400 border-amber-500 text-slate-900 shadow-2xs"
                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
            }`}
          >
            <span>★</span>
            <span className="text-[11px] font-mono">{star}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const InterviewScorecardModal = ({
  isOpen,
  onClose,
  interview,
  onSubmitScorecard,
}) => {
  const [ratings, setRatings] = useState({
    technicalSkills: 4,
    communication: 4,
    problemSolving: 4,
    overallPerformance: 4,
  });

  const [overallFeedback, setOverallFeedback] = useState("");
  const [result, setResult] = useState("Next Round"); // "Selected" | "Rejected" | "Next Round" | "Pending"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (interview?.scorecard || interview?.feedback) {
      const sc = interview.scorecard || {};
      const fb = interview.feedback || {};
      setRatings({
        technicalSkills: sc.technicalSkills || fb.technicalScore || 4,
        communication: sc.communication || fb.communicationScore || 4,
        problemSolving: sc.problemSolving || fb.problemSolvingScore || 4,
        overallPerformance: sc.overallPerformance || fb.overallPerformance || sc.cultureFit || 4,
      });
      setOverallFeedback(sc.overallFeedback || sc.feedback || fb.overallFeedback || fb.comments || "");
      
      const currentRes = (interview.result || sc.recommendation || "").toLowerCase();
      if (currentRes.includes("select")) setResult("Selected");
      else if (currentRes.includes("reject") || currentRes === "failed") setResult("Rejected");
      else if (currentRes.includes("next") || currentRes === "passed") setResult("Next Round");
      else setResult("Pending");
    } else {
      setRatings({
        technicalSkills: 4,
        communication: 4,
        problemSolving: 4,
        overallPerformance: 4,
      });
      setOverallFeedback("");
      setResult("Next Round");
    }
  }, [interview]);

  if (!isOpen || !interview) return null;

  const candidateName =
    interview.candidateId?.fullName ||
    interview.applicationId?.studentName ||
    "Candidate";
  const jobTitle =
    interview.jobId?.title ||
    interview.internshipId?.title ||
    interview.applicationId?.opportunityTitle ||
    "Role";
  const roundName =
    interview.roundName ||
    `Round ${interview.roundNumber || 1} - ${interview.interviewType || "Interview"}`;

  // Composite calculation
  const { technicalSkills, communication, problemSolving, overallPerformance } = ratings;
  const ratingValues = [technicalSkills, communication, problemSolving, overallPerformance].filter(
    (v) => typeof v === "number" && v > 0
  );
  const compositeScore =
    ratingValues.length > 0
      ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
      : "0.0";

  const handleRatingChange = (key, val) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const normalizedResult =
        result === "Selected"
          ? "selected"
          : result === "Rejected"
          ? "rejected"
          : result === "Next Round"
          ? "next_round"
          : "pending";

      const payload = {
        technicalSkills: Number(ratings.technicalSkills),
        communication: Number(ratings.communication),
        problemSolving: Number(ratings.problemSolving),
        overallPerformance: Number(ratings.overallPerformance),
        overallScore: Number(compositeScore),
        overallFeedback: overallFeedback.trim(),
        feedback: overallFeedback.trim(),
        comments: overallFeedback.trim(),
        result: normalizedResult,
        recommendation: result,
        markSelected: result === "Selected",
        scorecard: {
          technicalSkills: Number(ratings.technicalSkills),
          communication: Number(ratings.communication),
          problemSolving: Number(ratings.problemSolving),
          overallPerformance: Number(ratings.overallPerformance),
          overallScore: Number(compositeScore),
          overallFeedback: overallFeedback.trim(),
          feedback: overallFeedback.trim(),
          recommendation: result,
        },
      };

      await onSubmitScorecard(interview._id, payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit interview feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-slide-in-top my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center text-lg font-black">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Interview Feedback & Result</h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {roundName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Candidate: <strong className="text-slate-800">{candidateName}</strong> • {jobTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Composite Score Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Overall Average Rating
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{compositeScore}</span>
                <span className="text-xs font-bold text-slate-500">/ 5.0</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Evaluator: <br />
              <strong className="text-slate-800">{interview.interviewerName || "Lead Recruiter"}</strong>
            </div>
          </div>

          {/* Competency Ratings */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Evaluation Criteria (1 - 5 Stars)
            </h4>

            <ScoreCriteriaRow
              label="Technical Skills"
              description="Core domain knowledge, hands-on coding, and technical depth"
              icon="💻"
              value={ratings.technicalSkills}
              onChange={(val) => handleRatingChange("technicalSkills", val)}
            />

            <ScoreCriteriaRow
              label="Communication"
              description="Clarity of thought, articulation, structured responses, and active listening"
              icon="🗣️"
              value={ratings.communication}
              onChange={(val) => handleRatingChange("communication", val)}
            />

            <ScoreCriteriaRow
              label="Problem Solving"
              description="Analytical thinking, logic, handling edge cases, and approach to ambiguity"
              icon="🧩"
              value={ratings.problemSolving}
              onChange={(val) => handleRatingChange("problemSolving", val)}
            />

            <ScoreCriteriaRow
              label="Overall Performance"
              description="Composure, professional attitude, cultural fit, and execution efficiency"
              icon="⭐"
              value={ratings.overallPerformance}
              onChange={(val) => handleRatingChange("overallPerformance", val)}
            />
          </div>

          {/* Overall Feedback */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Overall Feedback *
            </label>
            <textarea
              rows={3}
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Provide constructive feedback on candidate performance, key strengths, and recommendations..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium outline-none focus:border-[#1e3a8a]"
              required
            />
          </div>

          {/* Result Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Interview Result *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "Selected", label: "Selected", icon: "🏆", desc: "Offer candidate", color: "hover:border-emerald-500" },
                { id: "Next Round", label: "Next Round", icon: "➡️", desc: "Advance pipeline", color: "hover:border-blue-500" },
                { id: "Pending", label: "Pending", icon: "⏳", desc: "Review later", color: "hover:border-amber-500" },
                { id: "Rejected", label: "Rejected", icon: "❌", desc: "Do not advance", color: "hover:border-rose-500" },
              ].map((resOption) => (
                <button
                  key={resOption.id}
                  type="button"
                  onClick={() => setResult(resOption.id)}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer ${
                    result === resOption.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                      : `bg-white text-slate-700 border-slate-200 ${resOption.color}`
                  }`}
                >
                  <span className="text-base">{resOption.icon}</span>
                  <span className="text-xs font-bold leading-tight">{resOption.label}</span>
                  <span className={`text-[9.5px] ${result === resOption.id ? "text-slate-300" : "text-slate-400"}`}>
                    {resOption.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Feedback..." : "Submit Feedback & Result"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewScorecardModal;
