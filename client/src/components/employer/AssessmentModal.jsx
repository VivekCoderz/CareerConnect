import React, { useState } from "react";

const AssessmentModal = ({ isOpen, onClose, onCreateAssessment, jobs = [] }) => {
  const [formData, setFormData] = useState({
    title: "Full Stack React & Node.js Evaluation",
    description: "Evaluates core fundamentals of asynchronous JavaScript, React hooks, state management and REST APIs.",
    skillCategory: "Frontend & Backend",
    timeLimitMinutes: 30,
    passingScorePercentage: 70,
    jobId: jobs[0]?._id || "",
    questions: [
      {
        question: "What is the primary difference between useEffect and useLayoutEffect in React?",
        type: "multiple_choice",
        options: [
          "useEffect runs asynchronously after paint, useLayoutEffect runs synchronously before paint",
          "useEffect is only for class components, useLayoutEffect is for functional components",
          "useLayoutEffect cannot accept dependencies array",
          "There is no difference in execution timing",
        ],
        correctAnswer: "useEffect runs asynchronously after paint, useLayoutEffect runs synchronously before paint",
        points: 10,
      },
      {
        question: "Which HTTP status code signifies a Conflict with existing state in REST APIs?",
        type: "multiple_choice",
        options: ["400 Bad Request", "409 Conflict", "422 Unprocessable Entity", "500 Internal Server Error"],
        correctAnswer: "409 Conflict",
        points: 10,
      },
      {
        question: "What does the MongoDB index parameter { unique: true } accomplish?",
        type: "multiple_choice",
        options: [
          "Ensures no duplicate values exist for the indexed field",
          "Automatically encrypts the field",
          "Speeds up write operations only",
          "Deletes documents after TTL expiration",
        ],
        correctAnswer: "Ensures no duplicate values exist for the indexed field",
        points: 10,
      },
    ],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "New Technical Assessment Question",
          type: "multiple_choice",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          points: 10,
        },
      ],
    }));
  };

  const handleRemoveQuestion = (idx) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const handleQuestionChange = (idx, field, value) => {
    setFormData((prev) => {
      const qCopy = [...prev.questions];
      qCopy[idx] = { ...qCopy[idx], [field]: value };
      return { ...prev, questions: qCopy };
    });
  };

  const handleOptionChange = (qIdx, optIdx, val) => {
    setFormData((prev) => {
      const qCopy = [...prev.questions];
      const optCopy = [...qCopy[qIdx].options];
      optCopy[optIdx] = val;
      qCopy[qIdx] = { ...qCopy[qIdx], options: optCopy };
      return { ...prev, questions: qCopy };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.questions.length === 0) {
      setError("Title and at least one question are required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await onCreateAssessment(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-top">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create Recruitment Assessment</h3>
            <p className="text-xs text-slate-500">Auto-evaluated quiz for screening candidates</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Assessment Title *</label>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none focus:border-[#f59e0b]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time Limit (Minutes)</label>
              <input
                type="number"
                value={formData.timeLimitMinutes}
                onChange={(e) => setFormData({ ...formData, timeLimitMinutes: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Passing Threshold (%)</label>
              <input
                type="number"
                value={formData.passingScorePercentage}
                onChange={(e) => setFormData({ ...formData, passingScorePercentage: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          {/* Dynamic Question List */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Questions ({formData.questions.length})
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#92400e] text-xs font-bold transition"
              >
                + Add Question
              </button>
            </div>

            {formData.questions.map((q, qIdx) => (
              <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {qIdx + 1}
                  </span>
                  <input
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                    placeholder="Enter question text..."
                    className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-[#f59e0b]"
                  />
                  {formData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold p-1"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswer === opt}
                        onChange={() => handleQuestionChange(qIdx, "correctAnswer", opt)}
                        title="Mark as correct answer"
                      />
                      <input
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

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
              className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-bold shadow-xs transition"
            >
              {saving ? "Saving..." : "Create & Activate Assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssessmentModal;
