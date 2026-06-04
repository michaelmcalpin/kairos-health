"use client";

import { useState } from "react";
import { Heart, Dumbbell, Apple, AlertTriangle } from "lucide-react";
import type { HealthHistoryData } from "@/lib/onboarding/types";
import { MEDICAL_CONDITIONS, EXERCISE_TYPES, DIET_TYPES } from "@/lib/onboarding/types";

interface HealthHistoryStepProps {
  data: Partial<HealthHistoryData>;
  onChange: (data: Partial<HealthHistoryData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function HealthHistoryStep({ data, onChange, onNext, onBack }: HealthHistoryStepProps) {
  const [section, setSection] = useState(0); // 0: body, 1: conditions, 2: exercise, 3: diet/concerns

  const conditions = data.medicalConditions ?? [];
  const exerciseTypes = data.exerciseTypes ?? [];

  function toggleCondition(c: string) {
    if (c === "None of the above") {
      onChange({ ...data, medicalConditions: ["None of the above"] });
    } else {
      const next = conditions.includes(c)
        ? conditions.filter((x) => x !== c)
        : [...conditions.filter((x) => x !== "None of the above"), c];
      onChange({ ...data, medicalConditions: next });
    }
  }

  function toggleExercise(t: string) {
    if (t === "None") {
      onChange({ ...data, exerciseTypes: ["None"] });
    } else {
      const next = exerciseTypes.includes(t)
        ? exerciseTypes.filter((x) => x !== t)
        : [...exerciseTypes.filter((x) => x !== "None"), t];
      onChange({ ...data, exerciseTypes: next });
    }
  }

  const sections = [
    // Section 0: Body
    <div key="body" className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Heart size={20} className="text-kairos-gold" />
        <h3 className="font-heading font-bold text-white text-lg">Body</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Current Weight (lbs)</label>
          <input type="number" value={data.currentWeight ?? ""} onChange={(e) => onChange({ ...data, currentWeight: e.target.value })}
            placeholder="185" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target Weight (lbs)</label>
          <input type="number" value={data.targetWeight ?? ""} onChange={(e) => onChange({ ...data, targetWeight: e.target.value })}
            placeholder="175" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Current Medications & Supplements</label>
        <textarea value={data.medications ?? ""} onChange={(e) => onChange({ ...data, medications: e.target.value })}
          placeholder="List any medications, supplements, or peptides you're currently taking..."
          rows={3} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold resize-none" />
      </div>
    </div>,

    // Section 1: Medical Conditions
    <div key="conditions" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={20} className="text-kairos-gold" />
        <h3 className="font-heading font-bold text-white text-lg">Medical History</h3>
      </div>
      <p className="text-sm text-gray-400">Select any conditions that apply to you (current or past):</p>
      <div className="grid grid-cols-2 gap-2">
        {MEDICAL_CONDITIONS.map((c) => (
          <button key={c} onClick={() => toggleCondition(c)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all border ${
              conditions.includes(c)
                ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold/50"
                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
            }`}>
            {c}
          </button>
        ))}
      </div>
    </div>,

    // Section 2: Exercise
    <div key="exercise" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Dumbbell size={20} className="text-kairos-gold" />
        <h3 className="font-heading font-bold text-white text-lg">Exercise Habits</h3>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">How often do you exercise?</label>
        <select value={data.exerciseFrequency ?? ""} onChange={(e) => onChange({ ...data, exerciseFrequency: e.target.value })}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold">
          <option value="">Select...</option>
          <option value="never">Rarely / Never</option>
          <option value="1-2">1-2 days/week</option>
          <option value="3-4">3-4 days/week</option>
          <option value="5-6">5-6 days/week</option>
          <option value="daily">Daily</option>
        </select>
      </div>
      <p className="text-sm text-gray-400">What types of exercise do you do?</p>
      <div className="grid grid-cols-2 gap-2">
        {EXERCISE_TYPES.map((t) => (
          <button key={t} onClick={() => toggleExercise(t)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all border ${
              exerciseTypes.includes(t)
                ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold/50"
                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
            }`}>
            {t}
          </button>
        ))}
      </div>
    </div>,

    // Section 3: Diet & Concerns
    <div key="diet" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Apple size={20} className="text-kairos-gold" />
        <h3 className="font-heading font-bold text-white text-lg">Diet & Health Concerns</h3>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Dietary Approach</label>
        <select value={data.dietType ?? ""} onChange={(e) => onChange({ ...data, dietType: e.target.value })}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold">
          <option value="">Select...</option>
          {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Top Health Concerns</label>
        <textarea value={data.healthConcerns ?? ""} onChange={(e) => onChange({ ...data, healthConcerns: e.target.value })}
          placeholder="What are your main health concerns? (e.g., aging, energy levels, gut health, body fat...)"
          rows={3} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold resize-none" />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Any injuries or physical limitations?</label>
        <textarea value={data.injuries ?? ""} onChange={(e) => onChange({ ...data, injuries: e.target.value })}
          placeholder="e.g., bad knee, lower back issues, shoulder impingement..."
          rows={2} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-kairos-gold resize-none" />
      </div>
    </div>,
  ];

  return (
    <div className="space-y-6">
      {/* Sub-step indicators */}
      <div className="flex gap-2">
        {["Body", "Medical", "Exercise", "Diet"].map((label, i) => (
          <button key={label} onClick={() => setSection(i)}
            className={`flex-1 py-2 text-xs font-heading font-semibold rounded-lg transition-all ${
              section === i ? "bg-kairos-gold text-black" : i < section ? "bg-kairos-gold/20 text-kairos-gold" : "bg-gray-800 text-gray-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {sections[section]}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={section > 0 ? () => setSection(section - 1) : onBack}
          className="px-6 py-2.5 rounded-xl text-sm font-heading font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 transition-all">
          Back
        </button>
        {section < sections.length - 1 ? (
          <button onClick={() => setSection(section + 1)}
            className="px-6 py-2.5 rounded-xl text-sm font-heading font-semibold bg-kairos-gold text-black hover:bg-kairos-gold/90 transition-all">
            Next
          </button>
        ) : (
          <button onClick={onNext}
            className="px-6 py-2.5 rounded-xl text-sm font-heading font-semibold bg-kairos-gold text-black hover:bg-kairos-gold/90 transition-all">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
