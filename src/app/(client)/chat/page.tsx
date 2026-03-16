"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Paperclip } from "lucide-react";

interface Message {
  id: string;
  sender: "client" | "coach" | "ai";
  body: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  { id: "1", sender: "coach", body: "Good morning Michael! I reviewed your glucose data from yesterday. Your post-dinner spike was a bit higher than usual — 168 mg/dL. Did you have anything different for dinner?", timestamp: "8:15 AM" },
  { id: "2", sender: "client", body: "Hey! Yeah, we had pasta last night. I know carbs are a trigger but it was a family dinner.", timestamp: "8:22 AM" },
  { id: "3", sender: "coach", body: "Totally understandable — life happens! A few tips for next time: try having a small salad first, and take a 10-15 min walk right after. That alone can cut the spike by 30-40%.", timestamp: "8:25 AM" },
  { id: "4", sender: "coach", body: "Also, I noticed your HRV has been trending up nicely — 56ms 7-day average. The magnesium and ashwagandha seem to be working well. How are you feeling overall?", timestamp: "8:26 AM" },
  { id: "5", sender: "client", body: "Feeling pretty good actually. Energy has been better in the mornings. Sleep has been great since I started the magnesium before bed.", timestamp: "8:30 AM" },
  { id: "6", sender: "coach", body: "That's excellent to hear! Let's keep the current protocol for another 2 weeks and then reassess. Your next lab draw is scheduled for March 15th — I'll send you a reminder.", timestamp: "8:32 AM" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: String(Date.now()),
      sender: "client",
      body: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate coach typing response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "coach",
          body: "Thanks for the update! I'll review this and get back to you shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    }, 2000);
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
                  isMe ? "bg-kairos-gold/20" : msg.sender === "ai" ? "bg-purple-500/20" : "bg-blue-500/20"
                }`}>
                  {isMe ? <User size={12} className="text-kairos-gold" /> : msg.sender === "ai" ? <Bot size={12} className="text-purple-400" /> : <User size={12} className="text-blue-400" />}
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
                    {msg.timestamp}
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
        <button className="text-kairos-silver-dark hover:text-white transition-colors p-2">
          <Paperclip size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="kairos-input flex-1"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
