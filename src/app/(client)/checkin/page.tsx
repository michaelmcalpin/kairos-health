"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Activity, Apple, Dumbbell, Smile, Pill, Droplet, Ruler, Save, Loader2 } from "lucide-react";
import { VitalsTab } from "@/components/checkin/VitalsTab";
import { NutritionTab } from "@/components/checkin/NutritionTab";
import { ActivityTab } from "@/components/checkin/ActivityTab";
import { WellnessTab } from "@/components/checkin/WellnessTab";
import { SupplementsTab } from "@/components/checkin/SupplementsTab";
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
  { id: "nutrition", label: "Nutrition", icon: <Apple size={16} /> },
  { id: "activity", label: "Activity", icon: <Dumbbell size={16} /> },
  { id: "wellness", label: "Wellness", icon: <Smile size={16} /> },
  { id: "supplements", label: "Supplements", icon: <Pill size={16} /> },
  { id: "bloodsugar", label: "Blood Sugar", icon: <Droplet size={16} /> },
  { id: "measurements", label: "Measurements", icon: <Ruler size={16} /> },
];

export default function CheckinPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("vitals");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dateStr = selectedDate.toISOString().split("T")[0];

  // tRPC queries — use getByDate which works for any date
  const { data: checkinData, isLoading: isLoadingCheckin } = trpc.clientPortal.checkin.getByDate.useQuery(
    { date: dateStr },
    { enabled: !!dateStr }
  );
  const submitMutation = trpc.clientPortal.checkin.submit.useMutation();

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
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  }, []);

  // Handle save — spread formData fields directly (router expects flat fields, not nested)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { id, clientId, submittedAt, ...rest } = formData;
      await submitMutation.mutateAsync({
        date: selectedDate.toISOString().split("T")[0],
        ...rest,
      });
      setIsDirty(false);
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
        {activeTab === "nutrition" && (
          <NutritionTab
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
        {activeTab === "supplements" && (
          <SupplementsTab
            items={formData.supplements || []}
            onToggle={(id: string) =>
              handleFieldChange("supplements", {
                ...formData.supplements,
                [id]: !formData.supplements?.[id],
              })
            }
          />
        )}
        {activeTab === "bloodsugar" && (
          <BloodSugarTab
            readings={formData.bloodSugarReadings || []}
            onAdd={(reading: any) =>
              handleFieldChange("bloodSugarReadings", [
                ...(formData.bloodSugarReadings || []),
                reading,
              ])
            }
          />
        )}
        {activeTab === "measurements" && (
          <MeasurementsTab
            data={formData}
            onChange={handleFieldChange}
          />
        )}
      </div>

      {/* Save Button */}
      {isDirty && (
        <div className="flex gap-3 sticky bottom-6 justify-end">
          <button
            onClick={() => { setFormData(checkinData || {}); setIsDirty(false); }}
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
