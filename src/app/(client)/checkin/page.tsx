"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Activity, UtensilsCrossed, Dumbbell, Smile, Droplet, Ruler, Save, Loader2, AlertTriangle } from "lucide-react";
import { VitalsTab } from "@/components/checkin/VitalsTab";
import { MealsTab } from "@/components/checkin/MealsTab";
import { ActivityTab } from "@/components/checkin/ActivityTab";
import { WellnessTab } from "@/components/checkin/WellnessTab";
import { BloodSugarTab } from "@/components/checkin/BloodSugarTab";
import { MeasurementsTab } from "@/components/checkin/MeasurementsTab";
import { trpc } from "@/lib/trpc";

function isToday(date: Date): boolean {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: "vitals", label: "Vitals", icon: <Activity size={16} /> },
  { id: "meals", label: "Meals", icon: <UtensilsCrossed size={16} /> },
  { id: "activity", label: "Activity", icon: <Dumbbell size={16} /> },
  { id: "wellness", label: "Wellness", icon: <Smile size={16} /> },
  { id: "bloodsugar", label: "Blood Sugar", icon: <Droplet size={16} /> },
  { id: "measurements", label: "Measurements", icon: <Ruler size={16} /> },
];

export default function CheckinPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("vitals");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dateStr = selectedDate.toISOString().split("T")[0];

  // tRPC queries — use getByDate which works for any date
  const checkinQuery = trpc.clientPortal.checkin.getByDate.useQuery(
    { date: dateStr },
    { enabled: !!dateStr }
  );
  const { data: checkinData, isLoading: isLoadingCheckin } = checkinQuery;
  const utils = trpc.useUtils();
  const submitMutation = trpc.clientPortal.checkin.submit.useMutation({
    onSuccess: () => {
      void utils.clientPortal.checkin.getByDate.invalidate();
    },
  });
  const bloodSugarAddMutation = trpc.clientPortal.bloodSugar.add.useMutation({
    onSuccess: () => {
      void utils.clientPortal.bloodSugar.getByDate.invalidate();
      void utils.clientPortal.bloodSugar.getLatest.invalidate();
    },
  });
  const measurementsCreateMutation = trpc.clientPortal.measurements.create.useMutation({
    onSuccess: () => {
      void utils.clientPortal.measurements.list.invalidate();
      void utils.clientPortal.measurements.latest.invalidate();
    },
  });
  const mealsAddMutation = trpc.clientPortal.meals.add.useMutation({
    onSuccess: () => {
      void utils.clientPortal.meals.getByDate.invalidate();
    },
  });

  // Load check-in data when query returns or date changes
  useEffect(() => {
    if (checkinData) {
      setFormData(checkinData);
    } else {
      setFormData({});
    }
    setIsDirty(false);
  }, [checkinData]);

  // Handle field changes
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  // Handle save — each tab's data goes to the router that actually stores it:
  // vitals/activity/wellness → checkin.submit; blood sugar → bloodSugar.add;
  // measurements → measurements.create; meals → meals.add.
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const date = selectedDate.toISOString().split("T")[0];
      const num = (v: unknown): number | undefined =>
        typeof v === "number" && Number.isFinite(v) ? v : undefined;
      const pos = (v: unknown): number | undefined => {
        const n = num(v);
        return n !== undefined && n > 0 ? n : undefined;
      };
      const str = (v: unknown): string | undefined =>
        typeof v === "string" && v.trim().length > 0 ? v : undefined;

      // Meals entered on the Meals tab (per-meal notes have no home in the
      // meals router schema, so they're appended to the check-in notes below)
      const meals = (Array.isArray(formData.meals) ? formData.meals : []) as {
        mealType: "breakfast" | "lunch" | "dinner" | "snack";
        items?: { name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[];
        photoUrl?: string;
        notes?: string;
        totalCalories: number;
        totalProtein: number;
        totalCarbs: number;
        totalFat: number;
      }[];
      const mealNotes = meals
        .filter((m) => m.notes && m.notes.trim().length > 0)
        .map((m) => `${m.mealType}: ${m.notes!.trim()}`)
        .join("; ");
      const combinedNotes = [str(formData.notes), mealNotes ? `Meals: ${mealNotes}` : undefined]
        .filter(Boolean)
        .join("\n");

      // 1) Core daily check-in fields (keys match the checkin router schema)
      await submitMutation.mutateAsync({
        date,
        weight: num(formData.weight),
        sleepHours: num(formData.sleepHours),
        sleepQuality: num(formData.sleepQuality),
        hrvScore: num(formData.hrvScore),
        readinessScore: num(formData.readinessScore),
        steps: num(formData.steps),
        cardioMinutes: num(formData.cardioMinutes),
        trainingType: str(formData.trainingType),
        trainingDescription: str(formData.trainingDescription),
        stress: num(formData.stress),
        hunger: num(formData.hunger),
        energy: num(formData.energy),
        mood: num(formData.mood),
        bmCount: num(formData.bmCount),
        deviations: str(formData.deviations),
        notes: combinedNotes.length > 0 ? combinedNotes : undefined,
      });

      // 2) Blood sugar readings → bloodSugar router (new entries have no id yet)
      const TIMINGS = ["fasted", "1hr", "2hr", "3hr", "4hr"] as const;
      const readings = (Array.isArray(formData.bloodSugarReadings) ? formData.bloodSugarReadings : []) as {
        id?: string;
        timing: string;
        valueMgdl: number;
        mealDescription?: string;
        notes?: string;
      }[];
      for (const reading of readings) {
        if (reading.id) continue; // already persisted server-side
        const timing = reading.timing?.toLowerCase() as (typeof TIMINGS)[number];
        if (!TIMINGS.includes(timing)) continue;
        await bloodSugarAddMutation.mutateAsync({
          date,
          timing,
          valueMgdl: reading.valueMgdl,
          mealDescription: str(reading.mealDescription),
          notes: str(reading.notes),
        });
      }

      // 3) Body measurements → measurements router
      const circumferences = {
        chestInches: pos(formData.chest),
        waistInches: pos(formData.waist),
        hipsInches: pos(formData.hips),
        rightThighInches: pos(formData.rightThigh),
        rightBicepInches: pos(formData.rightBicep),
      };
      if (Object.values(circumferences).some((v) => v !== undefined)) {
        await measurementsCreateMutation.mutateAsync({
          date,
          weightLbs: pos(formData.weight),
          ...circumferences,
        });
      }

      // 4) Meals → meals router
      for (const meal of meals) {
        await mealsAddMutation.mutateAsync({
          date,
          mealType: meal.mealType,
          items: (meal.items ?? []).map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            calories: i.calories,
            protein: i.protein,
            carbs: i.carbs,
            fat: i.fat,
          })),
          photoUrl: meal.photoUrl && meal.photoUrl !== "pending-upload" ? meal.photoUrl : undefined,
          totalCalories: meal.totalCalories,
          totalProtein: meal.totalProtein,
          totalCarbs: meal.totalCarbs,
          totalFat: meal.totalFat,
        });
      }

      setIsDirty(false);
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to save your check-in. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Date navigation
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't go to future dates beyond today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate > today) {
      setSelectedDate(today);
    } else {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const dateString = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  if (isLoadingCheckin) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8">
        <div className="text-center">
          <Loader2 className="inline animate-spin text-kairos-gold" size={32} />
          <p className="text-kairos-silver mt-4">Loading check-in data...</p>
        </div>
      </div>
    );
  }

  if (checkinQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load check-in</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your check-in data. Please try again.
          </p>
          <button onClick={() => checkinQuery.refetch()} className="kairos-btn-gold text-sm px-6 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-xl text-white">Daily Check-in</h2>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/50 hover:bg-kairos-card-hover transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} className="text-kairos-silver" />
          </button>

          <div className="text-center min-w-48">
            <div className="text-kairos-silver-dark text-xs font-body mb-1">
              {isToday(selectedDate) ? "Today" : ""}
            </div>
            <div className="text-white font-heading font-semibold">{dateString}</div>
          </div>

          <button
            onClick={goToNextDay}
            disabled={selectedDate >= new Date()}
            className="p-2 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/50 hover:bg-kairos-card-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <ChevronRight size={18} className="text-kairos-silver" />
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1 text-xs rounded-kairos-sm border border-kairos-gold/30 text-kairos-gold hover:border-kairos-gold hover:bg-kairos-gold/10 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-min">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors whitespace-nowrap text-sm font-body ${
                activeTab === tab.id
                  ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold"
                  : "text-kairos-silver border-transparent hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "vitals" && (
          <VitalsTab
            data={formData}
            onChange={handleFieldChange}
            dataSources={{}}
          />
        )}
        {activeTab === "meals" && (
          <MealsTab
            data={formData}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === "activity" && (
          <ActivityTab
            data={formData}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === "wellness" && (
          <WellnessTab
            data={formData}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === "bloodsugar" && (
          <BloodSugarTab
            readings={(Array.isArray(formData.bloodSugarReadings) ? formData.bloodSugarReadings : []) as { id: string; timing: string; valueMgdl: number; mealDescription?: string; createdAt: string }[]}
            onAdd={(reading: { timing: string; valueMgdl: number; mealDescription?: string; notes?: string }) => {
              const current = (Array.isArray(formData.bloodSugarReadings) ? formData.bloodSugarReadings : []) as unknown[];
              handleFieldChange("bloodSugarReadings", [...current, reading]);
            }}
          />
        )}
        {activeTab === "measurements" && (
          <MeasurementsTab
            data={formData}
            onChange={handleFieldChange}
          />
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <div className="flex items-start gap-2 p-3 rounded-kairos-sm border border-red-500/30 bg-red-500/10">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-body text-red-400">{saveError}</p>
        </div>
      )}

      {/* Save Button */}
      {isDirty && (
        <div className="flex gap-3 sticky bottom-6 justify-end">
          <button
            onClick={() => { setFormData(checkinData || {}); setIsDirty(false); setSaveError(null); }}
            className="px-4 py-2 rounded-kairos-sm border border-kairos-border text-kairos-silver hover:border-kairos-gold/50 hover:text-white transition-colors font-body text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="kairos-btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
