"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Paperclip } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Get or create a default conversation (first one)
  const { data: conversations = [] } = trpc.clientPortal.messaging.listConversations.useQuery(
    { filter: "all" },
    { staleTime: 10_000 }
  );

  const activeConv = conversations[0] ?? null;

  const { data: messagesData = [] } = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: activeConv?.id ?? "", limit: 50 },
    { enabled: !!activeConv, staleTime: 5_000 }
  );

  const sendMutation = trpc.clientPortal.messaging.sendMessage.useMutation({
    onSuccess: () => {
      utils.clientPortal.messaging.getMessages.invalidate();
      utils.clientPortal.messaging.listConversations.invalidate();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  function handleSend() {
    if (!input.trim() || !activeConv) return;
    sendMutation.mutate({
      conversationId: activeConv.id,
      body: input.trim(),
    });
    setInput("");
  }

  function formatTime(timestamp: string | Date): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const coachName = activeConv?.coachName ?? "Your Coach";
  const coachInitials = coachName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fade-in">
      {/* Chat Header */}
      <div className="kairos-card mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-kairos-gold/20 flex items-center justify-center">
          <span className="text-sm font-heading font-bold text-kairos-gold">{coachInitials}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-semibold text-white">{coachName}</p>
          <p className="text-xs font-body text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Online
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-body text-kairos-silver-dark">
          <Bot size={14} /> AI assist available
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 custom-scrollbar">
        {!activeConv && (
          <div className="text-center py-10">
            <p className="text-kairos-silver-dark font-body text-sm">No conversations yet. Send a message to start chatting with your coach.</p>
          </div>
        )}
        {messagesData.map((msg) => {
          const isMe = msg.senderRole === "client";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isMe ? "bg-kairos-gold/20" : msg.senderRole === "ai_coach" ? "bg-purple-500/20" : "bg-blue-500/20"
                }`}>
                  {isMe ? <User size={12} className="text-kairos-gold" /> : msg.senderRole === "ai_coach" ? <Bot size={12} className="text-purple-400" /> : <User size={12} className="text-blue-400" />}
                </div>
                <div>
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm"
                      : "bg-kairos-card border border-kairos-border text-white rounded-bl-sm"
                  }`}>
                    <p className="text-sm font-body">{msg.body}</p>
                  </div>
                  <p className={`text-[10px] font-body text-kairos-silver-dark mt-1 ${isMe ? "text-right" : ""}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => alert("File upload coming soon — attach lab results, photos, and documents.")} className="text-kairos-silver-dark hover:text-white transition-colors p-2" title="Attach file">
          <Paperclip size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="kairos-input flex-1"
        />
        <button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}
          className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
