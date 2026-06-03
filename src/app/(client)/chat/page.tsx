"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
  MessageSquare,
  Video,
  Paperclip,
  Calendar,
  Phone,
  UserCircle,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold, italic, bullets, code, links)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-1 my-2">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm font-body">
            {inlineFormat(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function inlineFormat(str: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let idx = 0;
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) parts.push(str.slice(lastIndex, match.index));
      if (match[2]) parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
      else if (match[3]) parts.push(<em key={idx++} className="italic">{match[3]}</em>);
      else if (match[4]) parts.push(<code key={idx++} className="bg-kairos-royal-surface px-1.5 py-0.5 rounded text-xs font-mono text-kairos-gold">{match[4]}</code>);
      else if (match[5] && match[6]) parts.push(<a key={idx++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-kairos-gold underline hover:text-kairos-gold/80">{match[5]}</a>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < str.length) parts.push(str.slice(lastIndex));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s/.test(trimmed)) { listBuffer.push(trimmed.replace(/^[-*•]\s/, "")); continue; }
    if (/^\d+\.\s/.test(trimmed)) { listBuffer.push(trimmed.replace(/^\d+\.\s/, "")); continue; }
    flushList();
    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={key++} className="font-heading font-semibold text-white text-sm mt-3 mb-1">{inlineFormat(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={key++} className="font-heading font-bold text-white mt-3 mb-1">{inlineFormat(trimmed.slice(3))}</h3>);
    } else if (trimmed === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(<p key={key++} className="text-sm font-body leading-relaxed">{inlineFormat(trimmed)}</p>);
    }
  }
  flushList();
  return elements;
}

// ---------------------------------------------------------------------------
// Suggested AI questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "Give me a full health analysis based on all my data",
  "What do my genetics say about my diet and supplements?",
  "Analyze my sleep patterns and give me recommendations",
  "How are my lab results? Anything outside optimal range?",
  "Review my supplement protocol against my genetic profile",
  "What dietary changes should I make based on my glucose data?",
  "How is my blood pressure trending and what can I improve?",
  "Build me a personalized exercise program",
];

// Exercise plan keywords that trigger plan generation
const EXERCISE_PLAN_TRIGGERS = [
  "exercise program", "exercise plan", "workout program", "workout plan",
  "training program", "training plan", "build me a program", "build me a plan",
  "create.*exercise", "create.*workout", "make me a workout", "design.*program",
  "exercise protocol", "workout protocol",
];

function isExercisePlanRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return EXERCISE_PLAN_TRIGGERS.some((t) => new RegExp(t, "i").test(lower));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ExercisePlan {
  programName: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  focusAreas: string[];
  rationale: string;
  sessions: Array<{
    dayNumber: number;
    dayLabel: string;
    name: string;
    type: string;
    estimatedMinutes: number;
    warmup?: string;
    exercises: Array<{
      name: string;
      muscleGroups?: string[];
      sets: number;
      reps: string;
      tempo?: string;
      restSeconds?: number;
      notes?: string;
    }>;
    cooldown?: string;
    coachNotes?: string;
  }>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessage = {
  id: string;
  role: "client" | "ai_coach" | "coach";
  body: string;
  createdAt: string;
  isStreaming?: boolean;
  readAt?: string | null;
};

type TabType = "ai" | "coach";

// ---------------------------------------------------------------------------
// AI Chat Tab Component
// ---------------------------------------------------------------------------

function AIChatTab() {
  const [input, setInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Exercise plan state
  const [exercisePlan, setExercisePlan] = useState<ExercisePlan | null>(null);
  const [exercisePlanLoading, setExercisePlanLoading] = useState(false);
  const [exercisePlanSaving, setExercisePlanSaving] = useState(false);
  const [exercisePlanSaved, setExercisePlanSaved] = useState(false);
  const [exercisePlanError, setExercisePlanError] = useState<string | null>(null);
  const [exercisePlanRequest, setExercisePlanRequest] = useState<string>("");
  const [exerciseScreening, setExerciseScreening] = useState(false); // pre-screening questionnaire active
  const [screeningAnswers, setScreeningAnswers] = useState<string>(""); // accumulated screening context

  const createProgramMutation = trpc.clientPortal.workouts.createProgram.useMutation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const utils = trpc.useUtils();

  const startConversation = trpc.clientPortal.messaging.startConversation.useMutation({
    onSuccess: (conv) => setConversationId(conv.id),
  });

  const { data: conversations = [] } = trpc.clientPortal.messaging.listConversations.useQuery(
    { filter: "ai_coach" },
    { staleTime: 30_000 }
  );

  const existingConvId = conversations[0]?.id;
  const { data: existingMessages = [] } = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: existingConvId ?? "", limit: 50 },
    { enabled: !!existingConvId && chatMessages.length === 0 }
  );

  useEffect(() => {
    if (existingConvId && !conversationId) setConversationId(existingConvId);
  }, [existingConvId, conversationId]);

  useEffect(() => {
    if (existingMessages.length > 0 && chatMessages.length === 0) {
      setChatMessages(
        existingMessages.map((m) => ({
          id: m.id,
          role: m.senderRole as "client" | "ai_coach",
          body: m.body,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : (m.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
        }))
      );
      setShowSuggestions(false);
    }
  }, [existingMessages, chatMessages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const conv = await startConversation.mutateAsync({ coachId: null, coachName: "Everist AI", isAiCoach: true });
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId, startConversation]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming) return;
      setInput("");
      setShowSuggestions(false);

      const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: "client", body: text, createdAt: new Date().toISOString() };
      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: "ai_coach", body: "", createdAt: new Date().toISOString(), isStreaming: true };

      setChatMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsStreaming(true);

      try {
        const convId = await ensureConversation();
        const history = chatMessages.map((m) => ({ role: m.role, body: m.body }));
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId: convId, history }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.isStreaming) updated[updated.length - 1] = { ...last, body: last.body + data.text };
                  return updated;
                });
              } else if (data.type === "done") {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
                  return updated;
                });
              } else if (data.type === "error") { throw new Error(data.error); }
            } catch { /* skip */ }
          }
        }

        setChatMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
          return updated;
        });

        utils.clientPortal.messaging.listConversations.invalidate();
        utils.clientPortal.messaging.getMessages.invalidate();
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const errMsg = err instanceof Error ? err.message : "I'm sorry, I encountered an error. Please try again.";
        setChatMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.isStreaming) updated[updated.length - 1] = { ...last, body: errMsg, isStreaming: false };
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [input, isStreaming, chatMessages, ensureConversation, utils]
  );

  // Exercise plan generation
  const generateExercisePlan = useCallback(async (userRequest: string, refinement?: string) => {
    setExercisePlanLoading(true);
    setExercisePlanError(null);
    setExercisePlanSaved(false);
    setExercisePlanRequest(userRequest);

    const aiMsg: ChatMessage = {
      id: `ai-plan-${Date.now()}`,
      role: "ai_coach",
      body: refinement
        ? "Updating your exercise program based on your feedback..."
        : "Analyzing your health data and building a personalized exercise program...",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setChatMessages((prev) => [...prev, aiMsg]);

    try {
      const res = await fetch("/api/exercise/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRequest,
          refinement,
          previousPlan: refinement ? exercisePlan : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setExercisePlan(data.plan);
        setChatMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.isStreaming) {
            updated[updated.length - 1] = {
              ...last,
              body: `Here's your personalized **${data.plan.programName}** program.\n\n${data.plan.rationale}\n\n*Review the plan below. You can ask me to modify anything — change the number of days, swap exercises, adjust intensity, etc. When you're happy with it, hit "Save to Protocols".*`,
              isStreaming: false,
            };
          }
          return updated;
        });
      } else {
        throw new Error(data.error || "Failed to generate plan");
      }
    } catch (err) {
      setExercisePlanError(err instanceof Error ? err.message : "Failed to generate exercise plan");
      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) updated[updated.length - 1] = { ...last, body: "Sorry, I couldn't generate the exercise plan. Please try again.", isStreaming: false };
        return updated;
      });
    } finally {
      setExercisePlanLoading(false);
    }
  }, [exercisePlan]);

  const saveExercisePlan = useCallback(async () => {
    if (!exercisePlan) return;
    setExercisePlanSaving(true);
    try {
      await createProgramMutation.mutateAsync({
        name: exercisePlan.programName,
        description: exercisePlan.description,
        durationWeeks: exercisePlan.durationWeeks,
        isAiGenerated: true,
        schedule: { daysPerWeek: exercisePlan.daysPerWeek, focusAreas: exercisePlan.focusAreas },
        sessions: exercisePlan.sessions.map((s) => ({
          dayNumber: s.dayNumber,
          name: `${s.dayLabel}: ${s.name}`,
          exercises: s.exercises.map((e) => ({
            exerciseId: e.name.toLowerCase().replace(/\s+/g, "_"),
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            tempo: e.tempo,
            restSeconds: e.restSeconds,
            notes: e.notes,
          })),
        })),
      });
      setExercisePlanSaved(true);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-saved-${Date.now()}`,
          role: "ai_coach",
          body: `Your **${exercisePlan.programName}** has been saved and activated! You can view it on the **Workouts** page under Protocols. Let's get to work!`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setExercisePlanError("Failed to save the program. Please try again.");
    } finally {
      setExercisePlanSaving(false);
    }
  }, [exercisePlan, createProgramMutation]);

  // Override handleSend to detect exercise plan requests
  const originalHandleSend = handleSend;
  const wrappedHandleSend = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text) return;

    // If in screening mode, collect the answer and generate
    if (exerciseScreening) {
      setInput("");
      const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: "client", body: text, createdAt: new Date().toISOString() };
      setChatMessages((prev) => [...prev, userMsg]);

      // Combine original request + screening context
      const fullContext = `${exercisePlanRequest}\n\nIMPORTANT CLIENT HEALTH SCREENING:\n${text}`;
      setScreeningAnswers(text);
      setExerciseScreening(false);
      await generateExercisePlan(fullContext);
      return;
    }

    // If there's an active exercise plan and the user sends a message, treat it as refinement
    if (exercisePlan && !exercisePlanSaved) {
      setInput("");
      const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: "client", body: text, createdAt: new Date().toISOString() };
      setChatMessages((prev) => [...prev, userMsg]);
      await generateExercisePlan(exercisePlanRequest + (screeningAnswers ? `\n\nClient screening: ${screeningAnswers}` : ""), text);
      return;
    }

    // Check if this is an exercise plan request → start screening
    if (isExercisePlanRequest(text)) {
      setInput("");
      setExercisePlanRequest(text);
      setExerciseScreening(true);
      const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: "client", body: text, createdAt: new Date().toISOString() };
      const screenMsg: ChatMessage = {
        id: `ai-screen-${Date.now()}`,
        role: "ai_coach",
        body: `Great — I'll build you a personalized exercise program using your complete health profile (body composition, genetics, labs, sleep patterns, current supplements, peptides, and medications).\n\nBefore I design your program, I need to know a few things:\n\n**1. Injuries or pain** — Do you have any current injuries, joint pain, or areas of discomfort? (e.g., bad knee, lower back issues, shoulder impingement)\n\n**2. Medical conditions** — Any conditions your trainer should know about? (e.g., heart condition, high blood pressure, diabetes, osteoporosis)\n\n**3. Equipment access** — What equipment do you have access to? (full gym, home gym, bodyweight only)\n\n**4. Training experience** — How would you rate your training experience? (beginner, intermediate, advanced)\n\n**5. Schedule preference** — How many days per week can you train, and do you have time preferences? (e.g., "4-5 days, mornings")\n\nPlease share anything relevant — even "no issues, full gym, intermediate, 5 days" works!`,
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMsg, screenMsg]);
      return;
    }

    // Otherwise, use the normal chat flow
    await originalHandleSend(messageText);
  }, [input, exercisePlan, exercisePlanSaved, exercisePlanRequest, exerciseScreening, screeningAnswers, generateExercisePlan, originalHandleSend]);

  const handleNewChat = () => { setChatMessages([]); setConversationId(null); setShowSuggestions(true); setInput(""); setExercisePlan(null); setExercisePlanSaved(false); setExercisePlanError(null); setExerciseScreening(false); setScreeningAnswers(""); };

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const hasMessages = chatMessages.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* AI Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-kairos-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-kairos-gold/30 flex items-center justify-center">
          <Sparkles size={20} className="text-kairos-gold" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-semibold text-white">EVERIST AI Health Assistant</p>
          <p className="text-xs font-body text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Powered by Claude
          </p>
        </div>
        {hasMessages && (
          <button onClick={handleNewChat} className="text-kairos-silver-dark hover:text-white transition-colors p-2 rounded-lg hover:bg-kairos-royal-surface" title="New conversation">
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Welcome / Suggestions */}
      {showSuggestions && !hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-kairos-gold/20 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-kairos-gold" />
          </div>
          <h3 className="font-heading font-bold text-lg text-white mb-2 text-center">
            Hi! I&apos;m your EVERIST AI health analyst
          </h3>
          <p className="text-sm font-body text-kairos-silver-dark text-center max-w-md mb-6">
            I have access to your genetics, labs, CGM data, blood pressure, sleep, and protocols.
            What would you like to know?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} onClick={() => wrappedHandleSend(q)} className="text-left px-3 py-2.5 rounded-xl border border-kairos-border bg-kairos-card hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all text-sm font-body text-kairos-silver-dark hover:text-white group">
                <span className="flex items-start gap-2">
                  <MessageSquare size={12} className="text-kairos-gold/50 group-hover:text-kairos-gold mt-0.5 flex-shrink-0" />
                  {q}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-3 custom-scrollbar">
          {chatMessages.map((msg) => {
            const isMe = msg.role === "client";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2.5 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1", isMe ? "bg-kairos-gold/20" : "bg-gradient-to-br from-purple-500/20 to-kairos-gold/20")}>
                    {isMe ? <User size={14} className="text-kairos-gold" /> : <Sparkles size={14} className="text-kairos-gold" />}
                  </div>
                  <div>
                    <div className={cn("px-4 py-3 rounded-2xl", isMe ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm" : "bg-kairos-card border border-kairos-border text-kairos-silver rounded-bl-sm")}>
                      {isMe ? (
                        <p className="text-sm font-body">{msg.body}</p>
                      ) : msg.isStreaming && !msg.body ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 size={14} className="animate-spin text-kairos-gold" />
                          <span className="text-sm font-body text-kairos-silver-dark">Thinking...</span>
                        </div>
                      ) : (
                        <div className="prose-kairos">{renderMarkdown(msg.body)}</div>
                      )}
                      {msg.isStreaming && msg.body && (
                        <span className="inline-block w-1.5 h-4 bg-kairos-gold/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                      )}
                    </div>
                    <p className={`text-[10px] font-body text-kairos-silver-dark mt-1 ${isMe ? "text-right" : ""}`}>
                      {msg.isStreaming ? "" : formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Exercise Plan Preview Card */}
          {exercisePlan && (
            <div className="mx-2 mb-4">
              <div className="bg-kairos-royal-surface border border-kairos-gold/30 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-kairos-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-white text-lg">{exercisePlan.programName}</h3>
                    <span className="text-[10px] px-2 py-1 rounded bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/30 font-heading">
                      {exercisePlan.daysPerWeek} days/week &bull; {exercisePlan.durationWeeks} weeks
                    </span>
                  </div>
                  <p className="text-xs text-kairos-silver-dark">{exercisePlan.description}</p>
                  {exercisePlan.focusAreas.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {exercisePlan.focusAreas.map((f, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-kairos-border/50 max-h-[400px] overflow-y-auto">
                  {exercisePlan.sessions.map((session) => (
                    <div key={session.dayNumber} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-heading font-bold text-kairos-gold">{session.dayLabel}</span>
                          <span className="text-sm font-heading font-semibold text-white">{session.name}</span>
                        </div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded border font-heading",
                          session.type === "strength" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          session.type === "cardio" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          session.type === "hiit" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          session.type === "rest" ? "bg-gray-500/10 text-gray-400 border-gray-500/20" :
                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        )}>{session.type} &bull; {session.estimatedMinutes}min</span>
                      </div>
                      {session.exercises.length > 0 && (
                        <div className="space-y-1">
                          {session.exercises.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-kairos-silver">{ex.name}</span>
                              <span className="text-kairos-silver-dark">{ex.sets} x {ex.reps}{ex.restSeconds ? ` / ${ex.restSeconds}s rest` : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {session.coachNotes && <p className="text-[10px] text-kairos-silver-dark mt-1 italic">{session.coachNotes}</p>}
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-kairos-border flex items-center justify-between">
                  {exercisePlanSaved ? (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-heading">
                      <Check size={16} /> Saved to Protocols!
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-kairos-silver-dark">Ask me to change anything, or save when ready</p>
                      <button
                        onClick={saveExercisePlan}
                        disabled={exercisePlanSaving}
                        className="kairos-btn-gold px-4 py-2 rounded-lg text-sm font-heading font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        {exercisePlanSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Save to Protocols
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-kairos-border flex items-center gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); wrappedHandleSend(); } }}
          placeholder={exerciseScreening ? "Describe any injuries, conditions, equipment, experience level..." : exercisePlan && !exercisePlanSaved ? "Tell me what to change..." : isStreaming ? "Waiting for response..." : "Ask about your health, nutrition, exercise..."}
          disabled={isStreaming || exercisePlanLoading}
          className="kairos-input flex-1 disabled:opacity-50"
        />
        <button onClick={() => wrappedHandleSend()} disabled={!input.trim() || isStreaming || exercisePlanLoading} className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed">
          {isStreaming || exercisePlanLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="text-[10px] font-body text-kairos-silver-dark text-center py-1">
        EVERIST AI analyzes your complete health profile. Always consult your healthcare provider.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coach Chat Tab Component
// ---------------------------------------------------------------------------

function CoachChatTab({ coachName, coachId }: { coachName: string; coachId: string }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Find or create conversation with coach
  const { data: conversations = [] } = trpc.clientPortal.messaging.listConversations.useQuery(
    { filter: "human_coach" },
    { staleTime: 10_000 }
  );

  const coachConv = useMemo(() => conversations.find((c) => c.coachId === coachId), [conversations, coachId]);

  const startConversation = trpc.clientPortal.messaging.startConversation.useMutation({
    onSuccess: () => utils.clientPortal.messaging.listConversations.invalidate(),
  });

  const { data: messages = [] } = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: coachConv?.id ?? "", limit: 50 },
    { enabled: !!coachConv?.id, refetchInterval: 10_000 }
  );

  const sendMessage = trpc.clientPortal.messaging.sendMessage.useMutation({
    onSuccess: () => {
      utils.clientPortal.messaging.getMessages.invalidate();
      utils.clientPortal.messaging.listConversations.invalidate();
    },
  });

  const markAsRead = trpc.clientPortal.messaging.markAsRead.useMutation();

  // Mark as read when viewing
  useEffect(() => {
    if (coachConv?.id && coachConv.unreadCount && coachConv.unreadCount > 0) {
      markAsRead.mutate({ conversationId: coachConv.id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachConv?.id, coachConv?.unreadCount]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    let convId = coachConv?.id;
    if (!convId) {
      const conv = await startConversation.mutateAsync({ coachId, coachName, isAiCoach: false });
      convId = conv.id;
    }

    sendMessage.mutate({ conversationId: convId, body: text });
    inputRef.current?.focus();
  }, [input, coachConv?.id, coachId, coachName, startConversation, sendMessage]);

  function formatTime(timestamp: string | Date): string {
    const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDate(timestamp: string | Date): string {
    const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const dateStr = formatDate(msg.createdAt);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Coach Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-kairos-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-emerald-500/30 flex items-center justify-center">
          <UserCircle size={20} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-semibold text-white">{coachName}</p>
          <p className="text-xs font-body text-kairos-silver-dark">Your Health Coach</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-kairos-silver-dark hover:text-emerald-400 hover:bg-kairos-royal-surface transition-colors" title="Video call">
            <Video size={16} />
          </button>
          <button className="p-2 rounded-lg text-kairos-silver-dark hover:text-emerald-400 hover:bg-kairos-royal-surface transition-colors" title="Schedule session">
            <Calendar size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
              <UserCircle size={28} className="text-emerald-400" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-2">Message {coachName}</h3>
            <p className="text-sm font-body text-kairos-silver-dark max-w-sm mb-6">
              Send your coach a message about your progress, questions, or concerns.
              They&apos;ll respond as soon as they&apos;re available.
            </p>
            <div className="flex gap-3">
              <button className="kairos-btn-outline flex items-center gap-2 text-sm" title="Schedule a video call">
                <Video size={14} />
                Schedule Video Call
              </button>
              <button className="kairos-btn-outline flex items-center gap-2 text-sm" title="Schedule a session">
                <Calendar size={14} />
                Book Session
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-kairos-border" />
                  <span className="text-[10px] font-body text-kairos-silver-dark">{group.date}</span>
                  <div className="flex-1 h-px bg-kairos-border" />
                </div>
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isMe = msg.senderRole === "client";
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`flex gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/30 to-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                              <UserCircle size={12} className="text-emerald-400" />
                            </div>
                          )}
                          <div>
                            <div className={cn("px-3.5 py-2.5 rounded-2xl", isMe ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm" : "bg-kairos-card border border-kairos-border text-kairos-silver rounded-bl-sm")}>
                              <p className="text-sm font-body">{msg.body}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-0.5 ${isMe ? "justify-end" : ""}`}>
                              <span className="text-[10px] font-body text-kairos-silver-dark">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                msg.readAt
                                  ? <CheckCheck size={10} className="text-emerald-400" />
                                  : <Check size={10} className="text-kairos-silver-dark" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input with attachments */}
      <div className="px-4 py-3 border-t border-kairos-border">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-kairos-silver-dark hover:text-kairos-gold hover:bg-kairos-royal-surface transition-colors" title="Attach file">
            <Paperclip size={16} />
          </button>
          <button className="p-2 rounded-lg text-kairos-silver-dark hover:text-kairos-gold hover:bg-kairos-royal-surface transition-colors" title="Send image">
            <ImageIcon size={16} />
          </button>
          <button className="p-2 rounded-lg text-kairos-silver-dark hover:text-kairos-gold hover:bg-kairos-royal-surface transition-colors" title="Share report">
            <FileText size={16} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message your coach..."
            disabled={sendMessage.isPending}
            className="kairos-input flex-1 disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed">
            {sendMessage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No Coach Assigned State
// ---------------------------------------------------------------------------

function NoCoachState() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-kairos-royal-surface flex items-center justify-center mb-4">
        <UserCircle size={36} className="text-kairos-silver-dark" />
      </div>
      <h3 className="font-heading font-bold text-lg text-white mb-2">No Coach Assigned</h3>
      <p className="text-sm font-body text-kairos-silver-dark max-w-sm mb-6">
        You don&apos;t have a coach assigned to your account yet. Contact your administrator
        to get paired with a health coach for personalized guidance.
      </p>
      <div className="kairos-card max-w-sm w-full">
        <h4 className="font-heading font-semibold text-white text-sm mb-2">What a coach can do for you</h4>
        <div className="space-y-2">
          {[
            { icon: <MessageSquare size={14} />, text: "Direct messaging and support" },
            { icon: <Video size={14} />, text: "Video consultations" },
            { icon: <Calendar size={14} />, text: "Scheduled check-ins" },
            { icon: <FileText size={14} />, text: "Personalized protocols and plans" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm font-body text-kairos-silver-dark">
              <span className="text-kairos-gold">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Page
// ---------------------------------------------------------------------------

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading chat...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "coach" ? "coach" : "ai";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Check for assigned coach via trainer_client_relationships
  const { data: coachConversations = [] } = trpc.clientPortal.messaging.listConversations.useQuery(
    { filter: "human_coach" },
    { staleTime: 30_000 }
  );

  // Also check scheduling for coach info
  const { data: appointments = [] } = trpc.clientPortal.scheduling.listAppointments.useQuery(
    { filter: "upcoming" },
    { staleTime: 60_000, retry: false }
  );

  // Derive coach info from conversations or appointments
  const coachInfo = useMemo(() => {
    // Check if there's an existing coach conversation
    const coachConv = coachConversations.find((c) => c.coachId);
    if (coachConv) {
      return { id: coachConv.coachId!, name: coachConv.coachName ?? "Your Coach" };
    }
    // Check appointments for coach info
    const upcoming = appointments[0];
    if (upcoming && "coachId" in upcoming && "coachName" in upcoming) {
      return { id: upcoming.coachId as string, name: (upcoming.coachName as string) ?? "Your Coach" };
    }
    return null;
  }, [coachConversations, appointments]);

  const hasCoach = !!coachInfo;

  // Count unread coach messages for badge
  const coachUnread = useMemo(() => {
    return coachConversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  }, [coachConversations]);

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fade-in">
      {/* Tab Bar */}
      <div className="kairos-card mb-0 rounded-b-none flex items-center gap-0 p-0">
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-heading font-semibold transition-all border-b-2",
            activeTab === "ai"
              ? "text-kairos-gold border-kairos-gold bg-kairos-gold/5"
              : "text-kairos-silver-dark border-transparent hover:text-white hover:bg-kairos-royal-surface/50"
          )}
        >
          <Sparkles size={16} />
          AI Assistant
        </button>
        <button
          onClick={() => setActiveTab("coach")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-heading font-semibold transition-all border-b-2 relative",
            activeTab === "coach"
              ? "text-emerald-400 border-emerald-400 bg-emerald-400/5"
              : "text-kairos-silver-dark border-transparent hover:text-white hover:bg-kairos-royal-surface/50"
          )}
        >
          <UserCircle size={16} />
          My Coach
          {coachUnread > 0 && (
            <span className="absolute top-2 right-[calc(50%-40px)] w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {coachUnread > 9 ? "9+" : coachUnread}
            </span>
          )}
          {!hasCoach && (
            <span className="text-[10px] font-body text-kairos-silver-dark ml-1">(none)</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 kairos-card mt-0 rounded-t-none border-t-0">
        {activeTab === "ai" && <AIChatTab />}
        {activeTab === "coach" && (
          hasCoach ? (
            <CoachChatTab coachId={coachInfo!.id} coachName={coachInfo!.name} />
          ) : (
            <NoCoachState />
          )
        )}
      </div>
    </div>
  );
}
