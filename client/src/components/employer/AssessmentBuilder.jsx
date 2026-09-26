import React, { useState, useEffect } from "react";
import { createAssessment, updateAssessment } from "../../services/recruitmentService";
import {
  FileText,
  Code2,
  Mic,
  Clock,
  Award,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Copy,
  Layers,
  Settings,
  ShieldCheck,
  Check,
  Terminal,
  FileCode,
  Eye,
  Sliders,
} from "lucide-react";

const STEPS = [
  { id: "setup", label: "Round Setup", desc: "Basics & job link" },
  { id: "questions", label: "Questions & Content", desc: "Problems & tests" },
  { id: "schedule", label: "Schedule & Proctoring", desc: "Timing & anti-cheat" },
  { id: "review", label: "Review & Publish", desc: "Final verification" },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  instructions: "",
  skillCategory: "Full Stack Development",
  assessmentType: "MCQ",
  round: 1,
  roundLabel: "Technical Screening",
  timeLimitMinutes: 30,
  passingScorePercentage: 70,
  jobId: "",
  status: "Active",
  allowRetake: false,
  shuffleQuestions: true,
  showResultsToCandidate: true,
  notifyOnSubmission: true,
  enableProctoring: true,
  enforceFullscreen: true,
  trackTabSwitches: true,
  scheduledAt: "",
  deadline: "",
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
      difficulty: "Medium",
      explanation: "useLayoutEffect fires synchronously after all DOM mutations but before the browser paints.",
    },
    {
      question: "Which HTTP status code signifies a Conflict with the current state of the resource?",
      type: "multiple_choice",
      options: ["400 Bad Request", "409 Conflict", "422 Unprocessable Entity", "500 Internal Server Error"],
      correctAnswer: "409 Conflict",
      points: 10,
      difficulty: "Easy",
      explanation: "HTTP 409 indicates a request conflict with target resource state.",
    },
  ],
  codingProblems: [
    {
      title: "Two Sum Target Array",
      problemStatement: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
      starterCode: `function twoSum(nums, target) {
  // Write your O(N) solution using a Hash Map
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      solutionCode: "",
      defaultLanguage: "javascript",
      supportedLanguages: ["javascript", "python", "java", "cpp"],
      difficulty: "Medium",
      points: 50,
      timeComplexityHint: "O(N) Time, O(N) Space",
      testCases: [
        { input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]", isHidden: false, points: 20 },
        { input: "[3, 2, 4], 6", expectedOutput: "[1, 2]", isHidden: false, points: 15 },
        { input: "[3, 3], 6", expectedOutput: "[0, 1]", isHidden: true, points: 15 },
      ],
    },
  ],
  communicationPrompts: [
    {
      prompt: "Tell us about a technically complex project you built and how you handled key architectural tradeoffs.",
      description: "Focus on why you chose your tech stack, system bottlenecks, and how you ensured scalability.",
      category: "Technical",
      maxDurationSeconds: 180,
      preparationTimeSeconds: 45,
      points: 30,
    },
    {
      prompt: "Describe a situation where you had a disagreement with a team member or product manager. How did you resolve it?",
      description: "Use the STAR method (Situation, Task, Action, Result) to structure your response.",
      category: "Behavioral",
      maxDurationSeconds: 120,
      preparationTimeSeconds: 30,
      points: 20,
    },
  ],
};

// ─── Step 1: Round Setup ─────────────────────────────────────────────────────
const SetupStep = ({ form, setForm, jobs }) => {
  const typeCards = [
    {
      type: "MCQ",
      title: "MCQ Screening",
      desc: "Multiple choice, True/False, and short questions with auto-grading",
      icon: FileText,
      color: "indigo",
      bgSelected: "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20",
    },
    {
      type: "Coding",
      title: "Coding Challenge",
      desc: "Hands-on algorithm & data structures with automated test cases",
      icon: Code2,
      color: "emerald",
      bgSelected: "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20",
    },
    {
      type: "Communication",
      title: "Communication Round",
      desc: "Recorded video/audio prompts evaluating articulation and behavioral fit",
      icon: Mic,
      color: "amber",
      bgSelected: "border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">Configure Round Basics</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select assessment type and configure scoring & time parameters.
        </p>
      </div>

      {/* Assessment Type Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Assessment Round Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {typeCards.map((c) => {
            const Icon = c.icon;
            const isSelected = form.assessmentType === c.type;
            return (
              <button
                key={c.type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, assessmentType: c.type }))}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected ? c.bgSelected : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      c.color === "indigo" ? "bg-indigo-100 text-indigo-700" :
                      c.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title & Quick Suggestions */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-700">Assessment Round Title *</label>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Quick fill:</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, title: `Round ${f.round}: Technical Screening (${f.assessmentType})` }))}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Standard
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, title: `Round ${f.round}: Core DSA & Algorithms` }))}
              className="text-indigo-600 font-semibold hover:underline"
            >
              DSA
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, title: `Round ${f.round}: Behavioral & Leadership Interview` }))}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Behavioral
            </button>
          </div>
        </div>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Round 1 — JavaScript & React Core Competencies"
          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Instructions & Description for Candidates
        </label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Briefly state what skills this round evaluates and what candidates should prepare..."
          className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
        />
      </div>

      {/* Job Association & Round Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Link to Job Opportunity
          </label>
          <select
            value={form.jobId}
            onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
          >
            <option value="">— Generic / All Job Postings —</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title} ({j.department || "General"})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Candidates applying for this job will be assigned this round
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Round Position in Pipeline
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((f) => ({ ...f, round: r }))}
                className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                  form.round === r
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                R{r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Round sequence order</p>
        </div>
      </div>

      {/* Round Label & Skill Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Round Label / Stage Name
          </label>
          <input
            type="text"
            value={form.roundLabel}
            onChange={(e) => setForm((f) => ({ ...f, roundLabel: e.target.value }))}
            placeholder="e.g. Initial Screening / System Architecture"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Primary Skill Category
          </label>
          <input
            type="text"
            value={form.skillCategory}
            onChange={(e) => setForm((f) => ({ ...f, skillCategory: e.target.value }))}
            placeholder="e.g. Frontend, Algorithms, DevOps"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Time Limit & Passing Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Time Limit</span>
            </label>
            <span className="text-xs font-extrabold text-indigo-600">
              {form.timeLimitMinutes} minutes
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={form.timeLimitMinutes}
            onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: Number(e.target.value) }))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>10m</span>
            <span>45m</span>
            <span>90m</span>
            <span>180m</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Passing Score Cutoff</span>
            </label>
            <span className="text-xs font-extrabold text-emerald-600">
              {form.passingScorePercentage}%
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={95}
            step={5}
            value={form.passingScorePercentage}
            onChange={(e) => setForm((f) => ({ ...f, passingScorePercentage: Number(e.target.value) }))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>30% (Low)</span>
            <span>60%</span>
            <span>75% (Std)</span>
            <span>95% (High)</span>
          </div>
        </div>
      </div>

      {/* Candidate Experience Settings */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2.5">
          Candidate Experience & Rules
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            { key: "shuffleQuestions", label: "Randomize Question Order", desc: "Anti-collusion measure" },
            { key: "allowRetake", label: "Permit Multiple Attempts", desc: "Candidate can re-attempt" },
            { key: "showResultsToCandidate", label: "Instant Score Disclosure", desc: "Display results after submit" },
            { key: "notifyOnSubmission", label: "Employer Notification", desc: "Email alert on new submission" },
          ].map((item) => (
            <label
              key={item.key}
              className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                form[item.key]
                  ? "bg-indigo-50/50 border-indigo-200"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={form[item.key]}
                onChange={(e) => setForm((f) => ({ ...f, [item.key]: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 accent-indigo-600"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">{item.label}</p>
                <p className="text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Step 2A: MCQ Builder ───────────────────────────────────────────────────
const MCQBuilder = ({ questions, setQuestions }) => {
  const addQuestion = (customQ) => {
    const qObj = customQ || {
      question: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 10,
      difficulty: "Medium",
      explanation: "",
    };
    setQuestions((prev) => [...prev, qObj]);
  };

  const updateQ = (idx, field, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateOption = (qIdx, optIdx, val) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIdx].options];
      const oldVal = opts[optIdx];
      opts[optIdx] = val;
      if (copy[qIdx].correctAnswer === oldVal) {
        copy[qIdx].correctAnswer = val;
      }
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const addOption = (qIdx) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], options: [...copy[qIdx].options, ""] };
      return copy;
    });
  };

  const removeOption = (qIdx, optIdx) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (copy[qIdx].options.length <= 2) return prev;
      const opts = copy[qIdx].options.filter((_, i) => i !== optIdx);
      copy[qIdx] = { ...copy[qIdx], options: opts };
      return copy;
    });
  };

  const loadPreset = (presetName) => {
    if (presetName === "react") {
      setQuestions([
        {
          question: "How does React's Virtual DOM diffing algorithm achieve O(n) heuristic complexity?",
          type: "multiple_choice",
          options: [
            "By comparing element types and using unique 'key' attributes across sibling elements",
            "By recursively traversing the entire browser DOM tree synchronously",
            "By delegating rendering entirely to Web Workers",
            "By storing DOM nodes directly in IndexedDB",
          ],
          correctAnswer: "By comparing element types and using unique 'key' attributes across sibling elements",
          points: 10,
          difficulty: "Hard",
          explanation: "React assumes elements of different types generate different trees, and uses keys for child lists.",
        },
        {
          question: "What happens if you update state inside a useEffect hook without a dependency array?",
          type: "multiple_choice",
          options: [
            "It causes an infinite re-render loop",
            "It throws a compilation syntax error",
            "State is permanently memoized",
            "React cancels the component mount",
          ],
          correctAnswer: "It causes an infinite re-render loop",
          points: 10,
          difficulty: "Medium",
          explanation: "The effect runs on every render, sets state, which triggers another render indefinitely.",
        },
        {
          question: "React 19 Server Components run exclusively on the server and do NOT bundle into client JS.",
          type: "true_false",
          options: ["True", "False"],
          correctAnswer: "True",
          points: 10,
          difficulty: "Easy",
          explanation: "RSC code remains on the server, sending rendered JSON to the client.",
        },
      ]);
    } else if (presetName === "node") {
      setQuestions([
        {
          question: "In Node.js Event Loop, which queue is processed immediately after the current operation before moving to the next phase?",
          type: "multiple_choice",
          options: [
            "process.nextTick queue (microtask)",
            "setImmediate queue (check phase)",
            "setTimeout timer queue",
            "fs.readFile I/O callback queue",
          ],
          correctAnswer: "process.nextTick queue (microtask)",
          points: 10,
          difficulty: "Hard",
          explanation: "process.nextTick queue is resolved immediately after current execution completes.",
        },
        {
          question: "What is the primary role of MongoDB replica sets?",
          type: "multiple_choice",
          options: [
            "High availability, automated failover, and data redundancy",
            "Compressing large JSON documents",
            "Encrypting client passwords",
            "Compiling JavaScript queries to C++",
          ],
          correctAnswer: "High availability, automated failover, and data redundancy",
          points: 10,
          difficulty: "Medium",
          explanation: "Replica sets provide high availability and fault tolerance.",
        },
      ]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Multiple Choice & Screening Questions</span>
          </h3>
          <p className="text-xs text-slate-500">
            {questions.length} questions configured · Total points:{" "}
            {questions.reduce((s, q) => s + (q.points || 10), 0)} pts
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadPreset("react")}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            + Load React Template
          </button>
          <button
            type="button"
            onClick={() => loadPreset("node")}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
          >
            + Load Node/DB Template
          </button>
          <button
            type="button"
            onClick={() => addQuestion()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition"
          >
            {/* Question Card Header */}
            <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                  Q{qIdx + 1}
                </span>

                <select
                  value={q.type}
                  onChange={(e) => updateQ(qIdx, "type", e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="multiple_choice">Multiple Choice (Single Select)</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer (Auto-graded)</option>
                </select>

                <select
                  value={q.difficulty}
                  onChange={(e) => updateQ(qIdx, "difficulty", e.target.value)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold outline-none border ${
                    q.difficulty === "Easy"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : q.difficulty === "Hard"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <option value="Easy">Easy (10 pts)</option>
                  <option value="Medium">Medium (20 pts)</option>
                  <option value="Hard">Hard (30 pts)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                  <span>Pts:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.points || 10}
                    onChange={(e) => updateQ(qIdx, "points", Number(e.target.value))}
                    className="w-14 h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Question Statement *
              </label>
              <textarea
                rows={2}
                value={q.question}
                onChange={(e) => updateQ(qIdx, "question", e.target.value)}
                placeholder="Enter your question here..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                required
              />
            </div>

            {/* Options Builder for Multiple Choice */}
            {q.type === "multiple_choice" && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Answer Options <span className="text-slate-400 font-normal">(select the radio button to set the correct answer)</span>
                  </label>
                  {q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.correctAnswer === opt && opt.trim() !== "";
                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                        isCorrect
                          ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={isCorrect}
                        onChange={() => {
                          if (opt.trim()) updateQ(qIdx, "correctAnswer", opt);
                        }}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer flex-shrink-0"
                        title="Mark as correct answer"
                      />
                      <span className="text-xs font-bold text-slate-500 w-5">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                        className="flex-1 bg-white h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-indigo-500"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, optIdx)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}

                {q.correctAnswer && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Correct Answer set: "{q.correctAnswer}"</span>
                  </p>
                )}
              </div>
            )}

            {/* True / False */}
            {q.type === "true_false" && (
              <div className="flex gap-3 my-3">
                {["True", "False"].map((val) => {
                  const isSelected = q.correctAnswer === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateQ(qIdx, "correctAnswer", val)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{val}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer */}
            {q.type === "short_answer" && (
              <div className="my-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Exact Answer (case-insensitive) *
                </label>
                <input
                  type="text"
                  value={q.correctAnswer}
                  onChange={(e) => updateQ(qIdx, "correctAnswer", e.target.value)}
                  placeholder="e.g. useEffect / 409 / Redux"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-indigo-600 outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Candidate Explanation & Answer Rationale (Shown after submission)
              </label>
              <input
                type="text"
                value={q.explanation || ""}
                onChange={(e) => updateQ(qIdx, "explanation", e.target.value)}
                placeholder="Why is this answer correct? Provide educational feedback..."
                className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addQuestion()}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition"
      >
        <Plus className="w-4 h-4" />
        <span>Add Another Question</span>
      </button>
    </div>
  );
};

// ─── Step 2B: Coding Challenge Builder ───────────────────────────────────────
const CodingBuilder = ({ problems, setProblems }) => {
  const addProblem = (customProb) => {
    const probObj = customProb || {
      title: "",
      problemStatement: "",
      starterCode: `function solution() {\n  // Write your code here\n}`,
      solutionCode: "",
      defaultLanguage: "javascript",
      supportedLanguages: ["javascript", "python", "java", "cpp"],
      difficulty: "Medium",
      points: 50,
      timeComplexityHint: "O(N)",
      testCases: [{ input: "", expectedOutput: "", isHidden: false, points: 25 }],
    };
    setProblems((prev) => [...prev, probObj]);
  };

  const updateP = (idx, field, value) => {
    setProblems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const addTestCase = (pIdx) => {
    setProblems((prev) => {
      const copy = [...prev];
      copy[pIdx] = {
        ...copy[pIdx],
        testCases: [
          ...copy[pIdx].testCases,
          { input: "", expectedOutput: "", isHidden: false, points: 15 },
        ],
      };
      return copy;
    });
  };

  const updateTC = (pIdx, tcIdx, field, value) => {
    setProblems((prev) => {
      const copy = [...prev];
      const tcs = [...copy[pIdx].testCases];
      tcs[tcIdx] = { ...tcs[tcIdx], [field]: value };
      copy[pIdx] = { ...copy[pIdx], testCases: tcs };
      return copy;
    });
  };

  const removeTC = (pIdx, tcIdx) => {
    setProblems((prev) => {
      const copy = [...prev];
      if (copy[pIdx].testCases.length <= 1) return prev;
      copy[pIdx] = {
        ...copy[pIdx],
        testCases: copy[pIdx].testCases.filter((_, i) => i !== tcIdx),
      };
      return copy;
    });
  };

  const loadCodingPreset = (type) => {
    if (type === "arrays") {
      addProblem({
        title: "Longest Substring Without Repeating Characters",
        problemStatement: "Given a string `s`, find the length of the longest substring without duplicate characters.\n\nExample:\nInput: s = 'abcabcbb'\nOutput: 3 (Explanation: 'abc')\n\nConstraints:\n- 0 <= s.length <= 5 * 10^4\n- s consists of English letters, digits, symbols and spaces.",
        starterCode: `function lengthOfLongestSubstring(s) {\n  let maxLength = 0;\n  let start = 0;\n  const charMap = new Map();\n  for (let end = 0; end < s.length; end++) {\n    if (charMap.has(s[end])) {\n      start = Math.max(start, charMap.get(s[end]) + 1);\n    }\n    charMap.set(s[end], end);\n    maxLength = Math.max(maxLength, end - start + 1);\n  }\n  return maxLength;\n}`,
        solutionCode: "",
        defaultLanguage: "javascript",
        supportedLanguages: ["javascript", "python", "java", "cpp"],
        difficulty: "Medium",
        points: 50,
        timeComplexityHint: "O(N) Time, O(min(m, n)) Space",
        testCases: [
          { input: "'abcabcbb'", expectedOutput: "3", isHidden: false, points: 15 },
          { input: "'bbbbb'", expectedOutput: "1", isHidden: false, points: 15 },
          { input: "'pwwkew'", expectedOutput: "3", isHidden: true, points: 20 },
        ],
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-600" />
            <span>Coding Problems & Test Cases</span>
          </h3>
          <p className="text-xs text-slate-500">
            {problems.length} problems configured · Total points:{" "}
            {problems.reduce((s, p) => s + (p.points || 50), 0)} pts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadCodingPreset("arrays")}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
          >
            + Load Algorithmic Template
          </button>
          <button
            type="button"
            onClick={() => addProblem()}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Problem</span>
          </button>
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-5">
        {problems.map((p, pIdx) => (
          <div
            key={pIdx}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-xs">
                  Problem {pIdx + 1}
                </span>

                <select
                  value={p.difficulty}
                  onChange={(e) => updateP(pIdx, "difficulty", e.target.value)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold outline-none border ${
                    p.difficulty === "Easy"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : p.difficulty === "Hard"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>

                <input
                  type="text"
                  value={p.timeComplexityHint || ""}
                  onChange={(e) => updateP(pIdx, "timeComplexityHint", e.target.value)}
                  placeholder="Expected Complexity e.g. O(N log N)"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                  <span>Score:</span>
                  <input
                    type="number"
                    min={10}
                    value={p.points || 50}
                    onChange={(e) => updateP(pIdx, "points", Number(e.target.value))}
                    className="w-16 h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 text-center"
                  />
                  <span>pts</span>
                </div>

                <button
                  type="button"
                  onClick={() => setProblems((prev) => prev.filter((_, i) => i !== pIdx))}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  title="Delete problem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Problem Title */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Problem Title *
              </label>
              <input
                type="text"
                value={p.title}
                onChange={(e) => updateP(pIdx, "title", e.target.value)}
                placeholder="e.g. Valid Parentheses String & Bracket Balancer"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Problem Statement */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Problem Statement & Constraints *
              </label>
              <textarea
                rows={4}
                value={p.problemStatement}
                onChange={(e) => updateP(pIdx, "problemStatement", e.target.value)}
                placeholder="Detailed description of the problem, input/output formats, and constraints..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Supported Languages */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Allowed Programming Languages
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {["javascript", "python", "java", "cpp", "typescript", "go"].map((lang) => {
                  const isChecked = (p.supportedLanguages || []).includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        const current = p.supportedLanguages || [];
                        const updated = isChecked
                          ? current.filter((l) => l !== lang)
                          : [...current, lang];
                        updateP(pIdx, "supportedLanguages", updated.length > 0 ? updated : [lang]);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition border ${
                        isChecked
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {isChecked && "✓ "}
                      {lang === "cpp" ? "C++" : lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starter Code Editor */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Starter Code Template (JavaScript / Default)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Boilerplate for candidate</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-emerald-400">solution.js</span>
                  <span>Read-only starter preview</span>
                </div>
                <textarea
                  rows={6}
                  value={p.starterCode}
                  onChange={(e) => updateP(pIdx, "starterCode", e.target.value)}
                  className="w-full p-4 bg-transparent text-emerald-300 font-mono text-xs outline-none resize-vertical"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Test Cases Builder */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    Automated Test Cases ({p.testCases.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    At least one visible sample test case and hidden evaluation test cases
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addTestCase(pIdx)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Test Case</span>
                </button>
              </div>

              <div className="space-y-3">
                {p.testCases.map((tc, tcIdx) => (
                  <div
                    key={tcIdx}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">
                          Case #{tcIdx + 1}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={(e) => updateTC(pIdx, tcIdx, "isHidden", e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-indigo-600"
                          />
                          <span>Hidden (Anti-Cheat)</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span>Weight:</span>
                          <input
                            type="number"
                            min={1}
                            value={tc.points || 10}
                            onChange={(e) => updateTC(pIdx, tcIdx, "points", Number(e.target.value))}
                            className="w-12 h-6 px-1 rounded border border-slate-200 text-xs font-bold text-center"
                          />
                          <span>pts</span>
                        </div>
                        {p.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTC(pIdx, tcIdx)}
                            className="text-slate-400 hover:text-rose-500 text-xs p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Standard Input / Arguments
                        </label>
                        <input
                          type="text"
                          value={tc.input}
                          onChange={(e) => updateTC(pIdx, tcIdx, "input", e.target.value)}
                          placeholder="e.g. [2, 7, 11, 15], 9"
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Expected Return / Output
                        </label>
                        <input
                          type="text"
                          value={tc.expectedOutput}
                          onChange={(e) => updateTC(pIdx, tcIdx, "expectedOutput", e.target.value)}
                          placeholder="e.g. [0, 1]"
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono text-emerald-700 font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addProblem()}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2 transition"
      >
        <Plus className="w-4 h-4" />
        <span>Add Another Coding Problem</span>
      </button>
    </div>
  );
};

// ─── Step 2C: Communication Builder ──────────────────────────────────────────
const CommunicationBuilder = ({ prompts, setPrompts }) => {
  const addPrompt = (customPrompt) => {
    const prObj = customPrompt || {
      prompt: "",
      description: "",
      category: "Behavioral",
      maxDurationSeconds: 120,
      preparationTimeSeconds: 30,
      points: 20,
    };
    setPrompts((prev) => [...prev, prObj]);
  };

  const updatePr = (idx, field, value) => {
    setPrompts((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const loadPromptPreset = (cat) => {
    if (cat === "intro") {
      addPrompt({
        prompt: "Introduce yourself, highlight your core technical strengths, and share why you are excited about this specific opportunity.",
        description: "Speak clearly, maintaining camera eye-contact. Cover your educational background and key achievements.",
        category: "Introduction",
        maxDurationSeconds: 120,
        preparationTimeSeconds: 30,
        points: 20,
      });
    } else if (cat === "conflict") {
      addPrompt({
        prompt: "Describe a high-pressure situation where a production bug occurred or a project deadline was at risk. How did you coordinate and communicate?",
        description: "Emphasize communication transparency, stakeholder updates, and post-mortem analysis.",
        category: "Situational",
        maxDurationSeconds: 180,
        preparationTimeSeconds: 45,
        points: 30,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-600" />
            <span>Communication & Spoken Prompts</span>
          </h3>
          <p className="text-xs text-slate-500">
            {prompts.length} prompts configured · Total points:{" "}
            {prompts.reduce((s, p) => s + (p.points || 20), 0)} pts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadPromptPreset("intro")}
            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition"
          >
            + Load Introduction Prompt
          </button>
          <button
            type="button"
            onClick={() => loadPromptPreset("conflict")}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            + Load Behavioral Prompt
          </button>
          <button
            type="button"
            onClick={() => addPrompt()}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Prompt</span>
          </button>
        </div>
      </div>

      {/* Prompts List */}
      <div className="space-y-4">
        {prompts.map((pr, prIdx) => (
          <div
            key={prIdx}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center">
                  #{prIdx + 1}
                </span>

                <select
                  value={pr.category}
                  onChange={(e) => updatePr(prIdx, "category", e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="Introduction">Introduction & Background</option>
                  <option value="Behavioral">Behavioral & Culture Fit</option>
                  <option value="Situational">Situational Scenario</option>
                  <option value="Technical">Technical Explanation</option>
                  <option value="Closing">Closing Thoughts & Q&A</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                  <span>Score:</span>
                  <input
                    type="number"
                    min={5}
                    value={pr.points || 20}
                    onChange={(e) => updatePr(prIdx, "points", Number(e.target.value))}
                    className="w-14 h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 text-center"
                  />
                  <span>pts</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPrompts((prev) => prev.filter((_, i) => i !== prIdx))}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  title="Delete prompt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prompt Question */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prompt / Speaking Question *
              </label>
              <textarea
                rows={2}
                value={pr.prompt}
                onChange={(e) => updatePr(prIdx, "prompt", e.target.value)}
                placeholder="e.g. Explain how you would optimize a slow database query in production..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Context */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Guidance & Context for Candidate
              </label>
              <input
                type="text"
                value={pr.description || ""}
                onChange={(e) => updatePr(prIdx, "description", e.target.value)}
                placeholder="Mention specific metrics, frameworks, or methodologies expected..."
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none"
              />
            </div>

            {/* Time Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Preparation Think Time (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={180}
                    step={5}
                    value={pr.preparationTimeSeconds}
                    onChange={(e) => updatePr(prIdx, "preparationTimeSeconds", Number(e.target.value))}
                    className="w-20 h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-center"
                  />
                  <span className="text-xs text-slate-400">secs to think before recording starts</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Max Recording Duration (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={30}
                    max={600}
                    step={15}
                    value={pr.maxDurationSeconds}
                    onChange={(e) => updatePr(prIdx, "maxDurationSeconds", Number(e.target.value))}
                    className="w-20 h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold text-center text-amber-700"
                  />
                  <span className="text-xs text-slate-400">
                    ({Math.floor((pr.maxDurationSeconds || 120) / 60)}m {((pr.maxDurationSeconds || 120) % 60)}s max speech)
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addPrompt()}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center gap-2 transition"
      >
        <Plus className="w-4 h-4" />
        <span>Add Another Communication Prompt</span>
      </button>
    </div>
  );
};

// ─── Step 3: Schedule & Anti-Cheat ──────────────────────────────────────────
const ScheduleStep = ({ form, setForm }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-extrabold text-slate-900">
        Round Schedule & Anti-Cheat Policies
      </h3>
      <p className="text-xs text-slate-500 mt-0.5">
        Set availability windows and proctoring security parameters.
      </p>
    </div>

    {/* Schedule Timings */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200">
        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Scheduled Start Date & Time (Optional)</span>
        </label>
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Leave blank to make this assessment available immediately upon application
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200">
        <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-rose-500" />
          <span>Submission Deadline (Optional)</span>
        </label>
        <input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium outline-none focus:border-indigo-500"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          After this deadline, candidates will no longer be able to start this round
        </p>
      </div>
    </div>

    {/* Status */}
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <label className="block text-xs font-bold text-slate-800 mb-1.5">
        Initial Round Status
      </label>
      <select
        value={form.status}
        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none"
      >
        <option value="Active">Active — Available immediately for candidate evaluation</option>
        <option value="Draft">Draft — Hidden from applicants while you finalize</option>
        {form.scheduledAt && <option value="Scheduled">Scheduled — Auto-opens at start time</option>}
      </select>
    </div>

    {/* Proctoring & Security */}
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Assessment Integrity & Proctoring
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: "enableProctoring", title: "Automated Proctoring Monitor", desc: "Monitors candidate environment and logs anomalies" },
          { key: "enforceFullscreen", title: "Enforce Fullscreen Mode", desc: "Exiting fullscreen flags candidate for review" },
          { key: "trackTabSwitches", title: "Track Tab / Window Switches", desc: "Counts times candidate navigates away from assessment" },
          { key: "notifyOnSubmission", title: "Instant Notification", desc: "Alert recruitment team via email upon candidate completion" },
        ].map((item) => (
          <label
            key={item.key}
            className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
              form[item.key]
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={!!form[item.key]}
              onChange={(e) => setForm((f) => ({ ...f, [item.key]: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 accent-emerald-600"
            />
            <div>
              <p className="text-xs font-bold text-slate-800">{item.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  </div>
);

// ─── Step 4: Review & Publish ────────────────────────────────────────────────
const ReviewStep = ({ form, jobs }) => {
  const itemCount =
    form.assessmentType === "MCQ"
      ? form.questions.length
      : form.assessmentType === "Coding"
      ? form.codingProblems.length
      : form.communicationPrompts.length;

  const totalPoints =
    form.assessmentType === "MCQ"
      ? form.questions.reduce((s, q) => s + (q.points || 10), 0)
      : form.assessmentType === "Coding"
      ? form.codingProblems.reduce((s, p) => s + (p.points || 50), 0)
      : form.communicationPrompts.reduce((s, p) => s + (p.points || 20), 0);

  const targetJob = jobs.find((j) => j._id === form.jobId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">
          Executive Review & Confirmation
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify assessment parameters before publishing this round.
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-bold">
                Round {form.round}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                {form.assessmentType} Assessment
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                {form.status}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{form.title || "Untitled Round"}</h2>
            {form.description && (
              <p className="text-xs text-slate-500 mt-0.5">{form.description}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-indigo-600">{totalPoints}</span>
            <span className="text-xs font-bold text-slate-400 block">Total Marks</span>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Time Allowed
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {form.timeLimitMinutes} Mins
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Passing Mark
            </span>
            <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">
              {form.passingScorePercentage}%
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Content Volume
            </span>
            <span className="text-base font-extrabold text-slate-800 mt-0.5 block">
              {itemCount} {form.assessmentType === "MCQ" ? "Questions" : form.assessmentType === "Coding" ? "Problems" : "Prompts"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Linked Job
            </span>
            <span className="text-xs font-extrabold text-indigo-600 truncate mt-1 block">
              {targetJob?.title || "Open for All"}
            </span>
          </div>
        </div>

        {itemCount === 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Warning:</strong> You have not added any questions or problems. Please return to Step 2 before publishing.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main AssessmentBuilder Wizard ───────────────────────────────────────────
const AssessmentBuilder = ({ jobs = [], editData, onCancel, onSaved, onToast }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(() => {
    if (editData && editData._id) {
      return {
        ...DEFAULT_FORM,
        ...editData,
        scheduledAt: editData.scheduledAt ? new Date(editData.scheduledAt).toISOString().slice(0, 16) : "",
        deadline: editData.deadline ? new Date(editData.deadline).toISOString().slice(0, 16) : "",
      };
    }
    return {
      ...DEFAULT_FORM,
      jobId: editData?.jobId || "",
      assessmentType: editData?.assessmentType || "MCQ",
    };
  });

  const setQuestions = (fn) =>
    setForm((f) => ({ ...f, questions: typeof fn === "function" ? fn(f.questions) : fn }));
  const setCodingProblems = (fn) =>
    setForm((f) => ({ ...f, codingProblems: typeof fn === "function" ? fn(f.codingProblems) : fn }));
  const setCommunicationPrompts = (fn) =>
    setForm((f) => ({
      ...f,
      communicationPrompts: typeof fn === "function" ? fn(f.communicationPrompts) : fn,
    }));

  const handleSave = async (forceStatus) => {
    if (!form.title.trim()) {
      setError("Please provide an assessment round title");
      setStep(0);
      return;
    }

    const itemCount =
      form.assessmentType === "MCQ"
        ? form.questions.length
        : form.assessmentType === "Coding"
        ? form.codingProblems.length
        : form.communicationPrompts.length;

    if (itemCount === 0) {
      setError("Please configure at least one question or problem in Step 2");
      setStep(1);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        instructions: form.instructions || form.description,
        skillCategory: form.skillCategory,
        assessmentType: form.assessmentType,
        round: form.round,
        roundLabel: form.roundLabel,
        timeLimitMinutes: form.timeLimitMinutes,
        passingScorePercentage: form.passingScorePercentage,
        jobId: form.jobId || undefined,
        status: forceStatus || form.status,
        allowRetake: form.allowRetake,
        shuffleQuestions: form.shuffleQuestions,
        showResultsToCandidate: form.showResultsToCandidate,
        notifyOnSubmission: form.notifyOnSubmission,
        scheduledAt: form.scheduledAt || undefined,
        deadline: form.deadline || undefined,
        questions: form.assessmentType === "MCQ" ? form.questions : [],
        codingProblems: form.assessmentType === "Coding" ? form.codingProblems : [],
        communicationPrompts: form.assessmentType === "Communication" ? form.communicationPrompts : [],
      };

      if (editData?._id) {
        await updateAssessment(editData._id, payload);
      } else {
        await createAssessment(payload);
      }
      onSaved?.();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to save assessment round";
      setError(msg);
      onToast?.(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* ── Wizard Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 mb-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Assessment Hub</span>
          </button>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {editData?._id ? "Edit Assessment Round" : "Create New Assessment Round"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {step + 1} of {STEPS.length}: <strong>{STEPS[step].label}</strong> — {STEPS[step].desc}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Draft")}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* ── Modern Step Navigation Bar ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {STEPS.map((s, idx) => {
          const isDone = idx < step;
          const isCurrent = idx === step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (idx < step) setStep(idx);
              }}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                isCurrent
                  ? "bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/10"
                  : isDone
                  ? "bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer"
                  : "bg-white/60 border-slate-200/60 opacity-60 cursor-default"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : isDone
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <div className="overflow-hidden">
                <p className={`text-xs font-bold truncate ${isCurrent ? "text-indigo-600" : "text-slate-800"}`}>
                  {s.label}
                </p>
                <p className="text-[10.5px] text-slate-400 truncate">{s.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2 animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 font-bold p-1">
            ✕
          </button>
        </div>
      )}

      {/* ── Step Content Container ────────────────────────────────────────── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs">
        {step === 0 && <SetupStep form={form} setForm={setForm} jobs={jobs} />}
        {step === 1 && form.assessmentType === "MCQ" && (
          <MCQBuilder questions={form.questions} setQuestions={setQuestions} />
        )}
        {step === 1 && form.assessmentType === "Coding" && (
          <CodingBuilder problems={form.codingProblems} setProblems={setCodingProblems} />
        )}
        {step === 1 && form.assessmentType === "Communication" && (
          <CommunicationBuilder prompts={form.communicationPrompts} setPrompts={setCommunicationPrompts} />
        )}
        {step === 2 && <ScheduleStep form={form} setForm={setForm} />}
        {step === 3 && <ReviewStep form={form} jobs={jobs} />}
      </div>

      {/* ── Navigation Bottom Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => (step > 0 ? setStep(step - 1) : onCancel())}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
        >
          {step === 0 ? "Cancel" : "← Back"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 0 && !form.title.trim()) {
                setError("Please enter a round title to continue");
                return;
              }
              setError("");
              setStep(step + 1);
            }}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Active")}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-60 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{saving ? "Publishing..." : editData?._id ? "Update Assessment Round" : "Publish Assessment Round"}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AssessmentBuilder;
