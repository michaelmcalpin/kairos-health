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
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useWorkouts } from "@/hooks/client/useWorkouts";
import { getTodaysWorkout, getWeeklySchedule, getHeartRateZones } from "@/lib/client-ops";

export default function WorkoutsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutDeferred, setWorkoutDeferred] = useState(false);

  const { records: workouts, stats: workoutStats } = useWorkouts(dateRange);
  const stats = workoutStats;

  const todaysWorkout = getTodaysWorkout(new Date());
  const weeklySchedule = getWeeklySchedule();
  const heartRateZones = getHeartRateZones();

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
        <h2 className="font-heading text-xl font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-kairos-gold" /> Workout Log — {formattedRange}</h2>
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
    </div>
  );
}
