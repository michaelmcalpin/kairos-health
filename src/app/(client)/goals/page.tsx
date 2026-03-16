"use client";

import { GoalsDashboard } from "@/components/goals/GoalsDashboard";

export default function GoalsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">Health Goals</h1>
        <p className="text-gray-400 mt-1">
          Set measurable targets, track your progress, and celebrate milestones.
        </p>
      </div>

      <GoalsDashboard />
    </div>
  );
}
