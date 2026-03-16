"use client";

import { MessageSquare, Settings, Calendar, Clock, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });
  // Mock client data
  const client = {
    id: params.id,
    name: "Sarah Mitchell",
    tier: "Tier 1 Private",
    healthScore: 87,
    memberSince: "March 2023",
    lastActive: "2 hours ago",
    avatar: "SM",
    adherence: 92,
    avgGlucose: 105,
    sleepScore: 78,
    hrv: 52,
    checkInStreak: 12,
    activeAlerts: 2,
  };

  const protocol = {
    name: "Metabolic Optimization Phase 2",
    startDate: "February 15, 2024",
    duration: "12 weeks",
    progress: 65,
    goals: [
      "Reduce fasting glucose to <100 mg/dL",
      "Optimize circadian rhythm sleep pattern",
      "Increase HRV by 15%",
      "Maintain adherence >90%",
    ],
  };

  const glucoseData = [105, 98, 112, 102, 95, 108, 101];
  const sleepData = [7.2, 6.8, 7.5, 7.1, 6.9, 7.4, 7.0];
  const weightData = [168, 167.5, 167, 166.8, 166.5];

  const alerts = [
    {
      id: 1,
      priority: "high",
      message: "Glucose levels elevated at 3 consecutive readings",
      timestamp: "4 hours ago",
    },
    {
      id: 2,
      priority: "medium",
      message: "Sleep duration below target (6.5 hours last night)",
      timestamp: "18 hours ago",
    },
  ];

  const activities = [
    {
      id: 1,
      type: "check-in",
      label: "Morning Check-in",
      timestamp: "Today at 8:15 AM",
    },
    {
      id: 2,
      type: "supplement",
      label: "Logged supplement: Omega-3",
      timestamp: "Today at 7:30 AM",
    },
    {
      id: 3,
      type: "workout",
      label: "Completed 45-min cardio session",
      timestamp: "Yesterday at 6:00 PM",
    },
    {
      id: 4,
      type: "chat",
      label: "Coach message: Protocol adjustment advice",
      timestamp: "2 days ago",
    },
    {
      id: 5,
      type: "lab",
      label: "Lab results uploaded: Metabolic panel",
      timestamp: "3 days ago",
    },
  ];

  return (
    <div className="min-h-screen bg-kairos-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Client Header */}
        <div className="kairos-card mb-6 animate-fade-in">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-kairos-sm bg-kairos-gold flex items-center justify-center text-kairos-dark font-heading text-xl font-bold">
                {client.avatar}
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold text-kairos-silver mb-2">
                  {client.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="inline-block px-3 py-1 bg-kairos-gold text-kairos-dark text-sm font-semibold rounded-kairos-sm">
                    {client.tier}
                  </span>
                  <span className="font-body text-kairos-silver-dark text-sm">
                    Member since {client.memberSince}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <div className="text-5xl font-heading font-bold text-kairos-gold mb-1">
                  {client.healthScore}
                </div>
                <div className="font-body text-kairos-silver-dark text-sm">/100 Health Score</div>
              </div>
              <div className="font-body text-kairos-silver-dark text-sm mt-4">
                Last active: {client.lastActive}
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Navigator */}
        <div className="mb-6">
          <DateRangeNavigator
            availablePeriods={["week", "month", "quarter"]}
            selectedPeriod={period}
            onPeriodChange={setPeriod}
            formattedRange={formattedRange}
            isCurrent={isCurrent}
            canForward={canForward}
            onBack={goBack}
            onForward={goForward}
            onToday={goToToday}
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">Adherence</div>
            <div className="font-heading text-2xl font-bold text-kairos-gold">{client.adherence}%</div>
          </div>
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">
              Avg Glucose
            </div>
            <div className="font-heading text-2xl font-bold text-kairos-gold">
              {client.avgGlucose}
              <span className="text-sm text-kairos-silver-dark ml-1">mg/dL</span>
            </div>
          </div>
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">Sleep</div>
            <div className="font-heading text-2xl font-bold text-kairos-gold">{client.sleepScore}</div>
          </div>
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">HRV</div>
            <div className="font-heading text-2xl font-bold text-kairos-gold">
              {client.hrv}
              <span className="text-sm text-kairos-silver-dark ml-1">ms</span>
            </div>
          </div>
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">
              Check-in Streak
            </div>
            <div className="font-heading text-2xl font-bold text-kairos-gold">
              {client.checkInStreak}
              <span className="text-sm text-kairos-silver-dark ml-1">days</span>
            </div>
          </div>
          <div className="kairos-card text-center animate-fade-in">
            <div className="font-body text-kairos-silver-dark text-xs uppercase mb-2">
              Active Alerts
            </div>
            <div className="font-heading text-2xl font-bold text-orange-400">{client.activeAlerts}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Protocol & Biometrics */}
          <div className="col-span-2 space-y-6">
            {/* Current Protocol */}
            <div className="kairos-card animate-fade-in">
              <h2 className="font-heading text-xl font-bold text-kairos-gold mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Current Protocol
              </h2>
              <div className="mb-4">
                <h3 className="font-heading text-lg font-semibold text-kairos-silver mb-2">
                  {protocol.name}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4 font-body text-kairos-silver-dark text-sm">
                  <div>
                    <span className="text-kairos-silver-dark text-xs uppercase">Start Date:</span>
                    <div>{protocol.startDate}</div>
                  </div>
                  <div>
                    <span className="text-kairos-silver-dark text-xs uppercase">Duration:</span>
                    <div>{protocol.duration}</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body text-kairos-silver-dark text-sm">Progress</span>
                  <span className="font-heading text-kairos-gold font-semibold">{protocol.progress}%</span>
                </div>
                <div className="w-full h-2 bg-kairos-dark rounded-kairos-sm overflow-hidden border border-kairos-border">
                  <div
                    className="h-full bg-kairos-gold transition-all duration-300"
                    style={{ width: `${protocol.progress}%` }}
                  />
                </div>
              </div>

              {/* Goals List */}
              <div>
                <h4 className="font-heading text-sm font-semibold text-kairos-gold mb-3 uppercase">
                  Goals
                </h4>
                <ul className="space-y-2">
                  {protocol.goals.map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-kairos-gold mt-1">•</span>
                      <span className="font-body text-kairos-silver text-sm">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recent Biometrics */}
            <div className="kairos-card animate-fade-in">
              <h2 className="font-heading text-xl font-bold text-kairos-gold mb-4 flex items-center gap-2">
                <Activity size={20} />
                Recent Biometrics
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {/* Glucose Chart */}
                <div>
                  <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-3">
                    Glucose (7d)
                  </h3>
                  <svg viewBox="0 0 100 60" className="w-full h-24 mb-2">
                    <polyline
                      points={glucoseData
                        .map((val, i) => `${(i / (glucoseData.length - 1)) * 100},${60 - (val / 120) * 50}`)
                        .join(" ")}
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                    />
                    <circle cx="0" cy={60 - (glucoseData[0] / 120) * 50} r="1.5" fill="#D4AF37" />
                    <circle
                      cx="100"
                      cy={60 - (glucoseData[glucoseData.length - 1] / 120) * 50}
                      r="1.5"
                      fill="#D4AF37"
                    />
                  </svg>
                  <div className="font-body text-kairos-silver-dark text-xs text-center">
                    Avg: {(glucoseData.reduce((a, b) => a + b) / glucoseData.length).toFixed(0)} mg/dL
                  </div>
                </div>

                {/* Sleep Chart */}
                <div>
                  <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-3">
                    Sleep (7d)
                  </h3>
                  <svg viewBox="0 0 100 60" className="w-full h-24 mb-2">
                    <polyline
                      points={sleepData
                        .map((val, i) => `${(i / (sleepData.length - 1)) * 100},${60 - (val / 9) * 50}`)
                        .join(" ")}
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                    />
                    <circle cx="0" cy={60 - (sleepData[0] / 9) * 50} r="1.5" fill="#D4AF37" />
                    <circle
                      cx="100"
                      cy={60 - (sleepData[sleepData.length - 1] / 9) * 50}
                      r="1.5"
                      fill="#D4AF37"
                    />
                  </svg>
                  <div className="font-body text-kairos-silver-dark text-xs text-center">
                    Avg: {(sleepData.reduce((a, b) => a + b) / sleepData.length).toFixed(1)} hrs
                  </div>
                </div>

                {/* Weight Chart */}
                <div>
                  <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-3">
                    Weight (4w)
                  </h3>
                  <svg viewBox="0 0 100 60" className="w-full h-24 mb-2">
                    <polyline
                      points={weightData
                        .map((val, i) => `${(i / (weightData.length - 1)) * 100},${60 - (val - 166) * 10}`)
                        .join(" ")}
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="1.5"
                    />
                    <circle cx="0" cy={60 - (weightData[0] - 166) * 10} r="1.5" fill="#D4AF37" />
                    <circle
                      cx="100"
                      cy={60 - (weightData[weightData.length - 1] - 166) * 10}
                      r="1.5"
                      fill="#D4AF37"
                    />
                  </svg>
                  <div className="font-body text-kairos-silver-dark text-xs text-center">
                    Current: {weightData[weightData.length - 1]} lbs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Alerts & Activity */}
          <div className="space-y-6">
            {/* Active Alerts */}
            <div className="kairos-card animate-fade-in">
              <h2 className="font-heading text-xl font-bold text-kairos-gold mb-4 flex items-center gap-2">
                <AlertCircle size={20} />
                Active Alerts
              </h2>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-kairos-sm border-l-4 ${
                      alert.priority === "high"
                        ? "border-orange-400 bg-orange-400 bg-opacity-10"
                        : "border-yellow-400 bg-yellow-400 bg-opacity-10"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={16}
                        className={alert.priority === "high" ? "text-orange-400" : "text-yellow-400"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-kairos-silver text-sm leading-snug">
                          {alert.message}
                        </p>
                        <p className="font-body text-kairos-silver-dark text-xs mt-1">{alert.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="kairos-card animate-fade-in">
              <h2 className="font-heading text-xl font-bold text-kairos-gold mb-4 flex items-center gap-2">
                <Clock size={20} />
                Recent Activity
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activities.map((activity, idx) => (
                  <div key={activity.id} className="flex gap-3 pb-3 border-b border-kairos-border last:border-b-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-kairos-gold bg-opacity-20 flex items-center justify-center text-kairos-gold text-xs font-bold">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-kairos-silver text-sm leading-snug">
                        {activity.label}
                      </p>
                      <p className="font-body text-kairos-silver-dark text-xs mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <button className="kairos-card hover:bg-kairos-card-hover transition-colors flex items-center justify-center gap-2 py-3 animate-fade-in">
            <MessageSquare size={18} className="text-kairos-gold" />
            <span className="font-body font-semibold text-kairos-silver">Send Message</span>
          </button>
          <button className="kairos-card hover:bg-kairos-card-hover transition-colors flex items-center justify-center gap-2 py-3 animate-fade-in">
            <Settings size={18} className="text-kairos-gold" />
            <span className="font-body font-semibold text-kairos-silver">Adjust Protocol</span>
          </button>
          <button className="kairos-card hover:bg-kairos-card-hover transition-colors flex items-center justify-center gap-2 py-3 animate-fade-in">
            <Calendar size={18} className="text-kairos-gold" />
            <span className="font-body font-semibold text-kairos-silver">Schedule Session</span>
          </button>
          <button className="kairos-card hover:bg-kairos-card-hover transition-colors flex items-center justify-center gap-2 py-3 animate-fade-in">
            <Activity size={18} className="text-kairos-gold" />
            <span className="font-body font-semibold text-kairos-silver">View Full History</span>
          </button>
        </div>
      </div>
    </div>
  );
}
