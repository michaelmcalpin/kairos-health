"use client";

import { useState } from "react";
import {
  Dumbbell,
  Heart,
  Flame,
  Timer,
  TrendingUp,
  Calendar,
  CheckCircle,
  Activity,
  Zap,
  Plus,
  X,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useWorkouts } from "@/hooks/client/useWorkouts";
import { trpc } from "@/lib/trpc";

// ─── Workout schedule data (local constants) ────────────────────
interface TodaysWorkout { name: string; duration: number; targetZone: string; time: string; }
interface WeeklyScheduleItem { day: string; type: string; color: string; }
interface HeartRateZone { zone: string; name: string; description: string; hrRange: string; benefits: string; }

const WORKOUT_TYPES = [
  { name: "Zone 2 Aerobic Base", duration: 45, zone: "Zone 2 (120-140 bpm)", time: "6:00 AM - 6:45 AM" },
  { name: "Upper Body Strength", duration: 55, zone: "Zone 3 (140-155 bpm)", time: "6:00 AM - 6:55 AM" },
  { name: "Rest & Recovery", duration: 20, zone: "Zone 1 (<120 bpm)", time: "7:00 AM - 7:20 AM" },
  { name: "HIIT Intervals", duration: 30, zone: "Zone 4-5 (155-180 bpm)", time: "6:00 AM - 6:30 AM" },
  { name: "Zone 2 Cardio", duration: 45, zone: "Zone 2 (120-140 bpm)", time: "6:00 AM - 6:45 AM" },
  { name: "Yoga & Mobility", duration: 40, zone: "Zone 1 (<120 bpm)", time: "7:00 AM - 7:40 AM" },
  { name: "Lower Body Strength", duration: 55, zone: "Zone 3 (140-155 bpm)", time: "6:00 AM - 6:55 AM" },
];

function getTodaysWorkout(dateRef: Date): TodaysWorkout {
  const dow = dateRef.getDay();
  const idx = dow === 0 ? 6 : dow - 1;
  const wt = WORKOUT_TYPES[idx];
  return { name: wt.name, duration: wt.duration, targetZone: wt.zone, time: wt.time };
}

function getWeeklySchedule(): WeeklyScheduleItem[] {
  return [
    { day: "Mon", type: "Zone 2 Cardio", color: "bg-blue-900/40" },
    { day: "Tue", type: "Strength Training", color: "bg-orange-900/40" },
    { day: "Wed", type: "Rest", color: "bg-gray-900/40" },
    { day: "Thu", type: "HIIT", color: "bg-red-900/40" },
    { day: "Fri", type: "Zone 2 Cardio", color: "bg-blue-900/40" },
    { day: "Sat", type: "Yoga/Mobility", color: "bg-purple-900/40" },
    { day: "Sun", type: "Strength Training", color: "bg-orange-900/40" },
  ];
}

function getHeartRateZones(): HeartRateZone[] {
  return [
    { zone: "Zone 1", name: "Recovery", description: "Light activity, active recovery", hrRange: "50-70% max HR", benefits: "Promotes blood flow and adaptation" },
    { zone: "Zone 2", name: "Aerobic Base", description: "Sustainable steady-state training", hrRange: "70-80% max HR", benefits: "Builds aerobic capacity and mitochondrial function" },
    { zone: "Zone 3", name: "Tempo", description: "Comfortably hard, conversation difficult", hrRange: "80-90% max HR", benefits: "Improves lactate threshold" },
    { zone: "Zone 4", name: "Threshold", description: "Hard effort, breathing elevated", hrRange: "90-95% max HR", benefits: "Strengthens anaerobic capacity" },
    { zone: "Zone 5", name: "VO2 Max", description: "Maximum sustainable effort", hrRange: "95-100% max HR", benefits: "Maximizes cardiovascular power" },
  ];
}

export default function WorkoutsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutDeferred, setWorkoutDeferred] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    duration: "",
    calories: "",
    avgHeartRate: "",
    maxHeartRate: "",
    notes: "",
  });

  const { records: workouts, stats: workoutStats } = useWorkouts(dateRange);
  const stats = workoutStats;

  const todaysWorkout = getTodaysWorkout(new Date());
  const weeklySchedule = getWeeklySchedule();
  const heartRateZones = getHeartRateZones();

  // tRPC mutation for saving workouts
  const saveWorkoutMutation = trpc.clientPortal.workouts.quickLog.useMutation({
    onSuccess: () => {
      // Reset form and close modal
      setFormData({
        type: "",
        duration: "",
        calories: "",
        avgHeartRate: "",
        maxHeartRate: "",
        notes: "",
      });
      setShowLogForm(false);
    },
    onError: (error) => {
      console.error("Failed to save workout:", error);
    },
  });

  const handleSaveWorkout = () => {
    // Map form data to mutation input
    const workoutType = (formData.type.toLowerCase().includes("strength") ? "strength" :
      formData.type.toLowerCase().includes("cardio") ? "cardio" :
      formData.type.toLowerCase().includes("hiit") ? "hiit" :
      formData.type.toLowerCase().includes("yoga") ? "yoga" :
      formData.type.toLowerCase().includes("stretch") ? "stretching" :
      formData.type.toLowerCase().includes("sport") ? "sports" : "other") as
      "strength" | "cardio" | "hiit" | "yoga" | "stretching" | "sports" | "other";

    saveWorkoutMutation.mutate({
      workoutType,
      durationMinutes: parseInt(formData.duration) || 0,
      caloriesBurned: formData.calories ? parseInt(formData.calories) : undefined,
      avgHeartRate: formData.avgHeartRate ? parseInt(formData.avgHeartRate) : undefined,
      maxHeartRate: formData.maxHeartRate ? parseInt(formData.maxHeartRate) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleCancelForm = () => {
    setFormData({
      type: "",
      duration: "",
      calories: "",
      avgHeartRate: "",
      maxHeartRate: "",
      notes: "",
    });
    setShowLogForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">Exercise Protocol</h1>
          <p className="text-kairos-silver-dark font-body">Longevity-focused training for optimal health and performance</p>
        </div>
        <div className="text-xs font-heading font-semibold px-4 py-2 rounded-kairos-sm bg-kairos-gold/20 text-kairos-gold">Active Plan</div>
      </div>

      <DateRangeNavigator
        availablePeriods={["week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Minutes", value: stats.totalMin.toLocaleString(), unit: "min" },
          { label: "Sessions", value: stats.sessions.toString(), unit: `of ${period === "week" ? "6" : "24"}` },
          { label: "Calories Burned", value: stats.totalCal.toLocaleString(), unit: "kcal" },
          { label: "Avg Heart Rate", value: stats.avgHR.toString(), unit: "bpm" },
        ].map((stat, i) => (
          <div key={i} className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:border-kairos-gold transition-colors">
            <p className="text-kairos-silver-dark text-sm font-body mb-2">{stat.label}</p>
            <p className="text-white font-heading text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-kairos-gold text-xs font-body">{stat.unit}</p>
          </div>
        ))}
      </div>

      {/* Today's Workout */}
      <div className="bg-gradient-to-r from-kairos-gold/10 to-transparent border border-kairos-gold/30 rounded-kairos-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white mb-2">Today&apos;s Workout</h2>
            <p className="text-kairos-silver-dark text-sm">{todaysWorkout.time}</p>
          </div>
          <Zap className="w-6 h-6 text-kairos-gold" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-2">Exercise</p>
            <p className="text-white font-heading font-semibold">{todaysWorkout.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-2">Target Duration</p>
            <p className="text-white font-heading font-semibold flex items-center gap-2"><Timer className="w-4 h-4 text-kairos-gold" />{todaysWorkout.duration} minutes</p>
          </div>
          <div>
            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-2">Target Heart Rate Zone</p>
            <p className="text-white font-heading font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-kairos-gold" />{todaysWorkout.targetZone}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {workoutDeferred ? (
            <span className="px-6 py-2 rounded-kairos-sm font-heading font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20">Deferred to Tomorrow</span>
          ) : workoutStarted ? (
            <button onClick={() => setWorkoutStarted(false)} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-heading font-semibold transition-all border-green-500/30 text-green-400 hover:bg-green-500/10">Complete Workout</button>
          ) : (
            <>
              <button onClick={() => setWorkoutStarted(true)} className="kairos-btn-gold px-6 py-2 rounded-kairos-sm font-heading font-semibold transition-all hover:shadow-lg hover:shadow-kairos-gold/50">Start Workout</button>
              <button onClick={() => setWorkoutDeferred(true)} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-heading font-semibold transition-all">Defer</button>
            </>
          )}
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
        <h2 className="font-heading text-xl font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-kairos-gold" /> Weekly Schedule</h2>
        <div className="grid grid-cols-7 gap-2">
          {weeklySchedule.map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-kairos-silver-dark text-xs font-heading font-bold mb-2">{day.day}</p>
              <div className={`${day.color} border border-kairos-border rounded-kairos-sm p-3 min-h-20 flex items-center justify-center`}>
                <p className="text-kairos-gold text-xs font-heading font-semibold text-center">{day.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workout Log */}
      <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2"><Activity className="w-5 h-5 text-kairos-gold" /> Workout Log — {formattedRange}</h2>
          <button
            onClick={() => setShowLogForm(true)}
            className="kairos-btn-gold px-4 py-2 rounded-kairos-sm font-heading font-semibold transition-all hover:shadow-lg hover:shadow-kairos-gold/50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Workout
          </button>
        </div>
        <div className="space-y-3">
          {workouts.length === 0 ? (
            <p className="text-kairos-silver-dark font-body text-sm text-center py-4">No workouts logged for this period.</p>
          ) : (
            workouts.map((workout, i) => (
              <div key={i} className="border border-kairos-border rounded-kairos-sm p-4 hover:border-kairos-gold/50 transition-colors flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-heading font-semibold text-white">{workout.type}</p>
                    <CheckCircle className="w-4 h-4 text-kairos-gold" />
                  </div>
                  <p className="text-kairos-silver-dark text-sm">{workout.dateLabel} — {workout.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-kairos-silver-dark text-xs">Duration</p>
                    <p className="text-white font-heading font-semibold">{workout.duration} min</p>
                  </div>
                  <div>
                    <p className="text-kairos-silver-dark text-xs">Avg HR</p>
                    <p className="text-white font-heading font-semibold flex items-center gap-1 justify-end"><Heart className="w-3 h-3 text-kairos-gold" />{workout.heartRateAvg}</p>
                  </div>
                  <div>
                    <p className="text-kairos-silver-dark text-xs">Calories</p>
                    <p className="text-white font-heading font-semibold flex items-center gap-1 justify-end"><Flame className="w-3 h-3 text-kairos-gold" />{workout.calories}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Heart Rate Zones */}
      <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
        <h2 className="font-heading text-xl font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-kairos-gold" /> Heart Rate Training Zones</h2>
        <p className="text-kairos-silver-dark text-sm mb-6 font-body">Longevity training emphasizes Zone 2 cardio and strength work for muscle preservation.</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {heartRateZones.map((zone, i) => (
            <button key={i} onClick={() => setSelectedZone(selectedZone === i ? null : i)}
              className={`border rounded-kairos-sm p-4 transition-all text-left ${selectedZone === i ? "border-kairos-gold bg-kairos-gold/10" : "border-kairos-border hover:border-kairos-gold/50"}`}>
              <p className="text-kairos-gold font-heading font-bold text-lg mb-1">{zone.zone}</p>
              <p className="text-white font-heading font-semibold text-sm mb-2">{zone.name}</p>
              <p className="text-kairos-silver-dark text-xs mb-2 font-body">{zone.hrRange}</p>
              {selectedZone === i && (
                <div className="mt-3 pt-3 border-t border-kairos-border space-y-2">
                  <p className="text-kairos-silver-dark text-xs font-body">{zone.description}</p>
                  <p className="text-kairos-gold text-xs font-heading">{zone.benefits}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Longevity Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Heart, title: "Zone 2 Cardio", desc: "Build aerobic base and mitochondrial density for sustained health." },
          { icon: Dumbbell, title: "Strength Training", desc: "Preserve muscle mass and bone density, essential for longevity." },
          { icon: Zap, title: "Yoga & Mobility", desc: "Maintain flexibility and recover, reducing injury risk with age." },
        ].map((item, i) => (
          <div key={i} className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4">
            <div className="flex items-start gap-3">
              <item.icon className="w-5 h-5 text-kairos-gold mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-heading font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-kairos-silver-dark text-sm font-body">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Log Workout Modal */}
      {showLogForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-8 max-w-lg w-full animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-2xl font-bold text-white">Log Workout</h3>
              <button
                onClick={handleCancelForm}
                className="text-kairos-silver-dark hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Workout Type */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Workout Type</label>
                <input
                  type="text"
                  placeholder="e.g. Zone 2 Run, Strength Training"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  placeholder="45"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>

              {/* Calories */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Calories Burned</label>
                <input
                  type="number"
                  placeholder="350"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>

              {/* Average Heart Rate */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Average Heart Rate (bpm)</label>
                <input
                  type="number"
                  placeholder="125"
                  value={formData.avgHeartRate}
                  onChange={(e) => setFormData({ ...formData, avgHeartRate: e.target.value })}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>

              {/* Max Heart Rate */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  placeholder="155"
                  value={formData.maxHeartRate}
                  onChange={(e) => setFormData({ ...formData, maxHeartRate: e.target.value })}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-heading text-kairos-silver-dark mb-2">Notes</label>
                <textarea
                  placeholder="How did you feel during this workout?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none w-full resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveWorkout}
                  disabled={saveWorkoutMutation.isPending}
                  className="kairos-btn-gold px-6 py-2 rounded-kairos-sm font-heading font-semibold transition-all hover:shadow-lg hover:shadow-kairos-gold/50 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveWorkoutMutation.isPending ? "Saving..." : "Save Workout"}
                </button>
                <button
                  onClick={handleCancelForm}
                  disabled={saveWorkoutMutation.isPending}
                  className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-heading font-semibold transition-all flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
