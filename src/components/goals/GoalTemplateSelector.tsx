"use client";

import { useState } from "react";
import type { GoalTemplate } from "@/lib/goals/types";
import { GOAL_TEMPLATES } from "@/lib/goals/types";

interface GoalTemplateSelectorProps {
  onSelect: (template: GoalTemplate, startValue: number, customTarget?: number) => void;
  onCancel: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  glucose: "Glucose",
  sleep: "Sleep",
  weight: "Weight",
  body_fat: "Body Fat",
  activity: "Activity",
  nutrition: "Nutrition",
  supplements: "Supplements",
  fasting: "Fasting",
  labs: "Labs",
};

export function GoalTemplateSelector({ onSelect, onCancel }: GoalTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [startValue, setStartValue] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = Array.from(new Set(GOAL_TEMPLATES.map((t) => t.category)));
  const filtered = filterCategory === "all"
    ? GOAL_TEMPLATES
    : GOAL_TEMPLATES.filter((t) => t.category === filterCategory);

  function handleCreate() {
    if (!selectedTemplate || !startValue) return;
    const start = parseFloat(startValue);
    if (isNaN(start)) return;
    const target = customTarget ? parseFloat(customTarget) : undefined;
    onSelect(selectedTemplate, start, target);
  }

  if (selectedTemplate) {
    return (
      <div className="kairos-card p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{selectedTemplate.icon}</span>
          <div>
            <h3 className="font-heading font-bold text-white">{selectedTemplate.title}</h3>
            <p className="text-gray-500 text-xs">{selectedTemplate.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Starting Value ({selectedTemplate.defaultTarget.unit})
            </label>
            <input
              type="number"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none"
              placeholder={`Current ${selectedTemplate.defaultTarget.unit}`}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Target Value (default: {selectedTemplate.defaultTarget.value} {selectedTemplate.defaultTarget.unit})
            </label>
            <input
              type="number"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-[#D4AF37] focus:outline-none"
              placeholder={String(selectedTemplate.defaultTarget.value)}
            />
          </div>

          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Timeframe:</span> {selectedTemplate.timeframe}
            <span className="mx-2">|</span>
            <span className="text-gray-400">Direction:</span> {selectedTemplate.defaultTarget.direction}
          </div>

          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Milestones:</span>{" "}
            {selectedTemplate.suggestedMilestones.map((m) => m.label).join(" → ")}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setSelectedTemplate(null)}
            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition text-sm"
          >
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={!startValue}
            className={`px-6 py-2 rounded-lg font-semibold text-sm transition ${
              startValue
                ? "kairos-btn-gold hover:scale-105"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Create Goal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-white text-lg">Choose a Goal Template</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-white transition text-sm">
          Cancel
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1 rounded-full text-xs transition ${
            filterCategory === "all"
              ? "bg-[#D4AF37]/20 text-[#D4AF37]"
              : "bg-gray-800 text-gray-500 hover:text-gray-300"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              filterCategory === cat
                ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                : "bg-gray-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setSelectedTemplate(template)}
            className="kairos-card p-4 text-left hover:border-[#D4AF37]/50 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{template.icon}</span>
              <div>
                <div className="font-semibold text-white text-sm">{template.title}</div>
                <div className="text-gray-500 text-xs mt-1">{template.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                    {CATEGORY_LABELS[template.category] ?? template.category}
                  </span>
                  <span className="text-gray-600 text-xs">{template.timeframe}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
