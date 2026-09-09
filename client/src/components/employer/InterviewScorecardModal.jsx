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
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
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
    problemSolving: 4,
    communication: 4,
    roleKnowledge: 4,
    cultureFit: 4,
  });

  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [recommendation, setRecommendation] = useState("Strong Hire");
  const [markSelected, setMarkSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (interview?.scorecard) {
      setRatings({
        technicalSkills: interview.scorecard.technicalSkills || 4,
        problemSolving: interview.scorecard.problemSolving || 4,
        communication: interview.scorecard.communication || 4,
        roleKnowledge: interview.scorecard.roleKnowledge || 4,
        cultureFit: interview.scorecard.cultureFit || 4,
      });
      setStrengths(interview.scorecard.strengths || "");
      setAreasForImprovement(interview.scorecard.areasForImprovement || "");
      setFeedbackNotes(interview.scorecard.feedback || "");
      setRecommendation(interview.scorecard.recommendation || "Strong Hire");
    } else if (interview?.feedback?.ratings) {
      setRatings({
        technicalSkills: interview.feedback.ratings.technicalSkills || 4,
        problemSolving: interview.feedback.ratings.problemSolving || 4,
        communication: interview.feedback.ratings.communication || 4,
        roleKnowledge: interview.feedback.ratings.systemDesign || interview.feedback.ratings.roleKnowledge || 4,
        cultureFit: interview.feedback.ratings.cultureFit || 4,
      });
      setStrengths(interview.feedback.strengths || "");
      setAreasForImprovement(interview.feedback.weaknesses || "");
      setFeedbackNotes(interview.feedback.comments || "");
      setRecommendation(interview.feedback.recommendation || "Strong Hire");
    } else {
      setRatings({
        technicalSkills: 4,
        problemSolving: 4,
        communication: 4,
        roleKnowledge: 4,
        cultureFit: 4,
      });
      setStrengths("");
      setAreasForImprovement("");
      setFeedbackNotes("");
      setRecommendation("Strong Hire");
      setMarkSelected(false);
    }
  }, [interview]);

  if (!isOpen || !interview) return null;

  const candidateName = interview.candidateId?.fullName || "Candidate";
  const jobTitle = interview.jobId?.title || interview.internshipId?.title || "Role";
  const roundName = interview.roundName || `Round ${interview.roundNumber || 1} - ${interview.interviewType || "Interview"}`;

  // Calculate live composite score (1 - 5 scale)
  const { technicalSkills, problemSolving, communication, roleKnowledge, cultureFit } = ratings;
  const ratingValues = [technicalSkills, problemSolving, communication, roleKnowledge, cultureFit].filter(
    (v) => typeof v === "number" && v > 0
  );
  const compositeScore = ratingValues.length > 0
    ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
    : "0.0";

  const getScoreVerdict = (score) => {
    const num = Number(score);
    if (num >= 4.5) return { text: "Outstanding (Top 5%)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (num >= 3.8) return { text: "Strong Performer", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (num >= 3.0) return { text: "Meets Bar", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "Below Bar", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  const scoreVerdict = getScoreVerdict(compositeScore);

  const handleRatingChange = (key, val) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const isFailing = recommendation === "No Hire" || recommendation === "Reject";
      const calculatedResult = isFailing ? "failed" : "passed";

      const payload = {
        scorecard: {
          technicalSkills: Number(ratings.technicalSkills),
          problemSolving: Number(ratings.problemSolving),
          communication: Number(ratings.communication),
          roleKnowledge: Number(ratings.roleKnowledge),
          cultureFit: Number(ratings.cultureFit),
          overallScore: Number(compositeScore),
          strengths,
          areasForImprovement,
          feedback: feedbackNotes,
          recommendation,
        },
        technicalSkills: Number(ratings.technicalSkills),
        problemSolving: Number(ratings.problemSolving),
        communication: Number(ratings.communication),
        roleKnowledge: Number(ratings.roleKnowledge),
        cultureFit: Number(ratings.cultureFit),
        overallScore: Number(compositeScore),
        strengths,
        areasForImprovement,
        feedback: feedbackNotes,
        recommendation,
        result: calculatedResult,
        markSelected: markSelected || recommendation === "Hire / Select",
        ratings: {
          ...ratings,
          systemDesign: ratings.roleKnowledge,
        },
        weaknesses: areasForImprovement,
        comments: feedbackNotes,
      };

      await onSubmitScorecard(interview._id, payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit scorecard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center text-lg font-black">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Candidate Interview Scorecard</h3>
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
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Scorecard Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Composite Score Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Live Composite Overall Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-slate-900 font-mono">{compositeScore}</span>
                <span className="text-xs font-bold text-slate-500">/ 5.0</span>
                <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${scoreVerdict.color}`}>
                  {scoreVerdict.text}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Evaluator: <br />
              <strong className="text-slate-800">{interview.interviewerName || interview.interviewerRole || "Lead Recruiter"}</strong>
            </div>
          </div>

          {/* Rating Criteria Dimensions (5 Core Categories) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Multi-Competency Scorecard (1 - 5 Scale)
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Click a star to grade</span>
            </div>

            <div className="space-y-2">
              <ScoreCriteriaRow
                label="Technical Skills & Execution"
                description="Coding proficiency, algorithms, tech stack knowledge, code quality, and debugging"
                icon="💻"
                value={ratings.technicalSkills}
                onChange={(val) => handleRatingChange("technicalSkills", val)}
              />

              <ScoreCriteriaRow
                label="Problem Solving & Analytical Thinking"
                description="Ability to break down ambiguity, structural logic, and handling edge cases"
                icon="🧩"
                value={ratings.problemSolving}
                onChange={(val) => handleRatingChange("problemSolving", val)}
              />

              <ScoreCriteriaRow
                label="Communication & Articulation"
                description="Clarity of thought, active listening, structured explanation, and conciseness"
                icon="🗣️"
                value={ratings.communication}
                onChange={(val) => handleRatingChange("communication", val)}
              />

              <ScoreCriteriaRow
                label="Role Knowledge & Domain Depth"
                description="Understanding of role requirements, industry concepts, tools, and best practices"
                icon="📚"
                value={ratings.roleKnowledge}
                onChange={(val) => handleRatingChange("roleKnowledge", val)}
              />

              <ScoreCriteriaRow
                label="Culture Fit & Team Collaboration"
                description="Work ethics, receptiveness to constructive feedback, curiosity, and cultural values"
                icon="🤝"
                value={ratings.cultureFit}
                onChange={(val) => handleRatingChange("cultureFit", val)}
              />
            </div>
          </div>

          {/* Qualitative Feedback */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Qualitative Assessment & Notes
            </h4>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  💪 Candidate Strengths
                </label>
                <textarea
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="e.g. Strong foundational fundamentals, clean code, highly structured thinking..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🎯 Areas for Improvement
                </label>
                <textarea
                  rows={2}
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  placeholder="e.g. Needs more hands-on production deployment experience, time complexity speed..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                💬 Detailed Interviewer Summary
              </label>
              <textarea
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Comprehensive notes summarizing candidate performance, key responses, and hire justification..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          {/* Hiring Verdict / Recommendation */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Hiring Recommendation
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "Strong Hire", label: "Strong Hire", icon: "⭐", sub: "Clear Yes", color: "hover:border-emerald-500" },
                { id: "Hire", label: "Hire / Pass", icon: "✅", sub: "Meets Bar", color: "hover:border-blue-500" },
                { id: "Hold", label: "On Hold", icon: "⏸️", sub: "Borderline", color: "hover:border-amber-500" },
                { id: "No Hire", label: "No Hire", icon: "❌", sub: "Reject Round", color: "hover:border-rose-500" },
              ].map((verdict) => (
                <button
                  key={verdict.id}
                  type="button"
                  onClick={() => {
                    setRecommendation(verdict.id);
                    if (verdict.id === "Strong Hire") setMarkSelected(true);
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 text-center ${
                    recommendation === verdict.id
                      ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10"
                      : `bg-white text-slate-700 border-slate-200 ${verdict.color}`
                  }`}
                >
                  <span className="text-lg">{verdict.icon}</span>
                  <span className="text-xs leading-tight font-bold">{verdict.label}</span>
                  <span className={`text-[10px] font-normal ${recommendation === verdict.id ? "text-slate-300" : "text-slate-400"}`}>
                    {verdict.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Mark as Final Round & Select Candidate Toggle */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🏆</span>
                <div>
                  <h5 className="text-xs font-bold text-emerald-950">Final Round Passed — Select Candidate</h5>
                  <p className="text-[11px] text-emerald-700">
                    Advances application to <strong>"Selected"</strong>, unlocking Offer Letter generation.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={markSelected}
                  onChange={(e) => setMarkSelected(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? "Recording Scorecard..." : "Submit Scorecard & Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewScorecardModal;
