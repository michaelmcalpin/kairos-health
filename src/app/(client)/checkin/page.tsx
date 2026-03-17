"use client";

import { useState } from "react";
import { CheckCircle, ChevronRight, Smile, Meh, Frown, Zap, Moon, Pill } from "lucide-react";
import { CHECKIN_STEPS, SYMPTOM_OPTIONS } from "@/lib/client-ops/types";

const steps = CHECKIN_STEPS;
const symptomOptions = SYMPTOM_OPTIONS;

export default function CheckinPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const step = steps[currentStep];

  function next(data: Record<string, unknown>) {
    setAnswers((prev) => ({ ...prev, ...data }));
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }

  const progress = Math.round((currentStep / (steps.length - 1)) * 100);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div>
        <div className="flex justify-between mb-2">
          <h2 className="font-heading font-bold text-xl text-white">Daily Check-in</h2>
          <span className="text-xs font-heading text-kairos-silver-dark">{currentStep + 1}/{steps.length}</span>
        </div>
        <div className="h-1.5 bg-kairos-card rounded-full overflow-hidden">
          <div className="h-full bg-kairos-gold rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === "mood" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white">How are you feeling today?</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Great", icon: <Smile size={28} />, value: 5, color: "text-green-400" },
              { label: "Okay", icon: <Meh size={28} />, value: 3, color: "text-yellow-400" },
              { label: "Not Good", icon: <Frown size={28} />, value: 1, color: "text-red-400" },
            ].map((option) => (
              <button key={option.label} onClick={() => next({ mood: option.value })} className="kairos-card hover:border-kairos-gold/50 transition-colors py-6 flex flex-col items-center gap-2">
                <span className={option.color}>{option.icon}</span>
                <span className="text-sm font-heading text-kairos-silver">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "energy" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white flex items-center gap-2"><Zap size={18} className="text-kairos-gold" /> Energy Level</h3>
          <div className="space-y-2">
            {[
              { label: "High — feeling energized and sharp", value: 5 },
              { label: "Good — normal energy", value: 4 },
              { label: "Moderate — a bit sluggish", value: 3 },
              { label: "Low — fatigued", value: 2 },
              { label: "Very low — exhausted", value: 1 },
            ].map((option) => (
              <button key={option.value} onClick={() => next({ energy: option.value })} className="w-full text-left flex items-center justify-between px-4 py-3 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/50 hover:bg-kairos-card-hover transition-colors">
                <span className="text-sm font-body text-white">{option.label}</span>
                <ChevronRight size={16} className="text-kairos-silver-dark" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "sleep" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white flex items-center gap-2"><Moon size={18} className="text-kairos-gold" /> How did you sleep?</h3>
          <div className="space-y-2">
            {[
              { label: "Excellent — woke refreshed", value: 5 },
              { label: "Good — slept well", value: 4 },
              { label: "Fair — some interruptions", value: 3 },
              { label: "Poor — restless night", value: 2 },
              { label: "Terrible — barely slept", value: 1 },
            ].map((option) => (
              <button key={option.value} onClick={() => next({ sleepQuality: option.value })} className="w-full text-left flex items-center justify-between px-4 py-3 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/50 hover:bg-kairos-card-hover transition-colors">
                <span className="text-sm font-body text-white">{option.label}</span>
                <ChevronRight size={16} className="text-kairos-silver-dark" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "symptoms" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white">Any symptoms today?</h3>
          <p className="text-xs font-body text-kairos-silver-dark">Select all that apply, or skip if none.</p>
          <div className="grid grid-cols-2 gap-2">
            {symptomOptions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (s === "None") { setSelectedSymptoms(["None"]); return; }
                  setSelectedSymptoms((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev.filter((x) => x !== "None"), s]
                  );
                }}
                className={`px-3 py-2 rounded-kairos-sm text-sm font-body border transition-colors ${
                  selectedSymptoms.includes(s)
                    ? "border-kairos-gold bg-kairos-gold/10 text-kairos-gold"
                    : "border-kairos-border text-kairos-silver hover:border-kairos-gold/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={() => next({ symptoms: selectedSymptoms.length ? selectedSymptoms : ["None"] })} className="kairos-btn-gold w-full">
            Continue
          </button>
        </div>
      )}

      {step === "adherence" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white flex items-center gap-2"><Pill size={18} className="text-kairos-gold" /> Protocol Adherence</h3>
          <p className="text-xs font-body text-kairos-silver-dark">Did you take your supplements as prescribed?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "All taken", value: "full" },
              { label: "Missed some", value: "partial" },
              { label: "Missed all", value: "none" },
              { label: "N/A", value: "na" },
            ].map((option) => (
              <button key={option.value} onClick={() => next({ adherence: option.value })} className="px-4 py-3 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/50 hover:bg-kairos-card-hover transition-colors text-sm font-body text-white">
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "notes" && (
        <div className="kairos-card space-y-4">
          <h3 className="font-heading font-semibold text-white">Anything else to note?</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional: meals, stress, exercise, or anything your coach should know..."
            className="kairos-input w-full h-32 resize-none"
          />
          <button onClick={() => next({ notes })} className="kairos-btn-gold w-full">
            Submit Check-in
          </button>
        </div>
      )}

      {step === "complete" && (
        <div className="kairos-card text-center py-10">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h3 className="font-heading font-bold text-xl text-white mb-2">Check-in Complete!</h3>
          <p className="text-sm font-body text-kairos-silver-dark mb-6">
            Your responses have been recorded. Your coach will be notified of any concerns.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
            <div className="text-xs font-body text-kairos-silver-dark">Mood</div>
            <div className="text-xs font-heading text-white">{answers.mood === 5 ? "Great" : answers.mood === 3 ? "Okay" : "Not Good"}</div>
            <div className="text-xs font-body text-kairos-silver-dark">Energy</div>
            <div className="text-xs font-heading text-white">{String(answers.energy)}/5</div>
            <div className="text-xs font-body text-kairos-silver-dark">Sleep</div>
            <div className="text-xs font-heading text-white">{String(answers.sleepQuality)}/5</div>
            <div className="text-xs font-body text-kairos-silver-dark">Adherence</div>
            <div className="text-xs font-heading text-white">{String(answers.adherence)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
