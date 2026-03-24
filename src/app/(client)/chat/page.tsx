"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Bot, User, Paperclip } from "lucide-react";
import {
  listChatMessages,
  sendMessage as engineSendMessage,
} from "@/lib/client-ops/engine";

const CLIENT_ID = "demo-client";

export default function ChatPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(
    () => listChatMessages(CLIENT_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    engineSendMessage(CLIENT_ID, input.trim());
    setInput("");
    setRefreshKey((k) => k + 1);

    // Simulate coach typing response
    setTimeout(() => {
      engineSendMessage(CLIENT_ID, "Thanks for the update! I'll review this and get back to you shortly.");
      // Patch last message to be from coach
      const msgs = listChatMessages(CLIENT_ID);
      const last = msgs[msgs.length - 1];
      if (last) {
        last.sender = "coach";
        last.senderName = "Dr. Marcus Chen";
      }
      setRefreshKey((k) => k + 1);
    }, 2000);
  }

  function formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fade-in">
      {/* Chat Header */}
      <div className="kairos-card mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-kairos-gold/20 flex items-center justify-center">
          <span className="text-sm font-heading font-bold text-kairos-gold">MC</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-semibold text-white">Dr. Marcus Chen</p>
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
        {messages.map((msg) => {
          const isMe = msg.sender === "client";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isMe ? "bg-kairos-gold/20" : msg.sender === "system" ? "bg-purple-500/20" : "bg-blue-500/20"
                }`}>
                  {isMe ? <User size={12} className="text-kairos-gold" /> : msg.sender === "system" ? <Bot size={12} className="text-purple-400" /> : <User size={12} className="text-blue-400" />}
                </div>
                <div>
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isMe
                      ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm"
                      : "bg-kairos-card border border-kairos-border text-white rounded-bl-sm"
                  }`}>
                    <p className="text-sm font-body">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] font-body text-kairos-silver-dark mt-1 ${isMe ? "text-right" : ""}`}>
                    {formatTime(msg.timestamp)}
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
        <button onClick={handleSend} disabled={!input.trim()}
          className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
