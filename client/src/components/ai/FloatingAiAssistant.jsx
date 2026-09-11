import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { askAiAssistant, triggerAiRecommendationMail } from "../../services/aiAssistantService";

const SUGGESTED_PROMPTS = [
  "🔥 Find best internships for my profile",
  "💼 Show top software engineer jobs hiring now",
  "📝 Review my resume and tell me missing skills",
  "📚 Recommend courses to learn Full Stack Web Dev",
  "📩 Send me an AI recommendation in my Notification Inbox",
];

const FloatingAiAssistant = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome-msg",
      role: "ai",
      content:
        "Hello! I am your **CareerConnect AI Assistant** 🤖.\n\nI can analyze your profile, search live jobs & internships, critique your resume, or recommend high-impact courses. What would you like to explore today?",
      suggestedCards: [],
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Strictly check if current page is student, fresher, or professional dashboard
  const pathname = location.pathname.toLowerCase();
  const isDashboardRoute =
    pathname.startsWith("/student") ||
    pathname.startsWith("/fresher") ||
    pathname.startsWith("/professional");

  const userRole = user?.userType || user?.role;
  const isAllowedRole =
    user &&
    user.role !== "employer" &&
    ["student", "fresher", "professional", "candidate", "user"].includes(userRole);

  // If user is not logged in, or is an employer, or is not on the dashboard route, do not render
  if (!user || !isAllowedRole || !isDashboardRoute) {
    return null;
  }

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || !text.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Check if user specifically asks to send an email or inbox notification
      if (/send.*notification|send.*mail|inbox|recommendation.*mail/i.test(text)) {
        await triggerAiRecommendationMail();
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content:
              "✅ **Done!** I've matched a top personalized opportunity and sent a full mail notification to your **Notification Inbox**.\n\nClick on the notification bell at the top of your dashboard to read the full message and apply directly!",
            suggestedCards: [],
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Format conversation history
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askAiAssistant(text.trim(), history);

      if (res?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: res.answer,
            suggestedCards: res.suggestedCards || [],
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: "I'm having a slight connection blip with the server. Please try asking again in a moment!",
            suggestedCards: [],
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("AI assistant error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: "Sorry, I couldn't process that request right now. Please try again!",
          suggestedCards: [],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-[#0a2540] via-[#1e3a8a] to-[#2563eb] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            aria-label="Open AI Career Assistant"
          >
            <span className="text-xl animate-bounce">🤖</span>
            <span className="text-xs font-bold tracking-wide pr-1">Ask AI</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Window Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[580px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0a2540] to-[#1e3a8a] text-white flex items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shrink-0 shadow-inner">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>CareerConnect AI</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    RAG Live
                  </span>
                </h3>
                <p className="text-[11px] text-blue-200/80">
                  Real-time database grounding & resume analysis
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close assistant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-semibold whitespace-nowrap border border-slate-200/80 shadow-xs transition disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((m) => {
              const isAi = m.role === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isAi ? "justify-start" : "justify-end"}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      🤖
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                      isAi
                        ? "bg-slate-100/90 text-slate-800 border border-slate-200/60 rounded-tl-sm shadow-xs"
                        : "bg-blue-600 text-white rounded-tr-sm shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>

                    {/* Interactive RAG Opportunity Cards inside chat */}
                    {isAi && m.suggestedCards && m.suggestedCards.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Related Live Openings:
                        </span>
                        {m.suggestedCards.slice(0, 2).map((item, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-blue-600 capitalize">
                                {item.type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                {item.company || item.provider} • {item.salary || item.stipend || item.duration}
                              </p>
                            </div>
                            <Link
                              to={item.applyUrl || "/jobs"}
                              onClick={() => setIsOpen(false)}
                              className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] text-white text-[10px] font-bold hover:bg-blue-700 shrink-0 transition"
                            >
                              View ›
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] font-medium text-slate-500 ml-1">
                  Searching live database & analyzing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about internships, jobs, skills, resume..."
              className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
            >
              <span>Send</span>
              <span>↑</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingAiAssistant;
