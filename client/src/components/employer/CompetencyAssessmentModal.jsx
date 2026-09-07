import React, { useState } from "react";

const domainQuestions = {
  default: [
    {
      q: "Which architectural pattern is best suited for decoupling microservices in high-throughput enterprise systems?",
      options: [
        "Monolithic Synchronous Polling",
        "Event-Driven Architecture with Message Queues (e.g., Kafka / RabbitMQ)",
        "Direct Shared SQL Database Tables",
        "Point-to-Point HTTP Cascading Calls",
      ],
      correct: 1,
    },
    {
      q: "What is the primary benefit of implementing memoization and immutable state updates in web frontends?",
      options: [
        "Eliminating all CSS styling bugs",
        "Minimizing redundant component re-renders and boosting UI rendering performance",
        "Replacing the need for backend database validation",
        "Automatically writing unit tests",
      ],
      correct: 1,
    },
    {
      q: "How does rate limiting and circuit breaking protect backend microservices from cascading system failures?",
      options: [
        "By shutting down the entire server cluster immediately",
        "By shedding excess traffic and failing fast when downstream dependencies degrade",
        "By deleting all database indexes",
        "By converting REST APIs into static HTML files",
      ],
      correct: 1,
    },
    {
      q: "Which of the following is essential for enforcing Zero-Trust security in cloud infrastructure?",
      options: [
        "Granting full administrator root privileges to all service accounts",
        "Least-privilege IAM roles, continuous authentication, and encrypted data in transit and at rest",
        "Disabling all firewall rules and VPC subnetting",
        "Storing API secret keys directly inside public Git repositories",
      ],
      correct: 1,
    },
  ],
};

const CompetencyAssessmentModal = ({
  isOpen,
  onClose,
  enrollment,
  onValidated,
}) => {
  const [currentStep, setCurrentStep] = useState("intro"); // "intro" | "quiz" | "result"
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen || !enrollment) return null;

  const courseTitle = enrollment.courseId?.title || "Professional Competency Track";
  const domain = enrollment.courseId?.domain || "Engineering & Technology";
  const questions = domainQuestions.default;

  const handleSelectAnswer = (qIndex, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleStartQuiz = () => {
    setAnswers({});
    setError("");
    setCurrentStep("quiz");
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (Object.keys(answers).length < questions.length) {
      setError("Please answer all assessment questions before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct) correctCount += 1;
      });

      const scorePercentage = Math.round((correctCount / questions.length) * 100);
      const competencyLevel = scorePercentage >= 90 ? "Expert" : scorePercentage >= 75 ? "Advanced" : "Intermediate";

      const res = await onValidated(enrollment._id, {
        scorePercentage,
        competencyLevel,
      });

      setResult({
        scorePercentage,
        correctCount,
        total: questions.length,
        passed: scorePercentage >= 70,
        competencyLevel,
      });
      setCurrentStep("result");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to validate competency");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-slide-in-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center text-lg font-black">
              🧪
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Competency Validation Assessment</h3>
              <p className="text-xs text-slate-500">{courseTitle}</p>
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

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* STEP 1: INTRO */}
          {currentStep === "intro" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-3xl">
                🎓
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">Validate Your Mastery</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  To earn your official <strong>Verifiable Certificate</strong> and update your competency profile for <strong>{courseTitle}</strong>, complete this 4-question industry skill evaluation.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Pass Threshold:</span>
                  <span className="font-bold text-slate-900">70% Required</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Questions:</span>
                  <span className="font-bold text-slate-900">{questions.length} Multiple Choice</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartQuiz}
                className="px-6 py-2.5 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-xs transition inline-block mt-2"
              >
                Begin Assessment Now →
              </button>
            </div>
          )}

          {/* STEP 2: QUIZ QUESTIONS */}
          {currentStep === "quiz" && (
            <form onSubmit={handleSubmitQuiz} className="space-y-5">
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {qIdx + 1}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 leading-snug">{q.q}</h5>
                    </div>

                    <div className="space-y-1.5 pl-7">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 cursor-pointer transition ${
                            answers[qIdx] === optIdx
                              ? "bg-amber-50 border-amber-400 text-amber-950 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question_${qIdx}`}
                            checked={answers[qIdx] === optIdx}
                            onChange={() => handleSelectAnswer(qIdx, optIdx)}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep("intro")}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition"
                >
                  {submitting ? "Submitting..." : "Submit & Validate Competency"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: RESULT */}
          {currentStep === "result" && result && (
            <div className="space-y-4 text-center py-4">
              <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-3xl ${
                result.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {result.passed ? "🏆" : "⚠️"}
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900">
                  {result.passed ? "Competency Successfully Validated!" : "Needs Review & Retake"}
                </h4>
                <p className="text-xs text-slate-500">
                  You scored <strong className="text-slate-900 font-mono text-sm">{result.scorePercentage}%</strong> ({result.correctCount}/{result.total} Correct)
                </p>
              </div>

              {result.passed ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1 max-w-md mx-auto">
                  <p className="font-bold">🎖️ Awarded Competency Level: {result.competencyLevel}</p>
                  <p className="text-[11px] text-emerald-700">
                    Your verifiable accreditation certificate has been generated and your organizational skills profile updated!
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1 max-w-md mx-auto">
                  <p className="font-bold">Score below 70% threshold</p>
                  <p className="text-[11px] text-rose-600">
                    Review the course lessons and attempt the competency assessment again to earn your certificate.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-2">
                {!result.passed ? (
                  <button
                    type="button"
                    onClick={handleStartQuiz}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    🔄 Retake Assessment
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    View My Certificates →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetencyAssessmentModal;
