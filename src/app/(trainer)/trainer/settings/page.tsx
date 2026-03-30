"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Palette,
  Save,
  Check,
  Building2,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";
import { useCompanyBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

export default function TrainerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Fetch user data
  const { data: authUser } = trpc.auth.me.useQuery();

  // Fetch trainer profile
  const { data: profile } = trpc.coach.schedule.getProfile.useQuery();

  // Fetch notification preferences
  const { data: notificationPrefs } = trpc.coach.schedule.getNotificationPreferences.useQuery();

  // Mutations
  const updateProfileMutation = trpc.coach.schedule.updateProfile.useMutation();
  const updateNotificationsMutation = trpc.coach.schedule.updateNotificationPreferences.useMutation();

  const [formData, setFormData] = useState({
    displayName: authUser?.firstName || "",
    email: authUser?.email || "",
    specialization: "",
    timezone: "America/Los_Angeles",
  });

  const [notifications, setNotifications] = useState({
    clientAlerts: notificationPrefs?.categories?.clientAlerts?.email ?? true,
    labResults: notificationPrefs?.categories?.labResults?.email ?? true,
    appointmentReminders: notificationPrefs?.categories?.appointmentReminders?.email ?? true,
    weeklyReports: notificationPrefs?.categories?.weeklyReports?.email ?? true,
  });

  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Update profile
      if (formData.specialization) {
        await updateProfileMutation.mutateAsync({
          specialties: formData.specialization ? [formData.specialization] : [],
        });
      }

      // Update notifications
      await updateNotificationsMutation.mutateAsync({
        categories: {
          clientAlerts: {
            in_app: true,
            email: notifications.clientAlerts,
            push: true,
            sms: false,
          },
          labResults: {
            in_app: true,
            email: notifications.labResults,
            push: true,
            sms: false,
          },
          appointmentReminders: {
            in_app: true,
            email: notifications.appointmentReminders,
            push: true,
            sms: false,
          },
          weeklyReports: {
            in_app: false,
            email: notifications.weeklyReports,
            push: false,
            sms: false,
          },
        },
      });

      setSaveMessage("Changes saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save changes");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h1 className="font-heading text-3xl font-bold text-white">Trainer Settings</h1>
        </div>
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-kairos-sm font-heading font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: accentColor || "rgb(var(--k-accent))",
            color: accentColor ? "#fff" : "rgb(var(--k-bg))",
          }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/15 border border-green-500/30 rounded-kairos-sm text-green-400 text-sm">
          <Check size={16} />
          {saveMessage}
        </div>
      )}

      {/* Company Info (when white-labeled) */}
      {isWhiteLabel && (
        <div className="kairos-card" style={{ borderColor: accentColor + "30" }}>
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-5 h-5" style={{ color: accentColor }} />
            <h2 className="font-heading text-lg font-semibold text-white">Company</h2>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold"
              style={{ backgroundColor: accentColor }}
            >
              {brand.name.charAt(0)}
            </div>
            <div>
              <p className="font-heading font-semibold text-white">{brand.name}</p>
              <p className="text-xs font-body text-kairos-silver-dark">{brand.website || brand.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Display Name", name: "displayName", type: "text" },
            { label: "Email", name: "email", type: "email" },
            { label: "Specialization", name: "specialization", type: "text" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block font-body text-kairos-silver-dark text-sm mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleInputChange}
                className="w-full kairos-input"
              />
            </div>
          ))}
          <div>
            <label className="block font-body text-kairos-silver-dark text-sm mb-2">Timezone</label>
            <select name="timezone" value={formData.timezone} onChange={handleInputChange} className="w-full kairos-input">
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {([
            { key: "clientAlerts" as const, label: "Client Health Alerts" },
            { key: "labResults" as const, label: "New Lab Results" },
            { key: "appointmentReminders" as const, label: "Appointment Reminders" },
            { key: "weeklyReports" as const, label: "Weekly Client Reports" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleNotificationChange(key)}
              className="w-full flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors"
            >
              <span className="font-body text-kairos-silver-dark">{label}</span>
              <div className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications[key] ? "" : "bg-gray-600 border border-kairos-border"
              }`} style={notifications[key] ? { backgroundColor: (accentColor || "rgb(var(--k-accent))") } : undefined}>
                <div className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                  notifications[key] ? "translate-x-6" : "translate-x-1"
                }`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Appearance</h2>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark mb-4">
          Choose your preferred visual theme for the {isWhiteLabel ? brand.name : "KAIROS"} dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            const isActive = theme === id;
            const swatches = id === "warm-slate"
              ? ["#3A3A3C", "#C9A89A", "#FAF5F0", "#8B6F65"]
              : ["#122055", "#D4AF37", "#E0E0E0", "#9E9E9E"];
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`text-left p-5 rounded-kairos-sm border-2 transition-all ${
                  isActive ? "border-kairos-gold bg-kairos-gold/10" : "border-kairos-border hover:border-kairos-gold/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isActive ? "border-kairos-gold" : "border-kairos-border"
                  }`}>
                    {isActive && <div className="w-2 h-2 rounded-full bg-kairos-gold" />}
                  </div>
                  <span className="font-heading font-semibold text-kairos-silver">{t.name}</span>
                </div>
                <p className="text-xs font-body text-kairos-silver-dark mb-3">{t.description}</p>
                <div className="flex gap-2">
                  {swatches.map((color, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border border-kairos-border" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
