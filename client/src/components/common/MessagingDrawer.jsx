import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  MessageSquare,
  Send,
  X,
  User,
  Building2,
  Briefcase,
  Search,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
} from "lucide-react";
import messageService from "../../services/messageService";
import { getSocket, subscribeToEvent } from "../../services/socketService";

export default function MessagingDrawer({
  isOpen,
  onClose,
  initialConversationId = null,
  contextData = null, // { candidateId, applicationId, jobId, internshipId, contextTitle }
}) {
  const { user } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  // Load conversations
  const loadConversations = async (autoSelectId = null) => {
    try {
      setLoadingConversations(true);
      const res = await messageService.getConversations();
      if (res?.success) {
        const convList = res.conversations || [];
        setConversations(convList);

        if (autoSelectId) {
          const match = convList.find((c) => c._id === autoSelectId);
          if (match) setActiveConversation(match);
        } else if (!activeConversation && convList.length > 0) {
          setActiveConversation(convList[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // If opening with specific context (e.g. from candidate or application card)
  useEffect(() => {
    if (!isOpen) return;

    if (contextData?.candidateId || contextData?.applicationId) {
      messageService
        .getOrCreateConversation(contextData)
        .then((res) => {
          if (res?.success && res.conversation) {
            loadConversations(res.conversation._id);
          } else {
            loadConversations(initialConversationId);
          }
        })
        .catch(() => loadConversations(initialConversationId));
    } else {
      loadConversations(initialConversationId);
    }
  }, [isOpen, initialConversationId, contextData]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation?._id) {
      setMessages([]);
      return;
    }

    const convId = activeConversation._id;
    const socket = getSocket();
    if (socket) {
      socket.emit("join_conversation", convId);
    }

    setLoadingMessages(true);
    messageService
      .getMessages(convId)
      .then((res) => {
        if (res?.success) {
          setMessages(res.messages || []);
          // Clear unread indicator locally
          setConversations((prev) =>
            prev.map((c) => (c._id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      })
      .catch((err) => console.error("Failed to load messages:", err))
      .finally(() => setLoadingMessages(false));

    return () => {
      if (socket) {
        socket.emit("leave_conversation", convId);
      }
    };
  }, [activeConversation?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message listener
  useEffect(() => {
    const unsub = subscribeToEvent("NEW_MESSAGE", (newMsg) => {
      if (!newMsg) return;

      if (activeConversation?._id && String(newMsg.conversationId) === String(activeConversation._id)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        messageService.markConversationRead(activeConversation._id).catch(() => {});
      } else {
        // Refresh conversation unread counter
        loadConversations();
      }
    });

    return () => unsub();
  }, [activeConversation?._id]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConversation?._id || sending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await messageService.sendMessage(activeConversation._id, {
        text: textToSend,
      });

      if (res?.success && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
        // Update conversation last message in list
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConversation._id
              ? {
                  ...c,
                  lastMessage: textToSend.slice(0, 100),
                  lastMessageAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputText(textToSend); // Restore on error
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherName = c.otherUser?.fullName || "";
    const otherEmail = c.otherUser?.email || "";
    const company = c.companyId?.name || "";
    const title = c.contextTitle || "";
    return (
      otherName.toLowerCase().includes(q) ||
      otherEmail.toLowerCase().includes(q) ||
      company.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col">
          {/* Top Bar */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  CareerConnect Messages
                </h2>
                <p className="text-xs text-slate-500">
                  Direct Student ↔ Employer communication
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Dual-Pane Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Conversations List Pane */}
            <div
              className={`w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
                activeConversation ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search */}
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {loadingConversations ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      No conversations found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Messages with employers or candidates will appear here.
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = activeConversation?._id === conv._id;
                    const other = conv.otherUser || {};
                    const hasUnread = (conv.unreadCount || 0) > 0;

                    return (
                      <button
                        key={conv._id}
                        type="button"
                        onClick={() => setActiveConversation(conv)}
                        className={`w-full text-left p-3.5 flex items-start gap-3 transition ${
                          isSelected
                            ? "bg-blue-50/80 border-l-4 border-[#1e3a8a]"
                            : "hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs uppercase overflow-hidden border border-slate-300">
                          {other.profileImage ? (
                            <img
                              src={other.profileImage}
                              alt={other.fullName || "User"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            other.fullName?.charAt(0) || "U"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {other.fullName || other.companyName || "CareerConnect User"}
                            </h4>
                            {conv.lastMessageAt && (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(conv.lastMessageAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                          {conv.companyId?.name && (
                            <p className="text-[10px] text-blue-700 font-medium flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="w-3 h-3" />
                              {conv.companyId.name}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 truncate mt-1">
                            {conv.lastMessage || "No messages yet"}
                          </p>
                          {conv.contextTitle && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-semibold mt-1">
                              {conv.contextTitle}
                            </span>
                          )}
                        </div>
                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Thread Pane */}
            <div
              className={`flex-1 flex flex-col bg-white ${
                !activeConversation ? "hidden md:flex" : "flex"
              }`}
            >
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveConversation(null)}
                        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 overflow-hidden">
                        {activeConversation.otherUser?.profileImage ? (
                          <img
                            src={activeConversation.otherUser.profileImage}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          activeConversation.otherUser?.fullName?.charAt(0) || "U"
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 leading-tight">
                          {activeConversation.otherUser?.fullName || "User"}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          {activeConversation.companyId?.name
                            ? `Company: ${activeConversation.companyId.name}`
                            : activeConversation.otherUser?.email || "Authorized Member"}
                        </p>
                      </div>
                    </div>

                    {activeConversation.applicationId && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        Application: {activeConversation.applicationId.status || "Active"}
                      </span>
                    )}
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                    {loadingMessages ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-xs text-slate-400">
                          This is the beginning of your conversation. Send a message below to start!
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = String(m.senderId?._id || m.senderId) === String(user?._id);

                        return (
                          <div
                            key={m._id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <span className="text-[10px] text-slate-400 mb-1 px-1">
                              {isMe ? "You" : m.senderName || "User"} •{" "}
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <div
                              className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? "bg-[#1e3a8a] text-white rounded-br-xs shadow-xs"
                                  : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Box */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message... (Press Enter to send)"
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-sm font-bold text-slate-700">Select a Conversation</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Choose a conversation from the list to view messages and reply in real-time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
